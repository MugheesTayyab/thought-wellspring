-- Migration: 20261025010000_echo_permissions_hardening.sql
-- Description: Ensure insert_echo_atomic is granted to service_role and protected from direct anonymous execution.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'insert_echo_atomic'
  ) THEN
    GRANT EXECUTE ON FUNCTION public.insert_echo_atomic(uuid, text, text, text, uuid) TO service_role;
    REVOKE EXECUTE ON FUNCTION public.insert_echo_atomic(uuid, text, text, text, uuid) FROM anon, authenticated, public;
  END IF;
END $$;
