-- Apply after every earlier migration. All mutations go through the server.
BEGIN;

REVOKE ALL ON public.profiles, public.reactions, public.duel_votes,
  public.device_actions, public.moderation_audit_log, public.moderation_queue,
  public.echo_reports, public.anonymous_subscriptions, public.push_delivery_logs,
  public.winner_cycles FROM PUBLIC, anon, authenticated;
ALTER TABLE public.device_actions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.profiles, public.unsaids, public.echoes, public.reactions,
  public.duels, public.duel_votes, public.device_actions, public.moderation_audit_log,
  public.moderation_queue, public.echo_reports, public.anonymous_subscriptions,
  public.push_delivery_logs, public.winner_cycles TO service_role;

REVOKE ALL ON public.unsaids, public.echoes, public.duels FROM PUBLIC, anon, authenticated;
-- Wall and Echo reads use explicit server projections to protect anonymous account links.
GRANT SELECT ON public.duels TO anon, authenticated;

DROP POLICY IF EXISTS unsaids_insert_any ON public.unsaids;
DROP POLICY IF EXISTS echoes_insert_any ON public.echoes;
DROP POLICY IF EXISTS echoes_select_all ON public.echoes;
CREATE POLICY echoes_published_parent ON public.echoes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.unsaids u WHERE u.id = unsaid_id AND u.status = 'published'));
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE OR REPLACE FUNCTION public.record_and_check_rate_limit(
  p_device_token TEXT, p_action_type TEXT, p_limit INT, p_window_minutes INT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT; v_oldest TIMESTAMPTZ;
BEGIN
  IF p_device_token !~ '^[0-9a-f]{16}$' OR p_limit < 1 OR p_window_minutes < 1 THEN
    RAISE EXCEPTION 'Invalid rate limit input';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_device_token || ':' || p_action_type, 0));
  SELECT count(*), min(created_at) INTO v_count, v_oldest FROM public.device_actions
    WHERE device_token = p_device_token AND action_type = p_action_type
      AND created_at > now() - make_interval(mins => p_window_minutes);
  IF v_count >= p_limit THEN
    RETURN jsonb_build_object('allowed', false, 'limit', p_limit,
      'retry_after_seconds', greatest(1, extract(epoch FROM v_oldest + make_interval(mins => p_window_minutes) - now())::int));
  END IF;
  INSERT INTO public.device_actions(device_token, action_type) VALUES (p_device_token, p_action_type);
  RETURN jsonb_build_object('allowed', true, 'remaining', p_limit - v_count - 1);
END $$;

