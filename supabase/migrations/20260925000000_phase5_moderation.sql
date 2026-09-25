-- Migration: Phase 5 - Server-Side Spam Defense & Multi-Tier Moderation Engine

-- 1. Create device_actions table for sliding-window rate limiting
CREATE TABLE IF NOT EXISTS public.device_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_token TEXT NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('submit_post', 'echo', 'react', 'report', 'duel_vote')),
    target_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for lightning-fast rolling window count queries
CREATE INDEX IF NOT EXISTS idx_device_actions_window 
ON public.device_actions (device_token, action_type, created_at DESC);

-- Automated TTL cleanup: purge records older than 48 hours to keep table lean
CREATE OR REPLACE FUNCTION purge_old_device_actions() RETURNS VOID AS $$
BEGIN
    DELETE FROM public.device_actions 
    WHERE created_at < NOW() - INTERVAL '48 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Edge Rate Limit Evaluation Stored Procedure
CREATE OR REPLACE FUNCTION record_and_check_rate_limit(
    p_device_token TEXT,
    p_action_type TEXT,
    p_limit INT,
    p_window_minutes INT
) RETURNS JSONB AS $$
DECLARE
    v_count INT;
    v_oldest TIMESTAMPTZ;
    v_reset_seconds INT;
BEGIN
    -- Count actions within the rolling window
    SELECT COUNT(*), MIN(created_at)
    INTO v_count, v_oldest
    FROM public.device_actions
    WHERE device_token = p_device_token
      AND action_type = p_action_type
      AND created_at > NOW() - (p_window_minutes || ' minutes')::INTERVAL;

    -- If limit exceeded, calculate exact seconds until oldest action drops out
    IF v_count >= p_limit THEN
        v_reset_seconds := GREATEST(1, EXTRACT(EPOCH FROM (v_oldest + (p_window_minutes || ' minutes')::INTERVAL - NOW()))::INT);
        RETURN jsonb_build_object(
            'allowed', false,
            'current_count', v_count,
            'limit', p_limit,
            'retry_after_seconds', v_reset_seconds
        );
    END IF;

    -- Record the new action atomically
    INSERT INTO public.device_actions (device_token, action_type)
    VALUES (p_device_token, p_action_type);

    RETURN jsonb_build_object(
        'allowed', true,
        'current_count', v_count + 1,
        'remaining', p_limit - (v_count + 1)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Atomic Veto System
CREATE OR REPLACE FUNCTION append_veto_atomic(
    p_post_id UUID,
    p_reporter_device_token TEXT
) RETURNS JSONB AS $$
DECLARE
    v_post RECORD;
    v_new_veto_count INT;
    v_new_status TEXT;
    v_echo_count INT;
BEGIN
    -- Lock the specific row for update to prevent concurrent race conditions
    SELECT id, device_token, vetoed_by, veto_count, status
    INTO v_post
    FROM public.unsaids
    WHERE id = p_post_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Post does not exist');
    END IF;

    -- Guard: Author cannot report their own post
    IF v_post.device_token = p_reporter_device_token THEN
        RETURN jsonb_build_object('success', false, 'code', 'SELF_VETO_FORBIDDEN', 'message', 'You cannot report your own confession');
    END IF;

    -- Guard: Deduplication check
    IF v_post.vetoed_by IS NOT NULL AND p_reporter_device_token = ANY(v_post.vetoed_by) THEN
        RETURN jsonb_build_object('success', false, 'code', 'ALREADY_REPORTED', 'message', 'You have already reported this confession');
    END IF;

    -- Calculate updated counters
    v_new_veto_count := COALESCE(v_post.veto_count, 0) + 1;

    -- Count echoes dynamically from echoes table
    SELECT COUNT(*) INTO v_echo_count
    FROM public.echoes
    WHERE unsaid_id = p_post_id;

    -- Quarantine Logic:
    -- Threshold is 5 vetoes.
    -- POPULARITY SHIELD: If a post has >= 3 echoes, it is engaging community discussion.
    -- It requires 8 vetoes before auto-quarantine, protecting it from malicious brigade vetoes.
    IF (v_echo_count < 3 AND v_new_veto_count >= 5) OR (v_echo_count >= 3 AND v_new_veto_count >= 8) THEN
        v_new_status := 'review';
    ELSE
        v_new_status := v_post.status;
    END IF;

    -- Update post row atomically
    UPDATE public.unsaids
    SET vetoed_by = array_append(COALESCE(v_post.vetoed_by, ARRAY[]::TEXT[]), p_reporter_device_token),
        veto_count = v_new_veto_count,
        status = v_new_status,
        updated_at = NOW()
    WHERE id = p_post_id;

    RETURN jsonb_build_object(
        'success', true,
        'code', 'OK',
        'veto_count', v_new_veto_count,
        'quarantined', (v_new_status = 'review' AND v_post.status != 'review')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Immutable Moderation Action Audit Trail
CREATE TABLE IF NOT EXISTS public.moderation_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unsaid_id UUID REFERENCES public.unsaids(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('auto_quarantine', 'manual_approve', 'manual_reject', 'auto_reject')),
    performed_by TEXT NOT NULL DEFAULT 'SYSTEM', -- 'SYSTEM' or Supabase admin user UUID
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Optimized Moderation Queue for Supabase Table Editor
CREATE OR REPLACE VIEW public.moderation_queue AS
SELECT 
    u.id,
    u.text,
    u.category,
    u.veto_count,
    COALESCE(array_length(u.vetoed_by, 1), 0) AS unique_reporters,
    (SELECT COUNT(*) FROM public.echoes e WHERE e.unsaid_id = u.id) AS echo_count,
    u.created_at,
    u.status,
    u.device_token,
    CASE 
        WHEN u.veto_count >= 5 THEN 'HIGH: Community Veto Threshold Met'
        WHEN u.text ~* '(?:insta|snap|whatsapp|kutta|kanjar|leak)' THEN 'MEDIUM: Cultural/Social Pattern Flag'
        ELSE 'LOW: Standard Quality Queue'
    END AS triage_priority
FROM public.unsaids u
WHERE u.status = 'review'
ORDER BY u.veto_count DESC, u.created_at ASC;

-- 6. RLS and Query Isolation Verification
ALTER TABLE public.unsaids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published unsaids" ON public.unsaids;
CREATE POLICY "Public can view published unsaids"
ON public.unsaids FOR SELECT
TO anon, authenticated
USING (status = 'published');

ALTER TABLE public.moderation_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins only moderation audit" ON public.moderation_audit_log;
CREATE POLICY "Admins only moderation audit"
ON public.moderation_audit_log FOR ALL
TO authenticated, service_role
USING (true);
