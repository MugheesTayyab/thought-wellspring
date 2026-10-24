-- ============================================================================
-- 20261024000000_production_moderation_engine.sql
-- Production Trust & Safety Engine: Reports, Echo Lifecycle, Unified Queues,
-- Moderation Actions, Notifications Outbox, and Zero-Trust Security Grants.
-- ============================================================================

BEGIN;

-- 1. Post Reports Table: Durable storage of post-level safety reports
CREATE TABLE IF NOT EXISTS public.post_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.unsaids(id) ON DELETE CASCADE,
    reporter_device_token TEXT NOT NULL CHECK (char_length(reporter_device_token) = 16),
    reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 120),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed', 'actioned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_post_reports_post_device UNIQUE (post_id, reporter_device_token)
);

CREATE INDEX IF NOT EXISTS idx_post_reports_post_id
    ON public.post_reports (post_id);

CREATE INDEX IF NOT EXISTS idx_post_reports_status_created
    ON public.post_reports (status, created_at ASC);

ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS post_reports_service_only ON public.post_reports;
CREATE POLICY post_reports_service_only
    ON public.post_reports
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 1b. Legacy Report Migration: Idempotent reconciliation from existing unsaids.vetoed_by
INSERT INTO public.post_reports (
    post_id,
    reporter_device_token,
    reason,
    status,
    created_at
)
SELECT 
    u.id AS post_id,
    d.token AS reporter_device_token,
    'Legacy community report' AS reason,
    CASE 
        WHEN u.status = 'rejected' THEN 'actioned'
        ELSE 'open'
    END AS status,
    COALESCE(
        (
            SELECT da.created_at 
            FROM public.device_actions da 
            WHERE da.device_token = d.token 
              AND da.action_type = 'report'
              AND (da.target_id IS NULL OR da.target_id = u.id)
            ORDER BY da.created_at DESC 
            LIMIT 1
        ),
        u.updated_at,
        u.created_at,
        NOW()
    ) AS created_at
FROM public.unsaids u
CROSS JOIN LATERAL UNNEST(u.vetoed_by) AS d(token)
WHERE u.vetoed_by IS NOT NULL 
  AND array_length(u.vetoed_by, 1) > 0
  AND char_length(d.token) = 16
ON CONFLICT (post_id, reporter_device_token) DO NOTHING;

-- 2. Echo Lifecycle: Add status column to echoes table
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'echoes' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.echoes 
            ADD COLUMN status TEXT NOT NULL DEFAULT 'published' 
            CHECK (status IN ('published', 'review', 'rejected'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_echoes_status_unsaid
    ON public.echoes (unsaid_id, status);

-- 3. Moderation Audit Trail Extension: Support for echoes and new action types
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'moderation_audit_log' AND column_name = 'target_type'
    ) THEN
        ALTER TABLE public.moderation_audit_log 
            ADD COLUMN target_type TEXT NOT NULL DEFAULT 'post' 
            CHECK (target_type IN ('post', 'echo'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'moderation_audit_log' AND column_name = 'echo_id'
    ) THEN
        ALTER TABLE public.moderation_audit_log 
            ADD COLUMN echo_id UUID REFERENCES public.echoes(id) ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE public.moderation_audit_log 
    DROP CONSTRAINT IF EXISTS moderation_audit_log_action_type_check;

ALTER TABLE public.moderation_audit_log 
    ADD CONSTRAINT moderation_audit_log_action_type_check 
    CHECK (action_type IN (
        'auto_quarantine', 'auto_flag', 'manual_approve', 'manual_reject', 
        'auto_reject', 'manual_hide', 'manual_restore', 'dismiss_report', 'resolve_report'
    ));

-- 4. Durable Notification Outbox for Owner Alerts
CREATE TABLE IF NOT EXISTS public.moderation_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL CHECK (event_type IN ('auto_flag', 'post_report', 'echo_report', 'quarantine')),
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'echo')),
    target_id UUID NOT NULL,
    preview_text TEXT NOT NULL,
    category TEXT,
    reason TEXT,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    report_count INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed', 'suppressed')),
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    next_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claim_token UUID DEFAULT NULL,
    claim_expires_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_moderation_notifications_dispatch
    ON public.moderation_notifications (status, next_attempt)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_moderation_notifications_claim
    ON public.moderation_notifications (status, next_attempt, claim_expires_at)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_moderation_notifications_target
    ON public.moderation_notifications (target_type, target_id, created_at DESC);

