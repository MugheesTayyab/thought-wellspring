-- ==============================================================================
-- BajiHears — Phase 6: Automated 12-Hour Winner Pipeline & Scheduled Scoring
-- Migration: 20260926000000_phase6_winner_pipeline.sql
-- ==============================================================================

-- 1. Schema Extensions on 'unsaids'
ALTER TABLE public.unsaids 
  ADD COLUMN IF NOT EXISTS winner_hook TEXT,
  ADD COLUMN IF NOT EXISTS winner_score NUMERIC(10, 2);

-- 2. Partial Unique Index: Strictly ONE winner per cycle window
CREATE UNIQUE INDEX IF NOT EXISTS idx_unsaids_single_winner_per_cycle 
  ON public.unsaids (winner_cycle) 
  WHERE is_winner = true;

-- 3. Performance Indexes for Rapid Cycle Scoring & Winner Retrieval
CREATE INDEX IF NOT EXISTS idx_unsaids_cycle_scoring 
  ON public.unsaids (status, created_at, is_winner)
  INCLUDE (id, reactions, veto_count, category);

CREATE INDEX IF NOT EXISTS idx_unsaids_latest_winner 
  ON public.unsaids (is_winner, winner_cycle DESC) 
  WHERE is_winner = true;

-- 4. Winner Cycles Audit Ledger
CREATE TABLE IF NOT EXISTS public.winner_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_start TIMESTAMPTZ NOT NULL,
  cycle_end TIMESTAMPTZ NOT NULL,
  crowned_post_id UUID REFERENCES public.unsaids(id) ON DELETE SET NULL,
  winning_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_eligible_posts INTEGER NOT NULL DEFAULT 0,
  total_reactions_evaluated INTEGER NOT NULL DEFAULT 0,
  execution_duration_ms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('crowned', 'skipped_empty', 'manual_override', 'already_crowned')),
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('cron', 'admin_manual', 'recovery_job', 'api')),
  hook_applied TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_winner_cycles_range 
  ON public.winner_cycles (cycle_start, cycle_end);

CREATE INDEX IF NOT EXISTS idx_winner_cycles_crowned_post 
  ON public.winner_cycles (crowned_post_id);

-- Enable RLS on audit ledger (Public read of cycle history, Admin write)
ALTER TABLE public.winner_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read of winner_cycles"
  ON public.winner_cycles
  FOR SELECT
  TO public
  USING (true);

