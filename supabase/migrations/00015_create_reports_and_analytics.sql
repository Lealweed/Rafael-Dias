-- 00015_create_reports_and_analytics.sql

-- ==========================================
-- View: Lead Performance Report
-- ==========================================
DROP VIEW IF EXISTS public.lead_performance_report;
CREATE VIEW public.lead_performance_report AS
SELECT 
  l.id,
  l.full_name,
  l.phone,
  l.temperature,
  l.conversation_status,
  l.owner_name,
  COUNT(DISTINCT m.id) as total_messages,
  COUNT(DISTINCT CASE WHEN m.type = 'image' THEN m.id END) as image_messages,
  COUNT(DISTINCT a.id) as total_appointments,
  COUNT(DISTINCT CASE WHEN a.status = 'confirmed' THEN a.id END) as confirmed_appointments,
  COUNT(DISTINCT CASE WHEN a.status = 'no_show' THEN a.id END) as no_show_count,
  MAX(m.created_at) as last_message_at,
  MAX(a.appointment_date) as next_appointment_at,
  l.created_at,
  l.updated_at
FROM public.leads l
LEFT JOIN public.conversations c ON l.id = c.lead_id
LEFT JOIN public.messages m ON c.id = m.conversation_id
LEFT JOIN public.appointments a ON l.id = a.lead_id
GROUP BY l.id, l.full_name, l.phone, l.temperature, l.conversation_status, l.owner_name, l.created_at, l.updated_at;

-- ==========================================
-- View: Owner Performance Dashboard
-- ==========================================
DROP VIEW IF EXISTS public.owner_performance;
CREATE VIEW public.owner_performance AS
SELECT 
  p.id as owner_id,
  p.full_name as owner_name,
  COUNT(DISTINCT l.id) as total_leads,
  COUNT(DISTINCT CASE WHEN l.temperature = 'hot' THEN l.id END) as hot_leads,
  COUNT(DISTINCT CASE WHEN l.temperature = 'warm' THEN l.id END) as warm_leads,
  COUNT(DISTINCT CASE WHEN l.temperature = 'cold' THEN l.id END) as cold_leads,
  COUNT(DISTINCT CASE WHEN a.status = 'confirmed' THEN a.id END) as confirmed_appointments,
  COUNT(DISTINCT CASE WHEN f.status = 'pending' THEN f.id END) as pending_followups,
  COUNT(DISTINCT CASE WHEN a.status = 'no_show' THEN a.id END) as no_shows,
  ROUND(
    COUNT(DISTINCT CASE WHEN a.status = 'confirmed' THEN a.id END)::NUMERIC / 
    NULLIF(COUNT(DISTINCT a.id), 0) * 100, 2
  ) as conversion_rate
FROM public.profiles p
LEFT JOIN public.leads l ON p.id = l.owner_id AND l.deleted_at IS NULL
LEFT JOIN public.appointments a ON l.id = a.lead_id
LEFT JOIN public.followups f ON l.id = f.lead_id
WHERE p.role = 'agent'
GROUP BY p.id, p.full_name;

-- ==========================================
-- View: Pipeline Overview
-- ==========================================
DROP VIEW IF EXISTS public.pipeline_overview;
CREATE VIEW public.pipeline_overview AS
SELECT 
  ps.id as stage_id,
  ps.name as stage_name,
  ps.tto_order,
  ps.color,
  COUNT(DISTINCT l.id) as leads_count,
  COUNT(DISTINCT CASE WHEN l.temperature = 'hot' THEN l.id END) as hot_count,
  COUNT(DISTINCT CASE WHEN l.temperature = 'warm' THEN l.id END) as warm_count,
  COUNT(DISTINCT CASE WHEN l.temperature = 'cold' THEN l.id END) as cold_count,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (NOW() - l.created_at)) / 86400)::NUMERIC, 1
  ) as avg_days_in_stage
FROM public.pipeline_stages ps
LEFT JOIN public.leads l ON ps.id = l.stage_id AND l.deleted_at IS NULL
GROUP BY ps.id, ps.name, ps.tto_order, ps.color
ORDER BY ps.tto_order;

-- ==========================================
-- View: Conversation Activity
-- ==========================================
DROP VIEW IF EXISTS public.conversation_activity;
CREATE VIEW public.conversation_activity AS
SELECT 
  c.lead_id,
  l.full_name,
  l.phone,
  c.id as conversation_id,
  COUNT(DISTINCT m.id) as message_count,
  COUNT(DISTINCT CASE WHEN m.type = 'text' THEN m.id END) as text_count,
  COUNT(DISTINCT CASE WHEN m.type = 'image' THEN m.id END) as image_count,
  COUNT(DISTINCT CASE WHEN m.direction = 'inbound' THEN m.id END) as inbound_count,
  COUNT(DISTINCT CASE WHEN m.direction = 'outbound' THEN m.id END) as outbound_count,
  MIN(m.created_at) as first_message_at,
  MAX(m.created_at) as last_message_at,
  ROUND(
    EXTRACT(EPOCH FROM (MAX(m.created_at) - MIN(m.created_at))) / 3600
  ) as conversation_duration_hours
FROM public.conversations c
LEFT JOIN public.leads l ON c.lead_id = l.id
LEFT JOIN public.messages m ON c.id = m.conversation_id
GROUP BY c.id, c.lead_id, l.full_name, l.phone;