ALTER TABLE public.moderation_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS moderation_notifications_service_only ON public.moderation_notifications;
CREATE POLICY moderation_notifications_service_only
    ON public.moderation_notifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 5. Helper Function: Enqueue Moderation Notification with Outbox Grouping & Escalation
CREATE OR REPLACE FUNCTION public.enqueue_moderation_notification(
    p_event_type TEXT,
    p_target_type TEXT,
    p_target_id UUID,
    p_preview_text TEXT,
    p_category TEXT,
    p_reason TEXT,
    p_priority TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_pending_id UUID;
    v_current_priority TEXT;
    v_current_event TEXT;
    v_elevate_priority TEXT;
    v_is_escalation BOOLEAN := false;
BEGIN
    -- Only match pending, unclaimed notifications in outbox (never group against delivered, failed, or actively claimed notifications)
    SELECT id, priority, event_type
    INTO v_pending_id, v_current_priority, v_current_event
    FROM public.moderation_notifications
    WHERE target_type = p_target_type
      AND target_id = p_target_id
      AND status = 'pending'
      AND (claim_expires_at IS NULL OR claim_expires_at <= NOW())
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_pending_id IS NOT NULL THEN
        -- Evaluate material escalation: quarantine event or priority elevation
        IF p_event_type = 'quarantine' AND v_current_event != 'quarantine' THEN
            v_is_escalation := true;
        END IF;

        IF p_priority = 'urgent' AND v_current_priority != 'urgent' THEN
            v_is_escalation := true;
            v_elevate_priority := 'urgent';
        ELSIF p_priority = 'high' AND v_current_priority NOT IN ('urgent', 'high') THEN
            v_is_escalation := true;
            v_elevate_priority := 'high';
        ELSE
            v_elevate_priority := v_current_priority;
        END IF;

        -- Burst grouping for pending events
        UPDATE public.moderation_notifications
        SET report_count = report_count + 1,
            event_type = CASE WHEN p_event_type = 'quarantine' THEN 'quarantine' ELSE event_type END,
            priority = COALESCE(v_elevate_priority, priority),
            reason = COALESCE(NULLIF(TRIM(p_reason), ''), reason),
            -- Reset next_attempt to NOW() so escalations dispatch immediately
            next_attempt = CASE WHEN v_is_escalation THEN NOW() ELSE next_attempt END
        WHERE id = v_pending_id;
    ELSE
        -- No active pending notification; insert fresh outbox record
        INSERT INTO public.moderation_notifications (
            event_type, target_type, target_id, preview_text, category, reason, priority, report_count
        ) VALUES (
            p_event_type, p_target_type, p_target_id,
            SUBSTRING(p_preview_text FROM 1 FOR 140),
            p_category, p_reason, p_priority, 1
        );
    END IF;
END;
$$;

-- 6. Atomic Post Reporting Procedure
CREATE OR REPLACE FUNCTION public.report_post_atomic(
    p_post_id UUID,
    p_reporter_device_token TEXT,
    p_reason TEXT DEFAULT 'Community safety concern'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_post RECORD;
    v_open_reports INT;
    v_new_status TEXT;
    v_echo_count INT;
    v_quarantined BOOLEAN := false;
    v_priority TEXT := 'normal';
    v_clean_reason TEXT := COALESCE(NULLIF(TRIM(p_reason), ''), 'Community safety concern');
BEGIN
    SELECT id, text, category, device_token, vetoed_by, veto_count, status
    INTO v_post
    FROM public.unsaids
    WHERE id = p_post_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Post does not exist');
    END IF;

    -- Reject reporting if post is already rejected by moderation
    IF v_post.status = 'rejected' THEN
        RETURN jsonb_build_object('success', false, 'code', 'POST_ALREADY_REJECTED', 'message', 'This post has already been removed by moderation');
    END IF;

    IF v_post.device_token = p_reporter_device_token THEN
        RETURN jsonb_build_object('success', false, 'code', 'SELF_VETO_FORBIDDEN', 'message', 'You cannot report your own confession');
    END IF;

    -- Record distinct report
    INSERT INTO public.post_reports (post_id, reporter_device_token, reason)
    VALUES (p_post_id, p_reporter_device_token, v_clean_reason)
    ON CONFLICT (post_id, reporter_device_token) DO NOTHING;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'ALREADY_REPORTED', 'message', 'You have already reported this confession');
    END IF;

    -- Compute open report count
    SELECT COUNT(*) INTO v_open_reports
    FROM public.post_reports
    WHERE post_id = p_post_id AND status = 'open';

    SELECT COUNT(*) INTO v_echo_count
    FROM public.echoes
    WHERE unsaid_id = p_post_id AND status = 'published';

    -- Alert priority: elevate priority if reason contains critical keywords or multiple reports exist
    -- (NOTE: Unverified reporter text elevates NOTIFICATION priority to alert the owner immediately,
    -- but NEVER automatically quarantines content on a single unverified report).
    IF v_clean_reason ~* '(?:leak|doxx|blackmail|suicide|threat|personal number|address)' THEN
        v_priority := 'urgent';
    ELSIF v_open_reports >= 2 THEN
        v_priority := 'high';
    END IF;

    -- Quarantine thresholds: strictly corroborated independent reports (3 reports, or 5 if active discussion with >= 3 echoes)
    IF (v_echo_count < 3 AND v_open_reports >= 3) OR (v_echo_count >= 3 AND v_open_reports >= 5) THEN
        v_new_status := 'review';
        IF v_post.status != 'review' THEN
            v_quarantined := true;
        END IF;
    ELSE
        v_new_status := v_post.status;
    END IF;

    -- Update unsaids record
    UPDATE public.unsaids
    SET vetoed_by = array_append(COALESCE(v_post.vetoed_by, ARRAY[]::TEXT[]), p_reporter_device_token),
        veto_count = GREATEST(COALESCE(v_post.veto_count, 0) + 1, v_open_reports),
        status = v_new_status,
        updated_at = NOW()
    WHERE id = p_post_id;

    -- Audit log if newly quarantined
    IF v_quarantined THEN
        INSERT INTO public.moderation_audit_log (
            unsaid_id, action_type, performed_by, previous_status, new_status, reason, target_type
        ) VALUES (
            p_post_id, 'auto_quarantine', 'SYSTEM', v_post.status, 'review',
            'Community report threshold exceeded (' || v_open_reports || ' open reports)', 'post'
        );
    END IF;

    -- Queue alert for owner
    PERFORM public.enqueue_moderation_notification(
        CASE WHEN v_quarantined THEN 'quarantine' ELSE 'post_report' END,
        'post',
        p_post_id,
        v_post.text,
        v_post.category,
        v_clean_reason,
        v_priority
    );

    RETURN jsonb_build_object(
        'success', true,
        'code', 'OK',
        'veto_count', GREATEST(COALESCE(v_post.veto_count, 0) + 1, v_open_reports),
        'quarantined', v_quarantined
    );
END;
$$;

-- Backward-compatible alias for existing tests and endpoints
CREATE OR REPLACE FUNCTION public.append_veto_atomic(
    p_post_id UUID,
    p_reporter_device_token TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN public.report_post_atomic(p_post_id, p_reporter_device_token, 'Community safety concern');
END;
$$;

-- 7. Atomic Echo Reporting Procedure
CREATE OR REPLACE FUNCTION public.report_echo_atomic(
    p_echo_id UUID,
    p_reporter_device_token TEXT,
    p_reason TEXT DEFAULT 'Community safety concern'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_echo RECORD;
    v_open_reports INT;
    v_quarantined BOOLEAN := false;
    v_priority TEXT := 'normal';
    v_clean_reason TEXT := COALESCE(NULLIF(TRIM(p_reason), ''), 'Community safety concern');
BEGIN
    SELECT id, unsaid_id, text, device_token, status
    INTO v_echo
    FROM public.echoes
    WHERE id = p_echo_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Echo does not exist');
    END IF;

    -- Reject reporting if Echo is already rejected by moderation
    IF v_echo.status = 'rejected' THEN
        RETURN jsonb_build_object('success', false, 'code', 'ECHO_ALREADY_REJECTED', 'message', 'This Echo has already been removed by moderation');
    END IF;

    IF v_echo.device_token = p_reporter_device_token THEN
        RETURN jsonb_build_object('success', false, 'code', 'SELF_REPORT_FORBIDDEN', 'message', 'You cannot report your own Echo');
    END IF;

    INSERT INTO public.echo_reports (echo_id, reporter_device_token, reason)
    VALUES (p_echo_id, p_reporter_device_token, v_clean_reason)
    ON CONFLICT (echo_id, reporter_device_token) DO NOTHING;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'ALREADY_REPORTED', 'message', 'You have already reported this Echo');
    END IF;

    SELECT COUNT(*) INTO v_open_reports
    FROM public.echo_reports
    WHERE echo_id = p_echo_id AND status = 'open';

    -- Notification priority: elevate notification urgency if critical keywords or multiple reports exist
    -- (NOTE: Unverified reporter text elevates NOTIFICATION priority to alert the owner immediately,
    -- but NEVER automatically quarantines content on a single unverified report).
    IF v_clean_reason ~* '(?:leak|doxx|blackmail|suicide|threat|personal number|address)' THEN
        v_priority := 'urgent';
    ELSIF v_open_reports >= 2 THEN
        v_priority := 'high';
    END IF;

    -- Quarantine Echo only when corroborated threshold reached (3 independent reports)
    IF v_open_reports >= 3 AND v_echo.status != 'review' THEN
        v_quarantined := true;
        UPDATE public.echoes
        SET status = 'review'
        WHERE id = p_echo_id;

        INSERT INTO public.moderation_audit_log (
            echo_id, unsaid_id, action_type, performed_by, previous_status, new_status, reason, target_type
        ) VALUES (
            p_echo_id, v_echo.unsaid_id, 'auto_quarantine', 'SYSTEM', v_echo.status, 'review',
            'Community report threshold exceeded (' || v_open_reports || ' open reports)', 'echo'
        );
    END IF;

    PERFORM public.enqueue_moderation_notification(
        CASE WHEN v_quarantined THEN 'quarantine' ELSE 'echo_report' END,
        'echo',
        p_echo_id,
        v_echo.text,
        'Echo Reply',
        v_clean_reason,
        v_priority
    );

    RETURN jsonb_build_object(
        'success', true,
        'code', 'OK',
        'report_count', v_open_reports,
        'quarantined', v_quarantined
    );
END;
$$;

-- 8. Atomic Post Moderation Procedure with Explicit State Transitions
CREATE OR REPLACE FUNCTION public.moderate_post_atomic(
    p_post_id UUID,
    p_action TEXT,
    p_moderator_id TEXT,
    p_reason TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_post RECORD;
    v_open_reports INT;
    v_new_status TEXT;
    v_audit_action TEXT;
    v_clean_reason TEXT := COALESCE(NULLIF(TRIM(p_reason), ''), 'Moderation action taken');
BEGIN
    SELECT id, text, status, veto_count
    INTO v_post
    FROM public.unsaids
    WHERE id = p_post_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Post does not exist');
    END IF;

    SELECT COUNT(*) INTO v_open_reports
    FROM public.post_reports
    WHERE post_id = p_post_id AND status = 'open';

    CASE p_action
        WHEN 'approve' THEN
            IF v_post.status = 'rejected' THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'message', 'Rejected post cannot be approved directly; use restore');
            ELSIF v_post.status = 'published' AND v_open_reports = 0 THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'message', 'Post is already published with no open reports');
            END IF;
            v_new_status := 'published';
            v_audit_action := 'manual_approve';
            UPDATE public.post_reports SET status = 'actioned' WHERE post_id = p_post_id AND status = 'open';

        WHEN 'hide' THEN
            IF v_post.status = 'review' THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'message', 'Post is already in review / hidden');
            ELSIF v_post.status = 'rejected' THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'message', 'Cannot hide a rejected post; it is already removed');
            END IF;
            v_new_status := 'review';
            v_audit_action := 'manual_hide';

        WHEN 'reject' THEN
            IF v_post.status = 'rejected' THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'message', 'Post is already rejected');
            END IF;
            v_new_status := 'rejected';
            v_audit_action := 'manual_reject';
            UPDATE public.post_reports SET status = 'actioned' WHERE post_id = p_post_id AND status = 'open';

        WHEN 'restore' THEN
            IF v_post.status = 'published' THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'message', 'Post is already published');
            END IF;
            v_new_status := 'published';
            v_audit_action := 'manual_restore';
            UPDATE public.post_reports SET status = 'actioned' WHERE post_id = p_post_id AND status = 'open';

        WHEN 'dismiss_reports' THEN
            IF v_open_reports = 0 THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'message', 'No open reports to dismiss');
            ELSIF v_post.status = 'rejected' THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'message', 'Cannot dismiss reports on rejected post');
            END IF;
            v_new_status := v_post.status;
            v_audit_action := 'dismiss_report';
            UPDATE public.post_reports SET status = 'dismissed' WHERE post_id = p_post_id AND status = 'open';

        ELSE
            RETURN jsonb_build_object('success', false, 'code', 'INVALID_ACTION', 'message', 'Unknown moderation action');
    END CASE;

    UPDATE public.unsaids
    SET status = v_new_status,
        updated_at = NOW()
    WHERE id = p_post_id;

    INSERT INTO public.moderation_audit_log (
        unsaid_id, action_type, performed_by, previous_status, new_status, reason, target_type
    ) VALUES (
        p_post_id, v_audit_action, p_moderator_id, v_post.status, v_new_status, v_clean_reason, 'post'
    );

    RETURN jsonb_build_object(
        'success', true,
        'code', 'OK',
        'previous_status', v_post.status,
        'new_status', v_new_status,
        'action', p_action
    );
