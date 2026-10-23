BEGIN;
CREATE TABLE public.push_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_timestamp BIGINT NOT NULL,
  endpoint TEXT NOT NULL,
  keys JSONB NOT NULL,
  payload JSONB NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','sending','delivered','failed')),
  attempts INT NOT NULL DEFAULT 0,
  next_attempt TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cycle_timestamp, endpoint)
);
CREATE INDEX push_outbox_pending ON public.push_outbox(next_attempt) WHERE state IN ('pending','sending');
ALTER TABLE public.push_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_outbox FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.push_outbox TO service_role;

CREATE FUNCTION public.enqueue_winner_push(p_cycle BIGINT, p_payload JSONB)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT;
BEGIN
  INSERT INTO public.push_outbox(cycle_timestamp, endpoint, keys, payload)
  SELECT p_cycle, s.endpoint, s.keys, p_payload FROM (
    SELECT endpoint, jsonb_build_object('p256dh', p256dh, 'auth', auth) AS keys FROM public.anonymous_subscriptions WHERE is_active = true
    UNION
    SELECT push_subscription->>'endpoint', push_subscription->'keys' FROM public.profiles WHERE push_subscription IS NOT NULL
  ) s WHERE s.endpoint IS NOT NULL ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

CREATE FUNCTION public.claim_push_batch(p_limit INT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows JSONB;
BEGIN
  WITH ready AS (
    SELECT id FROM public.push_outbox WHERE state IN ('pending','sending') AND next_attempt <= now() AND attempts < 3
    ORDER BY next_attempt LIMIT greatest(1, least(25, p_limit)) FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE public.push_outbox p SET state='sending', attempts=attempts+1, next_attempt=now()+interval '5 minutes'
    FROM ready r WHERE p.id=r.id RETURNING p.id,p.endpoint,p.keys,p.payload
  ) SELECT coalesce(jsonb_agg(to_jsonb(claimed)), '[]'::jsonb) INTO v_rows FROM claimed;
  UPDATE public.push_outbox SET state='failed' WHERE state='sending' AND attempts >= 3 AND next_attempt <= now();
  RETURN v_rows;
END $$;

CREATE FUNCTION public.complete_push_batch(p_results JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r JSONB; v_endpoint TEXT;
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(p_results) LOOP
    UPDATE public.push_outbox SET state=CASE WHEN (r->>'success')::boolean THEN 'delivered'
      WHEN (r->>'expired')::boolean OR attempts >= 3 THEN 'failed' ELSE 'pending' END,
      next_attempt=now()+interval '5 minutes' WHERE id=(r->>'id')::uuid RETURNING endpoint INTO v_endpoint;
    IF (r->>'expired')::boolean THEN
      UPDATE public.anonymous_subscriptions SET is_active=false WHERE endpoint=v_endpoint;
      UPDATE public.profiles SET push_subscription=NULL WHERE push_subscription->>'endpoint'=v_endpoint;
    END IF;
  END LOOP;
  DELETE FROM public.push_outbox WHERE state IN ('delivered','failed') AND created_at < now()-interval '7 days';
END $$;
REVOKE ALL ON FUNCTION public.enqueue_winner_push(BIGINT,JSONB), public.claim_push_batch(INT), public.complete_push_batch(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_winner_push(BIGINT,JSONB), public.claim_push_batch(INT), public.complete_push_batch(JSONB) TO service_role;
COMMIT;