-- 5. Atomic PostgreSQL Stored Procedure: crown_cycle_winner
CREATE OR REPLACE FUNCTION public.crown_cycle_winner(
  p_cycle_start TIMESTAMPTZ,
  p_cycle_end TIMESTAMPTZ,
  p_triggered_by TEXT DEFAULT 'cron'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_start_time TIMESTAMPTZ := clock_timestamp();
  v_duration_ms INTEGER;
  v_existing_winner_id UUID;
  v_existing_hook TEXT;
  v_existing_score NUMERIC(10, 2);
  v_top_post_id UUID;
  v_top_score NUMERIC(10, 2);
  v_top_category TEXT;
  v_selected_hook TEXT;
  v_eligible_count INTEGER := 0;
  v_reactions_sum INTEGER := 0;
  v_lock_acquired BOOLEAN;
BEGIN
  -- A. Advisory Lock to prevent parallel execution of the same cycle
  v_lock_acquired := pg_try_advisory_xact_lock(hashtext('bajihears_winner_cycle'));
  IF NOT v_lock_acquired THEN
    RETURN jsonb_build_object(
      'status', 'locked',
      'message', 'Winner calculation already in progress by another worker'
    );
  END IF;

  -- B. Idempotency Check: Was this cycle already recorded in audit ledger?
  IF EXISTS (SELECT 1 FROM public.winner_cycles WHERE cycle_start = p_cycle_start AND status IN ('crowned', 'manual_override')) THEN
    SELECT crowned_post_id, winning_score, hook_applied 
      INTO v_existing_winner_id, v_existing_score, v_existing_hook
      FROM public.winner_cycles 
     WHERE cycle_start = p_cycle_start
     LIMIT 1;

    RETURN jsonb_build_object(
      'status', 'already_crowned',
      'post_id', v_existing_winner_id,
      'score', v_existing_score,
      'hook', v_existing_hook,
      'message', 'Cycle already has an authoritative winner'
    );
  END IF;

  -- C. Manual Override Check: Did an admin manually set a winner in Supabase?
  SELECT id, winner_hook, winner_score
    INTO v_existing_winner_id, v_existing_hook, v_existing_score
    FROM public.unsaids
   WHERE is_winner = true 
     AND winner_cycle = p_cycle_start
   LIMIT 1;

  IF v_existing_winner_id IS NOT NULL THEN
    v_duration_ms := (extract(epoch from (clock_timestamp() - v_start_time)) * 1000)::INTEGER;
    
    INSERT INTO public.winner_cycles (
      cycle_start, cycle_end, crowned_post_id, winning_score,
      total_eligible_posts, total_reactions_evaluated, execution_duration_ms,
      status, triggered_by, hook_applied
    ) VALUES (
      p_cycle_start, p_cycle_end, v_existing_winner_id, COALESCE(v_existing_score, 0),
      1, 0, v_duration_ms,
      'manual_override', p_triggered_by, COALESCE(v_existing_hook, 'Curator Selection')
    )
    ON CONFLICT (cycle_start, cycle_end) DO NOTHING;

    RETURN jsonb_build_object(
      'status', 'manual_override',
      'post_id', v_existing_winner_id,
      'hook', COALESCE(v_existing_hook, 'Curator Selection'),
      'message', 'Admin manual override preserved intact'
    );
  END IF;

  -- D. Count total eligible candidates in the 12-hour window
  SELECT COUNT(*),
         COALESCE(SUM(
           COALESCE((reactions->>'heart')::int, 0) +
           COALESCE((reactions->>'fire')::int, 0) +
           COALESCE((reactions->>'hug')::int, 0) +
           COALESCE((reactions->>'sad')::int, 0)
         ), 0)
    INTO v_eligible_count, v_reactions_sum
    FROM public.unsaids
   WHERE status = 'published'
     AND created_at >= p_cycle_start
     AND created_at < p_cycle_end
     AND (is_winner IS NULL OR is_winner = false)
     AND veto_count < 3;

  -- E. Handle Empty Cycle Fallback
  IF v_eligible_count = 0 THEN
    v_duration_ms := (extract(epoch from (clock_timestamp() - v_start_time)) * 1000)::INTEGER;

    INSERT INTO public.winner_cycles (
      cycle_start, cycle_end, crowned_post_id, winning_score,
      total_eligible_posts, total_reactions_evaluated, execution_duration_ms,
      status, triggered_by, hook_applied
    ) VALUES (
      p_cycle_start, p_cycle_end, NULL, 0,
      0, 0, v_duration_ms,
      'skipped_empty', p_triggered_by, 'No eligible posts in cycle'
    )
    ON CONFLICT (cycle_start, cycle_end) DO NOTHING;

    RETURN jsonb_build_object(
      'status', 'skipped_empty',
      'message', 'No eligible published posts found in cycle window; prior winner retained'
    );
  END IF;

  -- F. Algorithmic Scoring with Continuous 8-Hour Exponential Half-Life Decay
  WITH candidate_scores AS (
    SELECT 
      u.id,
      u.category,
      u.created_at,
      COALESCE((u.reactions->>'heart')::numeric, 0) AS hearts,
      COALESCE((u.reactions->>'fire')::numeric, 0) AS fires,
      COALESCE((u.reactions->>'hug')::numeric, 0) AS hugs,
      COALESCE((u.reactions->>'sad')::numeric, 0) AS sads,
      COUNT(e.id) AS echo_count,
      -- Raw Resonance Formula:
      -- Heart (2.5) + Fire (2.0) + Hug (2.0) + Sad (1.5) + Echo (4.0)
      (
        (COALESCE((u.reactions->>'heart')::numeric, 0) * 2.5) +
        (COALESCE((u.reactions->>'fire')::numeric, 0) * 2.0) +
        (COALESCE((u.reactions->>'hug')::numeric, 0) * 2.0) +
        (COALESCE((u.reactions->>'sad')::numeric, 0) * 1.5) +
        (COUNT(e.id)::numeric * 4.0)
      ) AS raw_score,
      -- Continuous 8-Hour Half-Life Exponential Decay:
      -- decay = 0.5 ^ (age_in_hours / 8.0)
      power(0.5, (extract(epoch from (p_cycle_end - u.created_at)) / 3600.0) / 8.0) AS decay_factor,
      -- Safety Veto Penalty:
      CASE 
        WHEN u.veto_count = 1 THEN 0.85
        WHEN u.veto_count = 2 THEN 0.60
        ELSE 1.00
      END AS veto_penalty
    FROM public.unsaids u
    LEFT JOIN public.echoes e ON e.unsaid_id = u.id
    WHERE u.status = 'published'
      AND u.created_at >= p_cycle_start
      AND u.created_at < p_cycle_end
      AND (u.is_winner IS NULL OR u.is_winner = false)
      AND u.veto_count < 3
    GROUP BY u.id, u.category, u.created_at, u.reactions, u.veto_count
  ),
  ranked_posts AS (
    SELECT 
      id,
      category,
      ROUND((raw_score * decay_factor * veto_penalty)::numeric, 2) AS final_score,
      echo_count,
      hearts,
      created_at
    FROM candidate_scores
    ORDER BY 
      (raw_score * decay_factor * veto_penalty) DESC,
      echo_count DESC,
      hearts DESC,
      created_at ASC
    LIMIT 1
  )
  SELECT id, final_score, category 
    INTO v_top_post_id, v_top_score, v_top_category
    FROM ranked_posts;

  -- G. Contextual Hook Assignment
  v_selected_hook := CASE v_top_category
    WHEN 'Spill The Tea' THEN 'The confession the whole wall was waiting to hear.'
    WHEN 'Silent Thoughts' THEN 'Said in secret, felt by everyone.'
    WHEN 'Plot Twist' THEN 'The plot twist nobody saw coming.'
    WHEN 'Hard Truth' THEN 'Some unsaids leave a silence that never ends.'
    WHEN 'Vibe Check' THEN 'Pure warmth and truth on the wall today.'
    ELSE 'The whole wall felt this confession.'
  END;

  -- H. Crown the Winner Atomically in 'unsaids'
  UPDATE public.unsaids
     SET is_winner = true,
         winner_cycle = p_cycle_start,
         winner_score = v_top_score,
         winner_hook = v_selected_hook
   WHERE id = v_top_post_id;

  v_duration_ms := (extract(epoch from (clock_timestamp() - v_start_time)) * 1000)::INTEGER;

  -- I. Record Telemetry to 'winner_cycles'
  INSERT INTO public.winner_cycles (
    cycle_start, cycle_end, crowned_post_id, winning_score,
    total_eligible_posts, total_reactions_evaluated, execution_duration_ms,
    status, triggered_by, hook_applied
  ) VALUES (
    p_cycle_start, p_cycle_end, v_top_post_id, v_top_score,
    v_eligible_count, v_reactions_sum, v_duration_ms,
    'crowned', p_triggered_by, v_selected_hook
  )
  ON CONFLICT (cycle_start, cycle_end) DO UPDATE
    SET crowned_post_id = EXCLUDED.crowned_post_id,
        winning_score = EXCLUDED.winning_score,
        hook_applied = EXCLUDED.hook_applied,
        status = 'crowned';

  -- J. Return Result Payload
  RETURN jsonb_build_object(
    'status', 'crowned',
    'post_id', v_top_post_id,
    'score', v_top_score,
    'hook', v_selected_hook,
    'category', v_top_category,
    'total_eligible_posts', v_eligible_count,
    'duration_ms', v_duration_ms
  );
END;
$$;