END;
$$;

-- 9. Atomic Echo Moderation Procedure with Explicit State Transitions
CREATE OR REPLACE FUNCTION public.moderate_echo_atomic(
    p_echo_id UUID,
    p_action TEXT,
    p_moderator_id TEXT,
    p_reason TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_echo RECORD;
    v_open_reports INT;
    v_new_status TEXT;
    v_audit_action TEXT;
    v_clean_reason TEXT := COALESCE(NULLIF(TRIM(p_reason), ''), 'Moderation action taken');
BEGIN
    SELECT id, unsaid_id, text, status
    INTO v_echo
    FROM public.echoes
    WHERE id = p_echo_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Echo does not exist');
    END IF;

    SELECT COUNT(*) INTO v_open_reports
    FROM public.echo_reports
    WHERE echo_id = p_echo_id AND status = 'open';

    CASE p_action
        WHEN 'approve' THEN
            IF v_echo.status = 'rejected' THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'message', 'Rejected Echo cannot be approved directly; use restore');
            ELSIF v_echo.status = 'published' AND v_open_reports = 0 THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'message', 'Echo is already published with no open reports');
            END IF;
            v_new_status := 'published';
            v_audit_action := 'manual_approve';
            UPDATE public.echo_reports SET status = 'actioned' WHERE echo_id = p_echo_id AND status = 'open';

        WHEN 'hide' THEN
            IF v_echo.status = 'review' THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'message', 'Echo is already in review / hidden');
            ELSIF v_echo.status = 'rejected' THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'message', 'Cannot hide a rejected Echo; it is already removed');
            END IF;
            v_new_status := 'review';
            v_audit_action := 'manual_hide';

        WHEN 'reject' THEN
            IF v_echo.status = 'rejected' THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'message', 'Echo is already rejected');
            END IF;
            v_new_status := 'rejected';
            v_audit_action := 'manual_reject';
            UPDATE public.echo_reports SET status = 'actioned' WHERE echo_id = p_echo_id AND status = 'open';

        WHEN 'restore' THEN
            IF v_echo.status = 'published' THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'message', 'Echo is already published');
            END IF;
            v_new_status := 'published';
            v_audit_action := 'manual_restore';
            UPDATE public.echo_reports SET status = 'actioned' WHERE echo_id = p_echo_id AND status = 'open';

        WHEN 'dismiss_reports' THEN
            IF v_open_reports = 0 THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'message', 'No open reports to dismiss');
            ELSIF v_echo.status = 'rejected' THEN
                RETURN jsonb_build_object('success', false, 'code', 'INVALID_TRANSITION', 'message', 'Cannot dismiss reports on rejected Echo');
            END IF;
            v_new_status := v_echo.status;
            v_audit_action := 'dismiss_report';
            UPDATE public.echo_reports SET status = 'dismissed' WHERE echo_id = p_echo_id AND status = 'open';

        ELSE
            RETURN jsonb_build_object('success', false, 'code', 'INVALID_ACTION', 'message', 'Unknown moderation action');
    END CASE;

    UPDATE public.echoes
    SET status = v_new_status
    WHERE id = p_echo_id;

    INSERT INTO public.moderation_audit_log (
        echo_id, unsaid_id, action_type, performed_by, previous_status, new_status, reason, target_type
    ) VALUES (
        p_echo_id, v_echo.unsaid_id, v_audit_action, p_moderator_id, v_echo.status, v_new_status, v_clean_reason, 'echo'
    );

    RETURN jsonb_build_object(
        'success', true,
        'code', 'OK',
        'previous_status', v_echo.status,
        'new_status', v_new_status,
        'action', p_action
    );
