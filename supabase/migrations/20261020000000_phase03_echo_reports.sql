-- Phase 03: persist reply-level safety reports.
CREATE TABLE IF NOT EXISTS public.echo_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  echo_id UUID NOT NULL REFERENCES public.echoes(id) ON DELETE CASCADE,
  reporter_device_token TEXT NOT NULL CHECK (char_length(reporter_device_token) = 16),
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 120),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_echo_reports_echo_device UNIQUE (echo_id, reporter_device_token)
);

CREATE INDEX IF NOT EXISTS idx_echo_reports_queue
  ON public.echo_reports (status, created_at ASC);

ALTER TABLE public.echo_reports ENABLE ROW LEVEL SECURITY;

-- Reports are written and reviewed through service-role server functions only.
DROP POLICY IF EXISTS echo_reports_service_only ON public.echo_reports;
CREATE POLICY echo_reports_service_only
  ON public.echo_reports
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
