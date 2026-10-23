BEGIN;
CREATE INDEX IF NOT EXISTS unsaids_profile_history ON public.unsaids(profile_id, created_at DESC);
CREATE OR REPLACE FUNCTION public.insert_post_atomic(p_text TEXT, p_handle TEXT, p_device_token TEXT, p_profile_id UUID, p_category TEXT, p_preset TEXT, p_status TEXT)
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
  INSERT INTO public.unsaids(text,handle,device_token,profile_id,category,preset,status)
    VALUES(p_text,p_handle,p_device_token,p_profile_id,p_category,p_preset,p_status) RETURNING * INTO v_row;
  RETURN jsonb_build_object('id',v_row.id,'created_at',v_row.created_at,'status',v_row.status);
END $$;
REVOKE ALL ON FUNCTION public.insert_post_atomic(TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.insert_post_atomic(TEXT,TEXT,TEXT,UUID,TEXT,TEXT,TEXT) TO service_role;
COMMIT;
