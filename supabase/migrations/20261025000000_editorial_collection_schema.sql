-- ============================================================================
-- 20261025000000_editorial_collection_schema.sql
-- BajiHears: Phase A Editorial Launch Collection
-- Minimally invasive editorial provenance model, immutable seed IDs,
-- explicit labeling, and deterministic idempotent seeding procedures.
-- ============================================================================

BEGIN;

-- 1. Extend unsaids table with editorial provenance columns
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'unsaids' AND column_name = 'source_type'
    ) THEN
        ALTER TABLE public.unsaids 
            ADD COLUMN source_type TEXT NOT NULL DEFAULT 'community' 
            CHECK (source_type IN ('community', 'editorial'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'unsaids' AND column_name = 'editorial_seed_id'
    ) THEN
        ALTER TABLE public.unsaids 
            ADD COLUMN editorial_seed_id TEXT UNIQUE 
            CHECK (editorial_seed_id IS NULL OR editorial_seed_id ~ '^BH-[0-9]{3}$');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'unsaids' AND column_name = 'editorial_label'
    ) THEN
        ALTER TABLE public.unsaids 
            ADD COLUMN editorial_label TEXT DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'unsaids' AND column_name = 'display_order'
    ) THEN
        ALTER TABLE public.unsaids 
            ADD COLUMN display_order INTEGER UNIQUE DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'unsaids' AND column_name = 'editorial_metadata'
    ) THEN
        ALTER TABLE public.unsaids 
            ADD COLUMN editorial_metadata JSONB DEFAULT NULL;
    END IF;
END $$;

-- 2. Adjust device_token constraint: Allow NULL exclusively for editorial posts.
-- Preserves strict 16-character NOT NULL requirement for all organic community confessions.
ALTER TABLE public.unsaids ALTER COLUMN device_token DROP NOT NULL;

ALTER TABLE public.unsaids DROP CONSTRAINT IF EXISTS unsaids_device_token_check;
ALTER TABLE public.unsaids ADD CONSTRAINT unsaids_device_token_check 
    CHECK (source_type = 'editorial' OR (device_token IS NOT NULL AND char_length(device_token) = 16));

-- 3. Dedicated indexes for editorial order and community feed segregation
CREATE INDEX IF NOT EXISTS idx_unsaids_editorial_order 
    ON public.unsaids (source_type, display_order ASC) 
    WHERE source_type = 'editorial';

CREATE INDEX IF NOT EXISTS idx_unsaids_community_feed 
    ON public.unsaids (source_type, status, created_at DESC) 
    WHERE source_type = 'community';

-- 4. Idempotent Atomic Editorial Seeding Procedure
CREATE OR REPLACE FUNCTION public.import_editorial_seed_atomic(
    p_seed_id TEXT,
    p_display_order INT,
    p_content TEXT,
    p_category TEXT,
    p_editorial_label TEXT,
    p_metadata JSONB,
    p_status TEXT DEFAULT 'published'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_id UUID;
    v_action TEXT;
BEGIN
    -- Validation guards
    IF p_seed_id IS NULL OR p_seed_id !~ '^BH-[0-9]{3}$' THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_SEED_ID', 'message', 'Invalid seed ID format');
    END IF;

    IF p_display_order IS NULL OR p_display_order < 1 OR p_display_order > 30 THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_ORDER', 'message', 'Display order must be 1 to 30');
    END IF;

    IF p_content IS NULL OR char_length(TRIM(p_content)) < 3 OR char_length(p_content) > 280 THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_LENGTH', 'message', 'Content length must be 3-280 characters');
    END IF;

    IF p_category NOT IN ('Spill The Tea', 'Silent Thoughts', 'Plot Twist', 'Hard Truth', 'Vibe Check') THEN
        RETURN jsonb_build_object('success', false, 'code', 'INVALID_CATEGORY', 'message', 'Invalid category');
    END IF;

    -- Upsert editorial seed record
    INSERT INTO public.unsaids (
        text,
        category,
        preset,
        status,
        source_type,
        editorial_seed_id,
        editorial_label,
        display_order,
        editorial_metadata,
        device_token,
        handle,
        profile_id,
        reactions
    ) VALUES (
        p_content,
        p_category,
        'midnight-static',
        p_status,
        'editorial',
        p_seed_id,
        COALESCE(p_editorial_label, 'BajiHears Original · Fictional Story'),
        p_display_order,
        p_metadata,
        NULL,
        NULL,
        NULL,
        '{"heart": 0, "sad": 0, "fire": 0, "hug": 0}'::jsonb
    )
    ON CONFLICT (editorial_seed_id) DO UPDATE SET
        text = EXCLUDED.text,
        category = EXCLUDED.category,
        editorial_label = EXCLUDED.editorial_label,
        display_order = EXCLUDED.display_order,
        editorial_metadata = EXCLUDED.editorial_metadata,
        status = EXCLUDED.status,
        updated_at = NOW()
    RETURNING id INTO v_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_id,
        'seed_id', p_seed_id,
        'display_order', p_display_order,
        'status', p_status
    );
END;
$$;

-- 5. Helper function: Fetch BajiHears Originals in strict CSV display order
CREATE OR REPLACE FUNCTION public.get_editorial_originals(
    p_status TEXT DEFAULT 'published'
) RETURNS TABLE (
    id UUID,
    editorial_seed_id TEXT,
    display_order INT,
    text TEXT,
    category TEXT,
    preset TEXT,
    editorial_label TEXT,
    editorial_metadata JSONB,
    reactions JSONB,
    created_at TIMESTAMPTZ,
    status TEXT
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.editorial_seed_id,
        u.display_order,
        u.text,
        u.category,
        u.preset,
        u.editorial_label,
        u.editorial_metadata,
        u.reactions,
        u.created_at,
        u.status
    FROM public.unsaids u
    WHERE u.source_type = 'editorial'
      AND (p_status IS NULL OR u.status = p_status)
    ORDER BY u.display_order ASC;
END;
$$;

-- 6. Zero-trust security grants
REVOKE ALL ON FUNCTION public.import_editorial_seed_atomic(TEXT, INT, TEXT, TEXT, TEXT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_editorial_seed_atomic(TEXT, INT, TEXT, TEXT, TEXT, JSONB, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.get_editorial_originals(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_editorial_originals(TEXT) TO service_role;

COMMIT;