END;
$$;

-- 10. Summary Metrics RPC for Admin Dashboard
CREATE OR REPLACE FUNCTION public.get_moderation_counts()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_auto_flagged INT;
    v_reported_posts INT;
    v_reported_echoes INT;
    v_quarantined INT;
    v_resolved_24h INT;
    v_unresolved_total INT;
BEGIN
    -- Auto-flagged posts in review with 0 reports
    SELECT COUNT(*) INTO v_auto_flagged
    FROM public.unsaids u
    WHERE u.status = 'review'
      AND NOT EXISTS (SELECT 1 FROM public.post_reports pr WHERE pr.post_id = u.id AND pr.status = 'open');

    -- Published posts with >= 1 open report
    SELECT COUNT(DISTINCT post_id) INTO v_reported_posts
    FROM public.post_reports
    WHERE status = 'open';

    -- Echoes with >= 1 open report or in review
    SELECT COUNT(DISTINCT e.id) INTO v_reported_echoes
    FROM public.echoes e
    LEFT JOIN public.echo_reports er ON er.echo_id = e.id AND er.status = 'open'
    WHERE e.status = 'review' OR er.id IS NOT NULL;

    -- Quarantined content
    SELECT (
        (SELECT COUNT(*) FROM public.unsaids WHERE status = 'review') +
        (SELECT COUNT(*) FROM public.echoes WHERE status = 'review')
    ) INTO v_quarantined;

    -- Decisions in last 24h
    SELECT COUNT(*) INTO v_resolved_24h
    FROM public.moderation_audit_log
    WHERE created_at >= NOW() - INTERVAL '24 hours';

    -- Total unresolved items
    SELECT (
        (SELECT COUNT(*) FROM public.unsaids u WHERE u.status = 'review' OR EXISTS (SELECT 1 FROM public.post_reports pr WHERE pr.post_id = u.id AND pr.status = 'open')) +
        (SELECT COUNT(*) FROM public.echoes e WHERE e.status = 'review' OR EXISTS (SELECT 1 FROM public.echo_reports er WHERE er.echo_id = e.id AND er.status = 'open'))
    ) INTO v_unresolved_total;

    RETURN jsonb_build_object(
        'unresolved_reports', v_unresolved_total,
        'auto_flagged_posts', v_auto_flagged,
        'reported_published_posts', v_reported_posts,
        'reported_echoes', v_reported_echoes,
        'quarantined_content', v_quarantined,
        'recently_resolved_24h', v_resolved_24h
    );
