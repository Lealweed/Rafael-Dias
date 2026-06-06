import { createClient } from '@supabase/supabase-js';

export function getServiceSupabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey);
}

export function normalizePhone(raw: any): string {
  if (!raw) return '';
  const base = String(raw).split('@')[0].trim();
  if (/^https?:\/\//i.test(base)) return '';
  return base.replace(/\D/g, '');
}

function normalizeLeadRecord(data: any) {
  return {
    id: data.id,
    phone: data.phone || null,
    full_name: data.full_name || null,
    conversation_status: data.conversation_status || 'novo',
    owner_id: data.owner_id || null,
    owner_name: data.owner_name || null,
    next_followup_at: data.next_followup_at || null,
    calendar_event_id: data.calendar_event_id || null,
    last_appointment_at: data.last_appointment_at || null,
    appointment_status: data.appointment_status || 'scheduled',
    appointment_confirmed_at: data.appointment_confirmed_at || null,
    last_confirmation_sent_at: data.last_confirmation_sent_at || null,
    last_reminder_sent_at: data.last_reminder_sent_at || null,
    last_no_show_check_sent_at: data.last_no_show_check_sent_at || null,
    automation_status: data.automation_status || 'active',
    automation_paused_at: data.automation_paused_at || null,
    automation_resumed_at: data.automation_resumed_at || null,
    automation_paused_by: data.automation_paused_by || null,
    updated_at: data.updated_at || null,
  };
}

async function findLeadByPhone(phone: string) {
  const supabase = getServiceSupabase();
  if (!supabase) return { ok: false as const, reason: 'missing_supabase_service_role' };

  const normalized = normalizePhone(phone);
  if (!normalized) return { ok: false as const, reason: 'missing_phone' };

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('phone', normalized)
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false as const, reason: 'query_failed', error };
  if (!data?.id) return { ok: false as const, reason: 'lead_not_found' };

  return { ok: true as const, lead: normalizeLeadRecord(data) };
}

async function createLeadFromLegacy(phone: string, name?: string | null) {
  const supabase = getServiceSupabase();
  if (!supabase) return { ok: false as const, reason: 'missing_supabase_service_role' };

  const normalized = normalizePhone(phone);
  if (!normalized) return { ok: false as const, reason: 'missing_phone' };

  let leadName = String(name || '').trim();

  let legacyLookup: any = { data: null, error: null };
  try {
    legacyLookup = await supabase
      .from('Usuarios')
      .select('id, nome, telefone')
      .eq('telefone', normalized)
      .limit(1)
      .maybeSingle();
  } catch {
    legacyLookup = { data: null, error: null };
  }

  if (!leadName && legacyLookup?.data?.nome) {
    leadName = String(legacyLookup.data.nome).trim();
  }

  const { data, error } = await supabase
    .from('leads')
    .insert({
      full_name: leadName || normalized,
      phone: normalized,
      origin: 'n8n Webhook',
      temperature: 'cold',
      conversation_status: 'novo',
      last_interaction_at: new Date().toISOString(),
      automation_status: 'active',
    })
    .select('*')
    .single();

  if (error) return { ok: false as const, reason: 'insert_failed', error };
  return { ok: true as const, lead: normalizeLeadRecord(data) };
}

export async function ensureLeadByPhone(params: { phone: string; name?: string | null }) {
  const found = await findLeadByPhone(params.phone);
  if (found.ok) return found;
  if (found.reason !== 'lead_not_found') return found;
  return createLeadFromLegacy(params.phone, params.name);
}

export async function ensureConversationForLead(leadId: string) {
  const supabase = getServiceSupabase();
  if (!supabase) return { ok: false as const, reason: 'missing_supabase_service_role' };

  const existing = await supabase
    .from('conversations')
    .select('id')
    .eq('lead_id', leadId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.error) return { ok: false as const, reason: 'query_failed', error: existing.error };
  if (existing.data?.id) return { ok: true as const, conversationId: existing.data.id };

  const created = await supabase
    .from('conversations')
    .insert({ lead_id: leadId })
    .select('id')
    .single();

  if (created.error) return { ok: false as const, reason: 'insert_failed', error: created.error };
  return { ok: true as const, conversationId: created.data.id };
}