-- ==========================================
-- View: Patient Records Summary
-- ==========================================
DROP VIEW IF EXISTS public.patient_records_summary;
CREATE VIEW public.patient_records_summary AS
SELECT 
  pr.id as record_id,
  l.id as lead_id,
  l.full_name as patient_name,
  l.phone,
  jsonb_array_length(COALESCE(pr.before_after_photos, '[]'::jsonb)) as photo_count,
  pr.evolution_notes,
  pr.post_recommendations,
  COUNT(DISTINCT pf.id) as financial_records_count,
  SUM(pf.total_value) as total_spent,
  pr.created_at,
  pr.updated_at
FROM public.patient_records pr
LEFT JOIN public.leads l ON pr.lead_id = l.id
LEFT JOIN public.patient_financials pf ON l.id = pf.lead_id
GROUP BY pr.id, l.id, l.full_name, l.phone, pr.before_after_photos, pr.evolution_notes, pr.post_recommendations, pr.created_at, pr.updated_at;

-- ==========================================
-- View: Appointment Status Summary
-- ==========================================
DROP VIEW IF EXISTS public.appointment_status_summary;
CREATE VIEW public.appointment_status_summary AS
SELECT 
  a.status,
  COUNT(*) as count,
  ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM public.appointments) * 100, 1) as percentage,
  MIN(a.appointment_date) as earliest_date,
  MAX(a.appointment_date) as latest_date
FROM public.appointments a
GROUP BY a.status
ORDER BY count DESC;

-- ==========================================
-- View: Notification Activity
-- ==========================================
DROP VIEW IF EXISTS public.notification_activity;
CREATE VIEW public.notification_activity AS
SELECT 
  n.recipient_id,
  l.full_name as recipient_name,
  l.phone,
  COUNT(*) as total_notifications,
  COUNT(CASE WHEN n.read = false THEN 1 END) as unread_count,
  COUNT(CASE WHEN n.read = true THEN 1 END) as read_count,
  ROUND(
    COUNT(CASE WHEN n.read = true THEN 1 END)::NUMERIC / COUNT(*) * 100, 1
  ) as read_percentage,
  MAX(n.created_at) as last_notification_at
FROM public.notifications n
LEFT JOIN public.leads l ON n.recipient_id = l.id
GROUP BY n.recipient_id, l.full_name, l.phone;

-- ==========================================
-- Function: Get date range report
-- ==========================================
CREATE OR REPLACE FUNCTION get_activity_report(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  metric_name TEXT,
  metric_value NUMERIC,
  metric_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'New Leads'::TEXT,
    COUNT(DISTINCT l.id)::NUMERIC,
    l.created_at::DATE
  FROM public.leads l
  WHERE l.created_at::DATE BETWEEN p_start_date AND p_end_date
  GROUP BY l.created_at::DATE
  
  UNION ALL
  
  SELECT 
    'Confirmed Appointments'::TEXT,
    COUNT(DISTINCT a.id)::NUMERIC,
    a.appointment_date::DATE
  FROM public.appointments a
  WHERE 
    a.appointment_date::DATE BETWEEN p_start_date AND p_end_date
    AND a.status = 'confirmed'
  GROUP BY a.appointment_date::DATE
  
  UNION ALL
  
  SELECT 
    'Messages Sent'::TEXT,
    COUNT(DISTINCT m.id)::NUMERIC,
    m.created_at::DATE
  FROM public.messages m
  WHERE 
    m.created_at::DATE BETWEEN p_start_date AND p_end_date
    AND m.direction = 'outbound'
  GROUP BY m.created_at::DATE
  
  ORDER BY metric_date DESC, metric_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- Function: Get top performers
-- ==========================================
CREATE OR REPLACE FUNCTION get_top_performers(
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  owner_id UUID,
  owner_name TEXT,
  total_leads INT,
  confirmed_appointments INT,
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    COUNT(DISTINCT l.id)::INT,
    COUNT(DISTINCT CASE WHEN a.status = 'confirmed' THEN a.id END)::INT,
    ROUND(
      COUNT(DISTINCT CASE WHEN a.status = 'confirmed' THEN a.id END)::NUMERIC / 
      NULLIF(COUNT(DISTINCT a.id), 0) * 100, 2
    )
  FROM public.profiles p
  LEFT JOIN public.leads l ON p.id = l.owner_id AND l.deleted_at IS NULL
  LEFT JOIN public.appointments a ON l.id = a.lead_id
  WHERE p.role = 'agent'
  GROUP BY p.id, p.full_name
  ORDER BY COUNT(DISTINCT CASE WHEN a.status = 'confirmed' THEN a.id END) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions on views
GRANT SELECT ON public.lead_performance_report TO authenticated;
GRANT SELECT ON public.owner_performance TO authenticated;
GRANT SELECT ON public.pipeline_overview TO authenticated;
GRANT SELECT ON public.conversation_activity TO authenticated;
GRANT SELECT ON public.patient_records_summary TO authenticated;
GRANT SELECT ON public.appointment_status_summary TO authenticated;
GRANT SELECT ON public.notification_activity TO authenticated;
GRANT SELECT ON public.daily_report TO authenticated;

GRANT EXECUTE ON FUNCTION get_activity_report(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_performers(INT) TO authenticated;