CREATE OR REPLACE FUNCTION public.set_reaction_atomic(
  p_post_id UUID, p_device_token TEXT, p_reaction_key TEXT, p_add BOOLEAN
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_reactions JSONB; v_changed INT;
BEGIN
  IF p_reaction_key NOT IN ('heart', 'sad', 'fire', 'hug') OR p_device_token !~ '^[0-9a-f]{16}$' THEN
    RAISE EXCEPTION 'Invalid reaction';
  END IF;
  SELECT reactions INTO v_reactions FROM public.unsaids WHERE id = p_post_id AND status = 'published' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found'; END IF;
  IF p_add THEN
    INSERT INTO public.reactions(unsaid_id, device_token, reaction_key)
      VALUES (p_post_id, p_device_token, p_reaction_key) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.reactions WHERE unsaid_id = p_post_id AND device_token = p_device_token AND reaction_key = p_reaction_key;
  END IF;
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  IF v_changed > 0 THEN
    UPDATE public.unsaids SET reactions = jsonb_set(reactions, ARRAY[p_reaction_key],
      to_jsonb(greatest(0, coalesce((reactions->>p_reaction_key)::int, 0) + CASE WHEN p_add THEN 1 ELSE -1 END)))
      WHERE id = p_post_id RETURNING reactions INTO v_reactions;
  END IF;
  RETURN v_reactions;
END $$;

CREATE OR REPLACE FUNCTION public.record_duel_vote_atomic(p_duel_id UUID, p_device_token TEXT, p_choice_index INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_a INT; v_b INT;
BEGIN
  IF p_choice_index NOT IN (0, 1) OR p_device_token !~ '^[0-9a-f]{16}$' THEN RAISE EXCEPTION 'Invalid choice'; END IF;
  PERFORM 1 FROM public.duels WHERE id = p_duel_id AND active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Duel not found'; END IF;
  INSERT INTO public.duel_votes(duel_id, device_token, choice_index) VALUES(p_duel_id, p_device_token, p_choice_index);
  UPDATE public.duels SET votes_a = votes_a + CASE WHEN p_choice_index = 0 THEN 1 ELSE 0 END,
    votes_b = votes_b + CASE WHEN p_choice_index = 1 THEN 1 ELSE 0 END
    WHERE id = p_duel_id RETURNING votes_a, votes_b INTO v_a, v_b;
  RETURN jsonb_build_object('success', true, 'votes_a', v_a, 'votes_b', v_b);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', false, 'code', 'ALREADY_VOTED', 'message', 'You have already voted on this duel');
END $$;

CREATE OR REPLACE FUNCTION public.insert_echo_atomic(p_post_id UUID, p_text TEXT, p_handle TEXT, p_device_token TEXT, p_profile_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.echoes;
BEGIN
  PERFORM 1 FROM public.unsaids WHERE id = p_post_id AND status = 'published' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post not found'; END IF;
  IF (SELECT count(*) FROM public.echoes WHERE unsaid_id = p_post_id) >= 50 THEN RAISE EXCEPTION 'Echo limit reached'; END IF;
  INSERT INTO public.echoes(unsaid_id, text, handle, device_token, profile_id)
    VALUES(p_post_id, p_text, p_handle, p_device_token, p_profile_id) RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END $$;

CREATE OR REPLACE FUNCTION public.link_guest_account(p_user_id UUID, p_device_token TEXT, p_handle TEXT, p_avatar_seed INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.profiles; v_handle TEXT; v_owner UUID;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 1));
  PERFORM pg_advisory_xact_lock(hashtextextended(p_device_token, 2));
  SELECT id INTO v_owner FROM public.profiles WHERE device_token = p_device_token;
  IF v_owner IS NOT NULL AND v_owner <> p_user_id THEN
    -- Another account used this browser. Do not transfer its identity or content.
    p_device_token := NULL;
  END IF;
  v_handle := left(regexp_replace(p_handle, '[^a-zA-Z0-9_.-]', '', 'g'), 24);
  IF length(v_handle) < 3 THEN v_handle := 'reader'; END IF;
  v_handle := v_handle || '_' || left(replace(p_user_id::text, '-', ''), 12);
  INSERT INTO public.profiles(id, handle, avatar_seed, device_token)
    VALUES(p_user_id, v_handle, greatest(1, least(500, p_avatar_seed)), p_device_token)
    ON CONFLICT(id) DO NOTHING;
  IF p_device_token IS NOT NULL THEN
    UPDATE public.unsaids SET profile_id = p_user_id WHERE device_token = p_device_token AND profile_id IS NULL;
    UPDATE public.echoes SET profile_id = p_user_id WHERE device_token = p_device_token AND profile_id IS NULL;
  END IF;
  SELECT * INTO v_row FROM public.profiles WHERE id = p_user_id;
  RETURN to_jsonb(v_row);
END $$;

CREATE OR REPLACE FUNCTION public.increment_profile_warmth(p_user_id UUID, p_amount INT, p_entry JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.profiles;
BEGIN
  UPDATE public.profiles SET warmth_total = greatest(0, warmth_total + p_amount),
    warmth_log = jsonb_build_array(p_entry) || warmth_log WHERE id = p_user_id RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  RETURN to_jsonb(v_row);
END $$;

CREATE OR REPLACE FUNCTION public.increment_profile_actions(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.profiles;
BEGIN
  UPDATE public.profiles SET total_actions = total_actions + 1,
    tabs_unlocked = '{"duel":true,"read":false}'::jsonb WHERE id = p_user_id RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  RETURN to_jsonb(v_row);
END $$;

CREATE OR REPLACE FUNCTION public.claim_daily_bonus_atomic(p_user_id UUID, p_amount INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.profiles; v_day DATE := (now() AT TIME ZONE 'UTC')::date; v_streak INT;
BEGIN
  SELECT * INTO v_row FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF v_row.last_visit = v_day THEN RAISE EXCEPTION 'Daily bonus already claimed today'; END IF;
  v_streak := CASE WHEN v_row.last_visit = v_day - 1 THEN v_row.visit_streak + 1 ELSE 1 END;
  UPDATE public.profiles SET last_visit = v_day, visit_streak = v_streak, warmth_total = warmth_total + p_amount,
    warmth_log = jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'action', 'daily_bonus', 'amount', p_amount,
      'label', 'Daily visit', 'timestamp', extract(epoch FROM now()) * 1000)) || warmth_log
    WHERE id = p_user_id RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END $$;

CREATE OR REPLACE FUNCTION public.purchase_store_item_atomic(p_user_id UUID, p_item_id TEXT, p_cost INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.profiles;
BEGIN
  SELECT * INTO v_row FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF p_item_id = ANY(v_row.purchased_items) THEN RAISE EXCEPTION 'Item already purchased'; END IF;
  IF p_cost < 0 OR v_row.warmth_total < p_cost THEN RAISE EXCEPTION 'Insufficient warmth'; END IF;
  UPDATE public.profiles SET warmth_total = warmth_total - p_cost, purchased_items = array_append(purchased_items, p_item_id)
    WHERE id = p_user_id RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END $$;

-- PostgreSQL grants EXECUTE to PUBLIC by default. Revoke every application RPC,
-- including older SECURITY DEFINER helpers that bypass RLS.
DO $$ DECLARE fn RECORD; BEGIN
  FOR fn IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'set_updated_at', 'purge_old_device_actions', 'record_and_check_rate_limit',
      'append_veto_atomic', 'crown_cycle_winner', 'increment_reaction_atomic',
      'record_duel_vote_atomic', 'set_reaction_atomic', 'insert_echo_atomic',
      'link_guest_account', 'increment_profile_warmth', 'increment_profile_actions',
      'claim_daily_bonus_atomic', 'purchase_store_item_atomic')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.signature);
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn.signature);
  END LOOP;
END $$;

COMMIT;
