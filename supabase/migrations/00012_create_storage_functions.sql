-- 00012_create_storage_functions.sql

-- ==========================================
-- Helper function to get auth user ID
-- ==========================================
CREATE OR REPLACE FUNCTION auth_user_id() RETURNS uuid AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to upload patient photo
-- ==========================================
CREATE OR REPLACE FUNCTION upload_patient_photo(
  p_lead_id UUID,
  p_file_path TEXT,
  p_photo_type TEXT DEFAULT 'before'
)
RETURNS jsonb AS $$
DECLARE
  v_record_id UUID;
  v_photo_entry JSONB;
BEGIN
  -- Get or create patient record
  SELECT id INTO v_record_id
  FROM public.patient_records
  WHERE lead_id = p_lead_id
  LIMIT 1;

  IF v_record_id IS NULL THEN
    INSERT INTO public.patient_records (lead_id)
    VALUES (p_lead_id)
    RETURNING id INTO v_record_id;
  END IF;

  -- Create photo entry
  v_photo_entry := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'type', p_photo_type,
    'path', p_file_path,
    'uploaded_at', now()::text,
    'uploaded_by', auth_user_id()::text
  );

  -- Add to before_after_photos array
  UPDATE public.patient_records
  SET before_after_photos = 
    CASE 
      WHEN before_after_photos IS NULL THEN jsonb_build_array(v_photo_entry)
      ELSE before_after_photos || jsonb_build_array(v_photo_entry)
    END,
    updated_at = now()
  WHERE id = v_record_id;

  RETURN v_photo_entry;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to delete patient photo