END;
$$;

-- 11. Modernized Moderation Queue Views (Non-destructive: no CASCADE)
DROP VIEW IF EXISTS public.echo_moderation_queue;
DROP VIEW IF EXISTS public.moderation_queue;
CREATE VIEW public.moderation_queue AS
SELECT 
    u.id,
    u.text,
    u.category,
    u.status,
    u.veto_count,
    COALESCE(pr.open_reports, 0)::INT AS open_report_count,
    COALESCE(pr.unique_reporters, COALESCE(array_length(u.vetoed_by, 1), 0))::INT AS unique_reporters,
    (SELECT COUNT(*) FROM public.echoes e WHERE e.unsaid_id = u.id AND e.status = 'published')::INT AS echo_count,
    u.created_at,
    pr.first_reported_at,
    pr.latest_reported_at,
    pr.latest_reason,
    CASE 
        WHEN u.status = 'review' AND COALESCE(pr.open_reports, 0) = 0 THEN 'AUTO_FLAGGED'
        WHEN u.status = 'review' AND COALESCE(pr.open_reports, 0) > 0 THEN 'QUARANTINED'
        WHEN COALESCE(pr.open_reports, 0) >= 3 THEN 'HIGH_REPORT'
        WHEN COALESCE(pr.open_reports, 0) > 0 THEN 'REPORTED_VISIBLE'
        ELSE 'NORMAL'
    END AS triage_bucket,
    CASE
        WHEN u.status = 'review' AND COALESCE(pr.open_reports, 0) >= 3 THEN 'URGENT: Quarantined by Community Reports'
        WHEN u.status = 'review' THEN 'HIGH: Held by Automated Filters'
        WHEN COALESCE(pr.open_reports, 0) >= 2 THEN 'MEDIUM: Multiple Community Reports'
        WHEN COALESCE(pr.open_reports, 0) = 1 THEN 'LOW: First Community Report'
        ELSE 'NORMAL'
    END AS triage_priority
