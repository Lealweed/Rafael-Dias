import { appendSystemMessage, ensureLeadByPhone, getServiceSupabase, normalizePhone } from './crm.js';

export type AutomationStatus = 'active' | 'paused_human' | 'waiting_response' | 'followup_scheduled' | 'handoff_requested';
export type MessageSource = 'agent' | 'human';

function automationStatusSystemMessage(status: AutomationStatus) {
  switch (status) {
    case 'paused_human':
      return 'Atendimento humano assumido. Automacao pausada.';
    case 'waiting_response':
      return 'Aguardando resposta do cliente. Automacao em espera.';
    case 'followup_scheduled':
      return 'Follow-up agendado para este contato.';
    case 'handoff_requested':
      return 'Cliente solicitou atendimento humano. Handoff pendente.';
    default:
      return 'Automacao ativa.';
  }
}

export async function findLeadByIdOrPhone(params: { leadId?: string | null; phone?: string | null }) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return { ok: false as const, reason: 'missing_supabase_service_role' };
  }

  const leadId = String(params.leadId || '').trim();
  const phone = normalizePhone(params.phone);

  if (!leadId && !phone) {
    return { ok: false as const, reason: 'missing_lead_reference' };
  }

  let query = supabase
    .from('leads')
    .select('*')
    .limit(1);

  if (leadId) {
    query = query.eq('id', leadId);
  } else {
    query = query.like('phone', `%${phone.slice(-8)}`);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return { ok: false as const, reason: 'query_failed', error };
  }

  if (!data?.id && phone) {
    return ensureLeadByPhone({ phone });
  }

  if (!data?.id) {
    return { ok: false as const, reason: 'lead_not_found' };
  }

  return {
    ok: true as const,
    lead: {
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
    },
  };
}

export async function getLeadAutomationState(leadId: string) {
  return findLeadByIdOrPhone({ leadId });
}

export async function setLeadAutomationState(params: {
  leadId?: string | null;
  phone?: string | null;
  status: AutomationStatus;
  pausedBy?: string | null;
}) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return { ok: false as const, reason: 'missing_supabase_service_role' };
  }

  const lead = await findLeadByIdOrPhone({ leadId: params.leadId, phone: params.phone });
  if (!lead.ok) {
    return lead;
  }
  const previousStatus = lead.lead.automation_status || 'active';

  const patch: Record<string, any> = {
    automation_status: params.status,
  };

  if (params.status === 'paused_human') {
    patch.automation_paused_at = new Date().toISOString();
    patch.automation_paused_by = params.pausedBy || null;
  } else if (params.status === 'active') {
    patch.automation_resumed_at = new Date().toISOString();
    patch.automation_paused_by = null;
  }

  const { data, error } = await supabase
    .from('leads')
    .update(patch)
    .eq('id', lead.lead.id)
    .select('*')
    .maybeSingle();

  if (error) {
    return { ok: false as const, reason: 'update_failed', error };
  }

  if (!data?.id) {
    return { ok: false as const, reason: 'lead_not_found' };
  }

  if (previousStatus !== params.status) {
    await appendSystemMessage({
      leadId: data.id,
      content: automationStatusSystemMessage(params.status),
    });
  }

  return {
    ok: true as const,
    lead: {
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
    },
  };
}
