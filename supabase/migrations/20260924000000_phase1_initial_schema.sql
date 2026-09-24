-- ==============================================================================
-- BajiHears — Phase 1 Supabase Schema Migration
-- Standard: Bulk Client-Facing Production
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. EXTENSIONS & TRIGGER FUNCTIONS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 1. TABLE: profiles
-- References auth.users(id). Stores registered user profiles and soft identities.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL UNIQUE CHECK (char_length(handle) >= 3 AND char_length(handle) <= 40),
  avatar_seed INTEGER NOT NULL DEFAULT 1 CHECK (avatar_seed >= 1 AND avatar_seed <= 500),
  member_since DATE NOT NULL DEFAULT CURRENT_DATE,
  device_token TEXT UNIQUE,
  visit_streak INTEGER NOT NULL DEFAULT 0 CHECK (visit_streak >= 0),
  last_visit DATE,
  streak_freeze_used BOOLEAN NOT NULL DEFAULT FALSE,
  total_actions INTEGER NOT NULL DEFAULT 0 CHECK (total_actions >= 0),
  warmth_total INTEGER NOT NULL DEFAULT 0 CHECK (warmth_total >= 0),
  warmth_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  purchased_items TEXT[] NOT NULL DEFAULT '{}'::text[],
  tabs_unlocked JSONB NOT NULL DEFAULT '{"duel": false, "read": false}'::jsonb,
  push_subscription JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_profiles_handle ON public.profiles (handle);
CREATE INDEX IF NOT EXISTS idx_profiles_device_token ON public.profiles (device_token);
CREATE INDEX IF NOT EXISTS idx_profiles_warmth_total ON public.profiles (warmth_total DESC);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_all ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 2. TABLE: unsaids
-- Hot read path: confessions on The Wall.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.unsaids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL CHECK (char_length(text) >= 3 AND char_length(text) <= 280),
  handle TEXT,
  device_token TEXT NOT NULL CHECK (char_length(device_token) = 16),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('Spill The Tea', 'Silent Thoughts', 'Plot Twist', 'Hard Truth', 'Vibe Check')),
  preset TEXT NOT NULL DEFAULT 'midnight-static' CHECK (preset IN ('midnight-static', '3am', 'golden-hour', 'quiet-storm', 'neon-ache', 'aurora-borealis', 'rose-dust', 'night-owl')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'review', 'rejected')),
  pending_until TIMESTAMPTZ,
  veto_count INTEGER NOT NULL DEFAULT 0 CHECK (veto_count >= 0),
  vetoed_by TEXT[] NOT NULL DEFAULT '{}'::text[],
  is_winner BOOLEAN NOT NULL DEFAULT FALSE,
  winner_cycle TIMESTAMPTZ,
  winner_hook TEXT,
  pinned_until TIMESTAMPTZ,
  reactions JSONB NOT NULL DEFAULT '{"heart": 0, "sad": 0, "fire": 0, "hug": 0}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS tr_unsaids_updated_at ON public.unsaids;
