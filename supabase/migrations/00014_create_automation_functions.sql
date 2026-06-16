-- 00014_create_automation_functions.sql

-- ==========================================
-- Function to log N8N webhook event
-- ==========================================
CREATE OR REPLACE FUNCTION log_n8n_event(
  p_lead_id UUID,
  p_event_type TEXT,
  p_event_data JSONB,
  p_webhook_id TEXT DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Create system message for audit trail
  INSERT INTO public.messages (
    conversation_id,
    direction,
    type,
    content,
    created_at
  )
  SELECT 
    c.id,
    'inbound'::public.message_direction,
    'system'::public.message_type,
    'N8N Event: ' || p_event_type || ' - ' || p_event_data::TEXT,
    now()
  FROM public.conversations c
  WHERE c.lead_id = p_lead_id
  LIMIT 1;

  v_result := jsonb_build_object(
    'success', true,
    'lead_id', p_lead_id,
    'event_type', p_event_type,
    'timestamp', now()::TEXT
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to create appointment from N8N
-- ==========================================
CREATE OR REPLACE FUNCTION create_appointment_from_webhook(
  p_lead_id UUID,
  p_calendar_event_id TEXT,
  p_appointment_date TIMESTAMPTZ,
  p_title TEXT DEFAULT 'Consulta Agendada',
  p_notes TEXT DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_appointment JSONB;
BEGIN
  INSERT INTO public.appointments (
    lead_id,
    title,
    appointment_date,
    status,
    notes,
    created_at
  )
  VALUES (
    p_lead_id,
    p_title,
    p_appointment_date,
    'scheduled',
    p_notes,
    now()
  )
  RETURNING to_jsonb(appointments.*) INTO v_appointment;

  -- Update lead with calendar event
  UPDATE public.leads
  SET 
    calendar_event_id = p_calendar_event_id,
    last_appointment_at = p_appointment_date,
    appointment_status = 'scheduled'
  WHERE id = p_lead_id;

  RETURN v_appointment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to update appointment status
-- ==========================================
CREATE OR REPLACE FUNCTION update_appointment_status(
  p_appointment_id UUID,
  p_status TEXT
)
RETURNS jsonb AS $$
DECLARE
  v_appointment JSONB;
  v_lead_id UUID;
BEGIN
  -- Get lead_id first
  SELECT a.lead_id INTO v_lead_id
  FROM public.appointments a
  WHERE a.id = p_appointment_id;

  -- Update appointment
  UPDATE public.appointments
  SET status = p_status
  WHERE id = p_appointment_id
  RETURNING to_jsonb(appointments.*) INTO v_appointment;

  -- Update lead status based on appointment status
  IF p_status = 'confirmed' THEN
    UPDATE public.leads
    SET 
      appointment_status = 'confirmed',
      appointment_confirmed_at = now()
    WHERE id = v_lead_id;
  ELSIF p_status = 'no_show' THEN
    UPDATE public.leads
    SET appointment_status = 'no_show'
    WHERE id = v_lead_id;
  END IF;

  RETURN v_appointment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to create lead or get if exists
-- ==========================================
CREATE OR REPLACE FUNCTION upsert_lead(
  p_phone TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_origin TEXT DEFAULT NULL,
  p_main_interest TEXT DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_lead JSONB;
  v_normalized_phone TEXT;
BEGIN
  -- Normalize phone
  v_normalized_phone := p_phone;
  
  -- Try to find existing lead by phone
  SELECT to_jsonb(l.*) INTO v_lead
  FROM public.leads l
  WHERE l.phone = v_normalized_phone
  LIMIT 1;

  IF v_lead IS NOT NULL THEN
    RETURN v_lead;
  END IF;

  -- Create new lead
  INSERT INTO public.leads (
    phone,
    full_name,
    email,
    origin,
    main_interest,
    temperature,
    created_at
  )
  VALUES (
    v_normalized_phone,
    COALESCE(p_full_name, 'Cliente ' || v_normalized_phone),
    p_email,
    p_origin,
    p_main_interest,
    'cold',
    now()
  )
  RETURNING to_jsonb(leads.*) INTO v_lead;

  -- Create default conversation
  INSERT INTO public.conversations (lead_id)
  VALUES ((v_lead->>'id')::UUID);

  RETURN v_lead;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to create message from N8N webhook
-- ==========================================
CREATE OR REPLACE FUNCTION create_message_from_webhook(
  p_lead_id UUID,
  p_content TEXT,
  p_type public.message_type DEFAULT 'text',
  p_media_url TEXT DEFAULT NULL,
  p_n8n_message_id TEXT DEFAULT NULL,
  p_direction public.message_direction DEFAULT 'inbound'
)
RETURNS jsonb AS $$
DECLARE
  v_message JSONB;
  v_conversation_id UUID;
BEGIN
  -- Get or create conversation
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE lead_id = p_lead_id
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (lead_id)
    VALUES (p_lead_id)
    RETURNING id INTO v_conversation_id;
  END IF;

  -- Create message
  INSERT INTO public.messages (
    conversation_id,
    direction,
    type,
    content,
    media_url,
    n8n_message_id,
    created_at
  )
  VALUES (
    v_conversation_id,
    p_direction,
    p_type,
    p_content,
    p_media_url,
    p_n8n_message_id,
    now()
  )
  RETURNING to_jsonb(messages.*) INTO v_message;

  -- Update lead last interaction
  UPDATE public.leads
  SET last_interaction_at = now()
  WHERE id = p_lead_id;

  RETURN v_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to mark lead automation status
-- ==========================================
CREATE OR REPLACE FUNCTION set_lead_automation_state(
  p_lead_id UUID,
  p_status TEXT,
  p_paused_by TEXT DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_lead JSONB;
BEGIN
  UPDATE public.leads
  SET 
    automation_status = p_status,
    automation_paused_at = CASE WHEN p_status = 'paused_human' THEN now() ELSE automation_paused_at END,
    automation_resumed_at = CASE WHEN p_status = 'active' THEN now() ELSE automation_resumed_at END,
    automation_paused_by = p_paused_by
  WHERE id = p_lead_id
  RETURNING to_jsonb(leads.*) INTO v_lead;

  RETURN v_lead;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to get leads due for automation
-- ==========================================
CREATE OR REPLACE FUNCTION get_leads_due_for_automation(
  p_automation_type TEXT DEFAULT 'reminder',
  p_limit INT DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  phone TEXT,
  full_name TEXT,
  owner_id UUID,
  owner_name TEXT,
  last_reminder_sent_at TIMESTAMPTZ,
  last_confirmation_sent_at TIMESTAMPTZ,
  appointment_status TEXT,
  automation_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.phone,
    l.full_name,
    l.owner_id,
    l.owner_name,
    l.last_reminder_sent_at,
    l.last_confirmation_sent_at,
    l.appointment_status,
    l.automation_status
  FROM public.leads l
  WHERE 
    l.automation_status = 'active'
    AND l.appointment_status IN ('scheduled', 'confirmed')
    AND (
      (p_automation_type = 'reminder' AND l.last_reminder_sent_at IS NULL) OR
      (p_automation_type = 'confirmation' AND l.last_confirmation_sent_at IS NULL) OR
      (p_automation_type = 'reminder' AND NOW() - l.last_reminder_sent_at > INTERVAL '24 hours')
    )
  ORDER BY l.last_reminder_sent_at ASC NULLS FIRST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to record automation action
-- ==========================================
CREATE OR REPLACE FUNCTION record_automation_action(
  p_lead_id UUID,
  p_action_type TEXT,
  p_action_details JSONB DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_message JSONB;
  v_conversation_id UUID;
BEGIN
  -- Get conversation
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE lead_id = p_lead_id
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (lead_id)
    VALUES (p_lead_id)
    RETURNING id INTO v_conversation_id;
  END IF;

  -- Create system message
  INSERT INTO public.messages (
    conversation_id,
    direction,
    type,
    content,
    created_at
  )
  VALUES (
    v_conversation_id,
    'outbound'::public.message_direction,
    'system'::public.message_type,
    'Automacao: ' || p_action_type,
    now()
  )
  RETURNING to_jsonb(messages.*) INTO v_message;

  -- Update lead
  UPDATE public.leads
  SET last_interaction_at = now()
  WHERE id = p_lead_id;

  RETURN v_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- View for daily report
-- ==========================================
DROP VIEW IF EXISTS public.daily_report;
CREATE VIEW public.daily_report AS
SELECT 
  NOW()::DATE as report_date,
  COUNT(DISTINCT CASE WHEN l.created_at::DATE = NOW()::DATE THEN l.id END) as new_leads_today,
  COUNT(DISTINCT CASE WHEN l.updated_at::DATE = NOW()::DATE THEN l.id END) as leads_updated_today,
  COUNT(DISTINCT CASE WHEN a.appointment_date::DATE = NOW()::DATE THEN a.id END) as appointments_today,
  COUNT(DISTINCT CASE WHEN f.due_date::DATE = NOW()::DATE AND f.status = 'pending' THEN f.id END) as pending_followups_today,
  COUNT(DISTINCT l.id) as total_leads,
  COUNT(DISTINCT CASE WHEN l.appointment_status = 'scheduled' THEN l.id END) as scheduled_appointments,
  COUNT(DISTINCT CASE WHEN l.automation_status != 'active' THEN l.id END) as paused_automations
FROM public.leads l
FULL OUTER JOIN public.appointments a ON l.id = a.lead_id
FULL OUTER JOIN public.followups f ON l.id = f.lead_id;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION auth_user_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION upload_patient_photo(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_patient_photo(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_patient_photos(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_patient_record(UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION search_leads(TEXT, UUID, public.lead_temperature, UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_lead_interaction(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_lead_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_patient_financial(UUID, TEXT, NUMERIC, VARCHAR, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION batch_get_leads(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_messages(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_upcoming_appointments(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_followups(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION move_lead_to_stage(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_followup(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_lead_timeline(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_n8n_event(UUID, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_appointment_from_webhook(UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_appointment_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_lead(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_message_from_webhook(UUID, TEXT, public.message_type, TEXT, TEXT, public.message_direction) TO authenticated;
GRANT EXECUTE ON FUNCTION set_lead_automation_state(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_leads_due_for_automation(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_automation_action(UUID, TEXT, JSONB) TO authenticated;