FROM public.unsaids u
LEFT JOIN (
    SELECT 
        post_id,
        COUNT(*) AS open_reports,
        COUNT(DISTINCT reporter_device_token) AS unique_reporters,
        MIN(created_at) AS first_reported_at,
        MAX(created_at) AS latest_reported_at,
        (ARRAY_AGG(reason ORDER BY created_at DESC))[1] AS latest_reason
    FROM public.post_reports
    WHERE status = 'open'
    GROUP BY post_id
) pr ON pr.post_id = u.id
WHERE u.status = 'review' OR COALESCE(pr.open_reports, 0) > 0
ORDER BY 
    CASE WHEN u.status = 'review' THEN 0 ELSE 1 END,
    COALESCE(pr.open_reports, 0) DESC,
    u.created_at DESC;

DROP VIEW IF EXISTS public.echo_moderation_queue;
CREATE VIEW public.echo_moderation_queue AS
SELECT 
    e.id,
    e.unsaid_id,
    e.text,
    e.status,
    e.created_at,
    COALESCE(er.open_reports, 0)::INT AS open_report_count,
    COALESCE(er.unique_reporters, 0)::INT AS unique_reporters,
    er.first_reported_at,
    er.latest_reported_at,
    er.latest_reason,
    u.text AS parent_post_text,
    u.category AS parent_post_category,
    u.status AS parent_post_status,
    CASE 
        WHEN e.status = 'review' THEN 'QUARANTINED'
        WHEN COALESCE(er.open_reports, 0) >= 3 THEN 'HIGH_REPORT'
        WHEN COALESCE(er.open_reports, 0) > 0 THEN 'REPORTED_VISIBLE'
        ELSE 'NORMAL'
    END AS triage_bucket