CREATE TRIGGER tr_unsaids_updated_at
  BEFORE UPDATE ON public.unsaids
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Critical query indexes
CREATE INDEX IF NOT EXISTS idx_unsaids_feed ON public.unsaids (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unsaids_category_feed ON public.unsaids (category, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unsaids_winner ON public.unsaids (is_winner DESC, winner_cycle DESC);
CREATE INDEX IF NOT EXISTS idx_unsaids_device_rate_limit ON public.unsaids (device_token, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unsaids_pinned ON public.unsaids (pinned_until) WHERE pinned_until IS NOT NULL;

ALTER TABLE public.unsaids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS unsaids_select_published ON public.unsaids;
CREATE POLICY unsaids_select_published ON public.unsaids FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS unsaids_insert_any ON public.unsaids;
CREATE POLICY unsaids_insert_any ON public.unsaids FOR INSERT WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3. TABLE: echoes
-- Comments on confessions.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.echoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unsaid_id UUID NOT NULL REFERENCES public.unsaids(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) >= 1 AND char_length(text) <= 200),
  handle TEXT,
  device_token TEXT NOT NULL CHECK (char_length(device_token) = 16),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_echoes_thread ON public.echoes (unsaid_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_echoes_device_rate_limit ON public.echoes (device_token, created_at DESC);

ALTER TABLE public.echoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS echoes_select_all ON public.echoes;
CREATE POLICY echoes_select_all ON public.echoes FOR SELECT USING (true);

DROP POLICY IF EXISTS echoes_insert_any ON public.echoes;
CREATE POLICY echoes_insert_any ON public.echoes FOR INSERT WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. TABLE: reactions
-- Deduplication ledger for reaction taps.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unsaid_id UUID NOT NULL REFERENCES public.unsaids(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL CHECK (char_length(device_token) = 16),
  reaction_key TEXT NOT NULL CHECK (reaction_key IN ('heart', 'sad', 'fire', 'hug')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_reactions_unsaid_device_key UNIQUE (unsaid_id, device_token, reaction_key)
);

CREATE INDEX IF NOT EXISTS idx_reactions_dedup ON public.reactions (unsaid_id, device_token);

ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reactions_select_all ON public.reactions;
CREATE POLICY reactions_select_all ON public.reactions FOR SELECT USING (true);

DROP POLICY IF EXISTS reactions_insert_any ON public.reactions;
CREATE POLICY reactions_insert_any ON public.reactions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS reactions_delete_blocked_anon ON public.reactions;
CREATE POLICY reactions_delete_blocked_anon ON public.reactions FOR DELETE USING (false);

-- ------------------------------------------------------------------------------
-- 5. TABLE: duels
-- Content for the Duel tab.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  format TEXT NOT NULL CHECK (format IN ('self-relate', 'head-to-head')),
  prompt TEXT CHECK (prompt IS NULL OR char_length(prompt) <= 150),
  option_a_text TEXT NOT NULL CHECK (char_length(option_a_text) >= 1 AND char_length(option_a_text) <= 280),
  option_b_text TEXT NOT NULL CHECK (char_length(option_b_text) >= 1 AND char_length(option_b_text) <= 280),
  option_a_handle TEXT,
  option_b_handle TEXT,
  option_a_category TEXT CHECK (option_a_category IS NULL OR option_a_category IN ('Spill The Tea', 'Silent Thoughts', 'Plot Twist', 'Hard Truth', 'Vibe Check')),
  option_b_category TEXT CHECK (option_b_category IS NULL OR option_b_category IN ('Spill The Tea', 'Silent Thoughts', 'Plot Twist', 'Hard Truth', 'Vibe Check')),
  votes_a INTEGER NOT NULL DEFAULT 0 CHECK (votes_a >= 0),
  votes_b INTEGER NOT NULL DEFAULT 0 CHECK (votes_b >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_duels_active_feed ON public.duels (active, created_at DESC) WHERE active = TRUE;

ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS duels_select_active ON public.duels;
CREATE POLICY duels_select_active ON public.duels FOR SELECT USING (active = true);

-- ------------------------------------------------------------------------------
-- 6. TABLE: duel_votes
-- Prevents double voting on duels.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.duel_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id UUID NOT NULL REFERENCES public.duels(id) ON DELETE CASCADE,
  device_token TEXT NOT NULL CHECK (char_length(device_token) = 16),
  choice_index INTEGER NOT NULL CHECK (choice_index IN (0, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_duel_votes_duel_device UNIQUE (duel_id, device_token)
);

CREATE INDEX IF NOT EXISTS idx_duel_votes_lookup ON public.duel_votes (duel_id, device_token);

ALTER TABLE public.duel_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS duel_votes_select_all ON public.duel_votes;
CREATE POLICY duel_votes_select_all ON public.duel_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS duel_votes_insert_any ON public.duel_votes;
CREATE POLICY duel_votes_insert_any ON public.duel_votes FOR INSERT WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 7. SEED DATA: 6 INITIAL DUELS
-- ------------------------------------------------------------------------------
INSERT INTO public.duels (id, format, prompt, option_a_text, option_b_text, option_a_category, option_b_category, option_a_handle, option_b_handle)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'self-relate',
    'Which one is more you at 2 AM?',
    'I re-read old texts just to feel that spark again, even though I know how it ends.',
    'I act completely unbothered while calculating their exact active status online.',
    'Spill The Tea',
    'Silent Thoughts',
    NULL,
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'head-to-head',
    'Which confession hits harder?',
    'We were best friends for nine years and now I know you only through screenshots other people send me.',
    'I forgave you out loud and I''m still working on the quiet part.',
    'Spill The Tea',
    'Hard Truth',
    '@lateshiftpoet',
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'self-relate',
    'How do you handle unsaid feelings?',
    'Write paragraphs in notes app, select all, and delete forever.',
    'Post a very specific song on story and hope only one person understands.',
    'Plot Twist',
    'Vibe Check',
    NULL,
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'head-to-head',
    'Which thought makes you feel less alone?',
    'Nobody warns you that healing is mostly boring.',
    'You can be a whole person and still be someone''s unfinished sentence.',
    'Silent Thoughts',
    'Hard Truth',
    NULL,
    '@aashir.writes'
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'self-relate',
    'Which type of ghosting hurts worse?',
    'The sudden cut-off out of nowhere after talking every day.',
    'The slow fade where reply times go from 5 mins to 3 days.',
    'Spill The Tea',
    'Vibe Check',
    NULL,
    NULL
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    'head-to-head',
    'Which truth needs to be said louder?',
    'Every night I rehearse conversations I''ll never have. I''m getting really good at them.',
    'There is a girl in Lahore who writes letters to a boy who moved to a city that no longer exists on her map.',
    'Spill The Tea',
    'Plot Twist',
    NULL,
    NULL
  )
ON CONFLICT (id) DO NOTHING;
