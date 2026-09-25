-- ==============================================================================
-- BajiHears: Phase 7 — Real Web Push Notification Delivery Migration
-- File: supabase/migrations/20260927000000_phase7_push_subscriptions.sql
-- ==============================================================================

-- 1. Ensure profiles table has push_subscription column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_subscription JSONB;

-- 2. Create anonymous_subscriptions table
CREATE TABLE IF NOT EXISTS public.anonymous_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_token TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    failure_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_delivered_at TIMESTAMPTZ,
    last_error TEXT,
    CONSTRAINT unique_subscription_endpoint UNIQUE (endpoint)
);

-- 3. Indexes for high-performance batch queries & pruning
CREATE INDEX IF NOT EXISTS idx_anon_sub_active 
ON public.anonymous_subscriptions(is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_anon_sub_device 
ON public.anonymous_subscriptions(device_token);

CREATE INDEX IF NOT EXISTS idx_anon_sub_endpoint 
ON public.anonymous_subscriptions(endpoint);

-- 4. Enable Row Level Security
ALTER TABLE public.anonymous_subscriptions ENABLE ROW LEVEL SECURITY;

-- Anonymous users can register/update their subscription
CREATE POLICY "Allow public insert and update on anonymous_subscriptions"
ON public.anonymous_subscriptions
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 5. Create push_delivery_logs for broadcast tracking & idempotency
CREATE TABLE IF NOT EXISTS public.push_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_timestamp BIGINT NOT NULL,
    winner_id UUID,
    total_attempted INTEGER NOT NULL DEFAULT 0,
    total_delivered INTEGER NOT NULL DEFAULT 0,
    total_failed INTEGER NOT NULL DEFAULT 0,
    total_pruned INTEGER NOT NULL DEFAULT 0,
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_logs_cycle 
ON public.push_delivery_logs(cycle_timestamp);

ALTER TABLE public.push_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service_role full control on push_delivery_logs"
ON public.push_delivery_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
