-- 00013_create_database_triggers.sql

-- ==========================================
-- Trigger to auto-update updated_at timestamp
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_followups_updated_at ON public.followups;
CREATE TRIGGER update_followups_updated_at
  BEFORE UPDATE ON public.followups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pipeline_stages_updated_at ON public.pipeline_stages;
CREATE TRIGGER update_pipeline_stages_updated_at
  BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_appointments_updated_at ON public.appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_patient_records_updated_at ON public.patient_records;
CREATE TRIGGER update_patient_records_updated_at
  BEFORE UPDATE ON public.patient_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_patient_financials_updated_at ON public.patient_financials;
CREATE TRIGGER update_patient_financials_updated_at
  BEFORE UPDATE ON public.patient_financials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Trigger to auto-update conversation summary
-- ==========================================
CREATE OR REPLACE FUNCTION update_conversation_summary()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_conversation_on_message ON public.messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_summary();

-- ==========================================
-- Function to batch get leads with filters
-- ==========================================
CREATE OR REPLACE FUNCTION batch_get_leads(
  p_lead_ids UUID[]
)
RETURNS SETOF public.leads AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.leads
  WHERE id = ANY(p_lead_ids) AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to get conversation messages with pagination
-- ==========================================
CREATE OR REPLACE FUNCTION get_conversation_messages(
  p_conversation_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  sender_id UUID,
  direction public.message_direction,
  type public.message_type,
  content TEXT,
  media_url TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.sender_id,
    m.direction,
    m.type,
    m.content,
    m.media_url,
    m.created_at
  FROM public.messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to get upcoming appointments
-- ==========================================
CREATE OR REPLACE FUNCTION get_upcoming_appointments(
  p_days_ahead INT DEFAULT 7
)
RETURNS TABLE(
  id UUID,
  lead_id UUID,
  lead_name TEXT,
  lead_phone TEXT,
  appointment_date TIMESTAMPTZ,
  title TEXT,
  status TEXT,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.lead_id,
    l.full_name,
    l.phone,
    a.appointment_date,
    a.title,
    a.status,
    a.notes
  FROM public.appointments a
  INNER JOIN public.leads l ON a.lead_id = l.id
  WHERE 
    a.appointment_date BETWEEN now() AND now() + (p_days_ahead || ' days')::INTERVAL
    AND a.status != 'cancelled'
  ORDER BY a.appointment_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to get pending followups for owner
-- ==========================================
CREATE OR REPLACE FUNCTION get_pending_followups(
  p_owner_id UUID DEFAULT NULL,
  p_limit INT DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  lead_id UUID,
  lead_name TEXT,
  lead_phone TEXT,
  title TEXT,
  description TEXT,
  due_date TIMESTAMPTZ,
  type TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.lead_id,
    l.full_name,
    l.phone,
    f.title,
    f.description,
    f.due_date,
    f.type,
    f.created_at
  FROM public.followups f
  INNER JOIN public.leads l ON f.lead_id = l.id
  WHERE 
    f.status = 'pending'
    AND (p_owner_id IS NULL OR f.owner_id = p_owner_id)
  ORDER BY f.due_date ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to move lead between pipeline stages
-- ==========================================
CREATE OR REPLACE FUNCTION move_lead_to_stage(
  p_lead_id UUID,
  p_new_stage_id UUID
)
RETURNS jsonb AS $$
DECLARE
  v_old_stage_id UUID;
  v_lead JSONB;
BEGIN
  -- Get current stage
  SELECT stage_id INTO v_old_stage_id
  FROM public.leads
  WHERE id = p_lead_id;

  -- Update lead stage
  UPDATE public.leads
  SET stage_id = p_new_stage_id
  WHERE id = p_lead_id
  RETURNING to_jsonb(leads.*) INTO v_lead;

  -- Record pipeline event
  INSERT INTO public.pipeline_events (lead_id, from_stage_id, to_stage_id)
  VALUES (p_lead_id, v_old_stage_id, p_new_stage_id);

  RETURN v_lead;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to complete a followup
-- ==========================================
CREATE OR REPLACE FUNCTION complete_followup(
  p_followup_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_followup JSONB;
BEGIN
  UPDATE public.followups
  SET 
    status = 'completed',
    description = COALESCE(p_notes, description)
  WHERE id = p_followup_id
  RETURNING to_jsonb(followups.*) INTO v_followup;

  RETURN v_followup;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function to get lead timeline (messages + events)
-- ==========================================
CREATE OR REPLACE FUNCTION get_lead_timeline(
  p_lead_id UUID,
  p_limit INT DEFAULT 100
)
RETURNS TABLE(
  event_type TEXT,
  event_data JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  -- Get messages
  SELECT 
    'message'::TEXT,
    jsonb_build_object(
      'id', m.id,
      'type', m.type::TEXT,
      'content', m.content,
      'media_url', m.media_url,
      'sender_id', m.sender_id,
      'direction', m.direction::TEXT
    ),
    m.created_at
  FROM public.messages m
  INNER JOIN public.conversations c ON m.conversation_id = c.id
  WHERE c.lead_id = p_lead_id
  
  UNION ALL
  
  -- Get followups
  SELECT 
    'followup'::TEXT,
    jsonb_build_object(
      'id', f.id,
      'title', f.title,
      'status', f.status,
      'type', f.type
    ),
    f.created_at
  FROM public.followups f
  WHERE f.lead_id = p_lead_id
  
  UNION ALL
  
  -- Get appointments
  SELECT 
    'appointment'::TEXT,
    jsonb_build_object(
      'id', a.id,
      'title', a.title,
      'date', a.appointment_date::TEXT,
      'status', a.status
    ),
    a.created_at
  FROM public.appointments a
  WHERE a.lead_id = p_lead_id
  
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