-- ==========================================
CREATE OR REPLACE FUNCTION delete_patient_photo(
  p_lead_id UUID,
  p_photo_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_photo_entry JSONB;
BEGIN
  UPDATE public.patient_records
  SET before_after_photos = before_after_photos - p_photo_id::int,
      updated_at = now()
  WHERE lead_id = p_lead_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to get patient photos
-- ==========================================
CREATE OR REPLACE FUNCTION get_patient_photos(p_lead_id UUID)
RETURNS jsonb AS $$
BEGIN
  RETURN (
    SELECT before_after_photos
    FROM public.patient_records
    WHERE lead_id = p_lead_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to update patient record with clinical notes
-- ==========================================
CREATE OR REPLACE FUNCTION update_patient_record(
  p_lead_id UUID,
  p_evolution_notes TEXT DEFAULT NULL,
  p_post_recommendations TEXT DEFAULT NULL,
  p_facial_mapping JSONB DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_record JSONB;
BEGIN
  -- Upsert patient record
  INSERT INTO public.patient_records (lead_id, evolution_notes, post_recommendations, facial_mapping)
  VALUES (p_lead_id, p_evolution_notes, p_post_recommendations, p_facial_mapping)
  ON CONFLICT (lead_id) DO UPDATE SET
    evolution_notes = COALESCE(p_evolution_notes, EXCLUDED.evolution_notes),
    post_recommendations = COALESCE(p_post_recommendations, EXCLUDED.post_recommendations),
    facial_mapping = COALESCE(p_facial_mapping, EXCLUDED.facial_mapping),
    updated_at = now()
  RETURNING to_jsonb(patient_records.*) INTO v_record;

  RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to search leads with complex filters
-- ==========================================
CREATE OR REPLACE FUNCTION search_leads(
  p_search_term TEXT DEFAULT NULL,
  p_stage_id UUID DEFAULT NULL,
  p_temperature public.lead_temperature DEFAULT NULL,
  p_owner_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  temperature public.lead_temperature,
  stage_id UUID,
  owner_id UUID,
  conversation_status TEXT,
  created_at TIMESTAMPTZ,
  total_count INT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_leads AS (
    SELECT 
      l.id,
      l.full_name,
      l.phone,
      l.email,
      l.temperature,
      l.stage_id,
      l.owner_id,
      l.conversation_status,
      l.created_at,
      COUNT(*) OVER () as total
    FROM public.leads l
    WHERE 
      (p_search_term IS NULL OR 
       l.full_name ILIKE '%' || p_search_term || '%' OR 
       l.phone LIKE '%' || p_search_term || '%' OR
       l.email ILIKE '%' || p_search_term || '%')
      AND (p_stage_id IS NULL OR l.stage_id = p_stage_id)
      AND (p_temperature IS NULL OR l.temperature = p_temperature)
      AND (p_owner_id IS NULL OR l.owner_id = p_owner_id)
      AND l.deleted_at IS NULL
    ORDER BY l.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT * FROM filtered_leads;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to create notification for patient
-- ==========================================
CREATE OR REPLACE FUNCTION create_notification(
  p_recipient_id UUID,
  p_title TEXT,
  p_message TEXT
)
RETURNS jsonb AS $$
DECLARE
  v_notification JSONB;
BEGIN
  INSERT INTO public.notifications (recipient_id, title, message)
  VALUES (p_recipient_id, p_title, p_message)
  RETURNING to_jsonb(notifications.*) INTO v_notification;

  RETURN v_notification;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to record lead interaction
-- ==========================================
CREATE OR REPLACE FUNCTION record_lead_interaction(
  p_lead_id UUID,
  p_interaction_type TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_lead JSONB;
BEGIN
  UPDATE public.leads
  SET 
    last_interaction_at = now(),
    updated_at = now()
  WHERE id = p_lead_id
  RETURNING to_jsonb(leads.*) INTO v_lead;

  RETURN v_lead;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to get lead with all related data
-- ==========================================
CREATE OR REPLACE FUNCTION get_lead_details(p_lead_id UUID)
RETURNS jsonb AS $$
DECLARE
  v_lead JSONB;
  v_record JSONB;
  v_financials JSONB;
  v_notifications JSONB;
BEGIN
  SELECT to_jsonb(l.*) INTO v_lead
  FROM public.leads l
  WHERE l.id = p_lead_id;

  SELECT to_jsonb(pr.*) INTO v_record
  FROM public.patient_records pr
  WHERE pr.lead_id = p_lead_id;

  SELECT jsonb_agg(to_jsonb(pf.*)) INTO v_financials
  FROM public.patient_financials pf
  WHERE pf.lead_id = p_lead_id;

  SELECT jsonb_agg(to_jsonb(n.*)) INTO v_notifications
  FROM public.notifications n
  WHERE n.recipient_id = p_lead_id
  ORDER BY n.created_at DESC
  LIMIT 10;

  RETURN jsonb_build_object(
    'lead', COALESCE(v_lead, '{}'::jsonb),
    'record', COALESCE(v_record, '{}'::jsonb),
    'financials', COALESCE(v_financials, '[]'::jsonb),
    'recent_notifications', COALESCE(v_notifications, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to sync patient financial from external data
-- ==========================================
CREATE OR REPLACE FUNCTION sync_patient_financial(
  p_lead_id UUID,
  p_description TEXT,
  p_total_value NUMERIC,
  p_payment_method VARCHAR,
  p_installments JSONB DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_financial JSONB;
BEGIN
  INSERT INTO public.patient_financials (
    lead_id,
    description,
    total_value,
    payment_method,
    installments
  )
  VALUES (
    p_lead_id,
    p_description,
    p_total_value,
    p_payment_method,
    COALESCE(p_installments, '[]'::jsonb)
  )
  RETURNING to_jsonb(patient_financials.*) INTO v_financial;

  RETURN v_financial;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Create indexes for better performance
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_patient_records_lead_id ON public.patient_records(lead_id);
CREATE INDEX IF NOT EXISTS idx_patient_financials_lead_id ON public.patient_financials(lead_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_stage_id ON public.leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON public.leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_deleted_at ON public.leads(deleted_at);