FROM public.echoes e
JOIN public.unsaids u ON u.id = e.unsaid_id
LEFT JOIN (
    SELECT 
        echo_id,
        COUNT(*) AS open_reports,
        COUNT(DISTINCT reporter_device_token) AS unique_reporters,
        MIN(created_at) AS first_reported_at,
        MAX(created_at) AS latest_reported_at,
        (ARRAY_AGG(reason ORDER BY created_at DESC))[1] AS latest_reason
    FROM public.echo_reports
    WHERE status = 'open'
    GROUP BY echo_id
) er ON er.echo_id = e.id
WHERE e.status = 'review' OR COALESCE(er.open_reports, 0) > 0
ORDER BY 
    CASE WHEN e.status = 'review' THEN 0 ELSE 1 END,
    COALESCE(er.open_reports, 0) DESC,
    e.created_at DESC;

-- 12. Notification Queue Claim & Completion Functions (Atomic Claim-Token Lease Engine)
DROP FUNCTION IF EXISTS public.claim_moderation_notifications(INT);
DROP FUNCTION IF EXISTS public.claim_moderation_notifications(INT, INT);
CREATE OR REPLACE FUNCTION public.claim_moderation_notifications(
    p_batch_size INT DEFAULT 10,
    p_lease_seconds INT DEFAULT 120
)
RETURNS TABLE (
    id UUID,
    claim_token UUID,
    event_type TEXT,
    target_type TEXT,
    target_id UUID,
    preview_text TEXT,
    category TEXT,
    reason TEXT,
    priority TEXT,
    report_count INT,
    attempts INT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY
    WITH eligible AS (
        SELECT n.id
        FROM public.moderation_notifications n
        WHERE n.status = 'pending'
          AND n.next_attempt <= NOW()
          AND (n.claim_expires_at IS NULL OR n.claim_expires_at <= NOW())
        ORDER BY 
            CASE n.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
            n.created_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    ),
    claimed AS (
        UPDATE public.moderation_notifications n
        SET attempts = n.attempts + 1,
            claim_token = gen_random_uuid(),
            claim_expires_at = NOW() + (p_lease_seconds || ' seconds')::INTERVAL,
            next_attempt = NOW() + (p_lease_seconds || ' seconds')::INTERVAL
        FROM eligible
        WHERE n.id = eligible.id
        RETURNING 
            n.id, n.claim_token, n.event_type, n.target_type, n.target_id, n.preview_text,
            n.category, n.reason, n.priority, n.report_count, n.attempts
    )
    SELECT * FROM claimed;
END;
$$;

DROP FUNCTION IF EXISTS public.complete_moderation_notification(UUID, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS public.complete_moderation_notification(UUID, UUID, BOOLEAN, TEXT);
CREATE OR REPLACE FUNCTION public.complete_moderation_notification(
    p_id UUID,
    p_claim_token UUID,
    p_success BOOLEAN,
    p_error TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_notif RECORD;
BEGIN
    SELECT id, status, claim_token, claim_expires_at, attempts
    INTO v_notif
    FROM public.moderation_notifications
    WHERE id = p_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'code', 'NOT_FOUND', 'message', 'Notification not found');
    END IF;

    -- Safety Guard 1: Delivered notifications are immutable.
    -- Stale callbacks (e.g. late failure or slow retry) must NEVER overwrite a delivered notification.
    IF v_notif.status = 'delivered' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'ALREADY_DELIVERED',
            'message', 'Notification has already been delivered'
        );
    END IF;

    -- Safety Guard 2: Notification must be pending
    IF v_notif.status != 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'NOT_PENDING',
            'message', 'Notification is in status: ' || v_notif.status
        );
    END IF;

    -- Safety Guard 3: Claim token validation
    -- If p_claim_token is missing or does not match active claim_token, reject the stale worker
    IF v_notif.claim_token IS NULL OR p_claim_token IS NULL OR v_notif.claim_token != p_claim_token THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'STALE_CLAIM_TOKEN',
            'message', 'Claim token does not match active lease'
        );
    END IF;

    -- Safety Guard 4: Lease expiration check
    IF v_notif.claim_expires_at < NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'LEASE_EXPIRED',
            'message', 'Worker lease has expired'
        );
    END IF;

    -- Valid worker claim confirmed
    IF p_success THEN
        UPDATE public.moderation_notifications
        SET status = 'delivered',
            delivered_at = NOW(),
            last_error = NULL,
            claim_token = NULL,
            claim_expires_at = NULL
        WHERE id = p_id;

        RETURN jsonb_build_object('success', true, 'code', 'DELIVERED');
    ELSE
        UPDATE public.moderation_notifications
        SET status = CASE WHEN attempts >= 3 THEN 'failed' ELSE 'pending' END,
            last_error = p_error,
            next_attempt = CASE 
                WHEN attempts >= 3 THEN next_attempt 
                ELSE NOW() + (attempts * INTERVAL '2 minutes') 
            END,
            claim_token = NULL,
            claim_expires_at = NULL
        WHERE id = p_id;

        RETURN jsonb_build_object(
            'success', true,
            'code', CASE WHEN v_notif.attempts >= 3 THEN 'FAILED' ELSE 'RETRY_SCHEDULED' END,
            'attempts', v_notif.attempts
        );
    END IF;
END;
$$;

-- 13. Zero-Trust Security Grants: Revoke from Public/Anon/Auth, Grant to Service Role Only
DO $$ DECLARE fn RECORD; BEGIN
    FOR fn IN SELECT p.oid::regprocedure AS signature 
              FROM pg_proc p 
              JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname = 'public' AND p.proname IN (
                  'enqueue_moderation_notification',
                  'report_post_atomic',
                  'report_echo_atomic',
                  'moderate_post_atomic',
                  'moderate_echo_atomic',
                  'get_moderation_counts',
                  'claim_moderation_notifications',
                  'complete_moderation_notification'
              )
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.signature);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.signature);
        EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn.signature);
    END LOOP;
END $$;

REVOKE ALL ON TABLE public.post_reports FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.post_reports TO service_role;

REVOKE ALL ON TABLE public.moderation_notifications FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.moderation_notifications TO service_role;

REVOKE ALL ON TABLE public.moderation_queue FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.moderation_queue TO service_role;

REVOKE ALL ON TABLE public.echo_moderation_queue FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.echo_moderation_queue TO service_role;

REVOKE ALL ON TABLE public.moderation_audit_log FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.moderation_audit_log TO service_role;

COMMIT;
