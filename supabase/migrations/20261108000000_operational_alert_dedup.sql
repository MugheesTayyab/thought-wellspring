-- Migration: 20261108000000_operational_alert_dedup.sql
-- Description: Atomic dedup/cooldown ledger so unexpected server errors can page the
-- existing moderation email channel without flooding it. Server-only; never stores
-- user content, only an error signature and timestamp.

BEGIN;

CREATE TABLE IF NOT EXISTS public.operational_alerts_sent (
  error_code TEXT PRIMARY KEY,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  occurrence_count BIGINT NOT NULL DEFAULT 1
);

ALTER TABLE public.operational_alerts_sent ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.operational_alerts_sent FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.operational_alerts_sent TO service_role;

-- Claims the right to send an alert email for p_code: returns true only when no
-- alert for this code was sent within p_cooldown_seconds, atomically recording the
-- new send time so concurrent requests cannot double-send.
CREATE OR REPLACE FUNCTION public.claim_operational_alert(
  p_code TEXT,
  p_cooldown_seconds INT DEFAULT 900
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_claimed BOOLEAN;
BEGIN
  INSERT INTO public.operational_alerts_sent (error_code, last_sent_at, occurrence_count)
  VALUES (p_code, now(), 1)
  ON CONFLICT (error_code) DO UPDATE
    SET last_sent_at = now(),
        occurrence_count = public.operational_alerts_sent.occurrence_count + 1
    WHERE public.operational_alerts_sent.last_sent_at < now() - make_interval(secs => p_cooldown_seconds)
  RETURNING TRUE INTO v_claimed;

  IF v_claimed IS NULL THEN
    UPDATE public.operational_alerts_sent
      SET occurrence_count = occurrence_count + 1
      WHERE error_code = p_code;
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_operational_alert(TEXT, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_operational_alert(TEXT, INT) TO service_role;

COMMIT;
