-- ==============================================================================
-- BajiHears: Phase 8 — Atomic Concurrency & Scale Hardening
-- File: supabase/migrations/20260928000000_phase8_atomic_concurrency.sql
-- ==============================================================================

-- 1. Atomic Reaction Increment (Eliminates read-modify-write race condition)
CREATE OR REPLACE FUNCTION public.increment_reaction_atomic(
    p_post_id UUID,
    p_reaction_key TEXT
) RETURNS JSONB AS $$
DECLARE
    v_updated JSONB;
BEGIN
    UPDATE public.unsaids
    SET reactions = jsonb_set(
        COALESCE(reactions, '{"heart":0,"sad":0,"fire":0,"hug":0}'::jsonb),
        ARRAY[p_reaction_key],
        to_jsonb(COALESCE((reactions->>p_reaction_key)::int, 0) + 1)
    )
    WHERE id = p_post_id AND status = 'published'
    RETURNING reactions INTO v_updated;

    RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atomic Duel Vote Recording (Guarantees atomic vote count & unique vote enforcement)
CREATE OR REPLACE FUNCTION public.record_duel_vote_atomic(
    p_duel_id UUID,
    p_device_token TEXT,
    p_choice_index INT
) RETURNS JSONB AS $$
DECLARE
    v_votes_a INT;
    v_votes_b INT;
BEGIN
    -- 1. Insert vote record (enforces unique vote constraint per device)
    INSERT INTO public.duel_votes (duel_id, device_token, choice_index)
    VALUES (p_duel_id, p_device_token, p_choice_index);

    -- 2. Atomically increment the respective option tally
    IF p_choice_index = 0 THEN
        UPDATE public.duels
        SET votes_a = COALESCE(votes_a, 0) + 1
        WHERE id = p_duel_id
        RETURNING votes_a, votes_b INTO v_votes_a, v_votes_b;
    ELSE
        UPDATE public.duels
        SET votes_b = COALESCE(votes_b, 0) + 1
        WHERE id = p_duel_id
        RETURNING votes_a, votes_b INTO v_votes_a, v_votes_b;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'votes_a', v_votes_a,
        'votes_b', v_votes_b
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'ALREADY_VOTED',
            'message', 'You have already voted on this duel'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
