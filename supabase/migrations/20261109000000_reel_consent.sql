-- Records whether the writer of a post agreed to it being read out in Instagram
-- reels. Off by default, so every existing post stays out of reels.
--
-- p_reel_consent has a default, so a Worker still calling with the old named
-- arguments keeps working. Apply this before deploying code that sends it.

BEGIN;

ALTER TABLE public.unsaids
  ADD COLUMN IF NOT EXISTS reel_consent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_unsaids_reel_ready
  ON public.unsaids (created_at DESC)
  WHERE reel_consent AND status = 'published';

DROP FUNCTION IF EXISTS public.insert_post_atomic(TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TEXT);

CREATE FUNCTION public.insert_post_atomic(
  p_text TEXT,
  p_handle TEXT,
  p_device_token TEXT,
  p_profile_id UUID,
  p_category TEXT,
  p_preset TEXT,
  p_status TEXT,
  p_reel_consent BOOLEAN DEFAULT FALSE
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.unsaids;
BEGIN
  IF p_profile_id IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended(p_profile_id::text, 3)); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_device_token, 4));
  IF EXISTS(SELECT 1 FROM public.unsaids WHERE (device_token=p_device_token OR (p_profile_id IS NOT NULL AND profile_id=p_profile_id))
      AND created_at > now()-interval '12 hours' AND status IN ('published','review','pending')) THEN
    RAISE EXCEPTION 'You can share one thought every 12 hours. You can still read, react, and reply.';
  END IF;
  IF p_status NOT IN ('published','review') THEN RAISE EXCEPTION 'Invalid post status'; END IF;
  INSERT INTO public.unsaids(text,handle,device_token,profile_id,category,preset,status,reel_consent)
    VALUES(p_text,p_handle,p_device_token,p_profile_id,p_category,p_preset,p_status,COALESCE(p_reel_consent,FALSE)) RETURNING * INTO v_row;
  RETURN jsonb_build_object('id',v_row.id,'created_at',v_row.created_at,'status',v_row.status);
END $$;

REVOKE ALL ON FUNCTION public.insert_post_atomic(TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TEXT,BOOLEAN) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.insert_post_atomic(TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TEXT,BOOLEAN) TO service_role;

COMMIT;