export async function appendConversationMessage(params: {
  leadId: string;
  direction: 'inbound' | 'outbound';
  content: string;
  type?: string;
  source?: 'customer' | 'human' | 'agent' | 'system';
  n8nMessageId?: string | null;
}) {
  const supabase = getServiceSupabase();
  if (!supabase) return { ok: false as const, reason: 'missing_supabase_service_role' };

  const conversation = await ensureConversationForLead(params.leadId);
  if (!conversation.ok) return conversation;

  const { error } = await supabase.from('messages').insert({
    conversation_id: conversation.conversationId,
    direction: params.direction,
    type: params.type || 'text',
    source: params.source || (params.direction === 'inbound' ? 'customer' : 'agent'),
    content: params.content,
    n8n_message_id: params.n8nMessageId || null,
  });

  if (error) return { ok: false as const, reason: 'insert_failed', error };

  await supabase
    .from('leads')
    .update({ last_interaction_at: new Date().toISOString() })
    .eq('id', params.leadId);

  return { ok: true as const, conversationId: conversation.conversationId };
}

export async function appendSystemMessage(params: { leadId: string; content: string }) {
  return appendConversationMessage({
    leadId: params.leadId,
    direction: 'outbound',
    type: 'system',
    source: 'system',
    content: params.content,
    n8nMessageId: `system_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  });
}

export async function updateLeadOps(params: {
  leadId: string;
  conversationStatus?: string | null;
  ownerId?: string | null;
  ownerName?: string | null;
  nextFollowupAt?: string | null;
  calendarEventId?: string | null;
  lastAppointmentAt?: string | null;
  appointmentStatus?: string | null;
  appointmentConfirmedAt?: string | null;
  lastConfirmationSentAt?: string | null;
  lastReminderSentAt?: string | null;
  lastNoShowCheckSentAt?: string | null;
}) {
  const supabase = getServiceSupabase();
  if (!supabase) return { ok: false as const, reason: 'missing_supabase_service_role' };

  const patch: Record<string, any> = {};

  if (params.conversationStatus !== undefined) patch.conversation_status = params.conversationStatus;
  if (params.ownerId !== undefined) patch.owner_id = params.ownerId;
  if (params.ownerName !== undefined) patch.owner_name = params.ownerName;
  if (params.nextFollowupAt !== undefined) patch.next_followup_at = params.nextFollowupAt;
  if (params.calendarEventId !== undefined) patch.calendar_event_id = params.calendarEventId;
  if (params.lastAppointmentAt !== undefined) patch.last_appointment_at = params.lastAppointmentAt;
  if (params.appointmentStatus !== undefined) patch.appointment_status = params.appointmentStatus;
  if (params.appointmentConfirmedAt !== undefined) patch.appointment_confirmed_at = params.appointmentConfirmedAt;
  if (params.lastConfirmationSentAt !== undefined) patch.last_confirmation_sent_at = params.lastConfirmationSentAt;
  if (params.lastReminderSentAt !== undefined) patch.last_reminder_sent_at = params.lastReminderSentAt;
  if (params.lastNoShowCheckSentAt !== undefined) patch.last_no_show_check_sent_at = params.lastNoShowCheckSentAt;

  if (Object.keys(patch).length === 0) {
    return { ok: false as const, reason: 'empty_patch' };
  }

  const { data, error } = await supabase
    .from('leads')
    .update(patch)
    .eq('id', params.leadId)
    .select('*')
    .maybeSingle();

  if (error) return { ok: false as const, reason: 'update_failed', error };
  if (!data?.id) return { ok: false as const, reason: 'lead_not_found' };

  return { ok: true as const, lead: normalizeLeadRecord(data) };
}

export async function logIntegrationEvent(params: {
  eventId: string;
  eventType: string;
  direction: 'inbound' | 'outbound';
  payload: any;
  status?: 'pending' | 'success' | 'failed';
  errorMessage?: string | null;
}) {
  const supabase = getServiceSupabase();
  if (!supabase) return { ok: false as const, reason: 'missing_supabase_service_role' };

  const { error } = await supabase.from('integration_events').insert({
    event_id: params.eventId,
    event_type: params.eventType,
    direction: params.direction,
    payload: params.payload,
    status: params.status || 'success',
    error_message: params.errorMessage || null,
    processed_at: new Date().toISOString(),
  });

  if (error?.code === '23505') {
    return { ok: true as const, duplicated: true };
  }

  if (error) return { ok: false as const, reason: 'insert_failed', error };
  return { ok: true as const, duplicated: false };
}
