import { getServiceSupabase, logIntegrationEvent, updateLeadOps, isAuthorizedRequest } from '../_lib/crm.js';

const DUE_PHASES = ['confirmation_request', 'reminder_day_of', 'missed_followup'] as const;
const STATUS_VALUES = ['scheduled', 'pending_confirmation', 'confirmed', 'completed', 'no_show', 'canceled', 'rescheduled'] as const;

type DuePhase = (typeof DUE_PHASES)[number];
type AppointmentStatus = (typeof STATUS_VALUES)[number];

function json(res: any, status: number, payload: any) {
  return res.status(status).json(payload);
}

function formatAppointmentTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function firstNameOf(name?: string | null, phone?: string | null) {
  const base = String(name || '').trim();
  if (base) return base.split(/\s+/)[0];
  return String(phone || 'você').trim() || 'você';
}

function buildHumanizedMessage(lead: any, phase: DuePhase) {
  const firstName = firstNameOf(lead.full_name, lead.phone);
  const when = formatAppointmentTime(lead.last_appointment_at);

  if (phase === 'confirmation_request') {
    return `Oi, ${firstName}. Passando com carinho para confirmar sua consulta de amanhã, às ${when.split(' ')[1] || when}, no Instituto Rafael Dias. Se estiver tudo certo, me responde com um "confirmado" e eu deixo tudo alinhado por aqui.`;
  }

  if (phase === 'reminder_day_of') {
    return `Oi, ${firstName}. Só passando para te lembrar da sua consulta hoje, às ${when.split(' ')[1] || when}, no Instituto Rafael Dias. Se surgir qualquer imprevisto ou precisar de apoio com localização, me avisa por aqui.`;
  }

  return `Oi, ${firstName}. Vi que seu horário estava reservado para hoje às ${when.split(' ')[1] || when} e quis te chamar com cuidado para saber se aconteceu algum imprevisto. Se quiser, eu posso te ajudar a remarcar com tranquilidade.`;
}

function toMillis(value?: string | null) {
  if (!value) return NaN;
  return new Date(value).getTime();
}

function isDuePhase(lead: any, now: number): DuePhase | null {
  if (!lead?.calendar_event_id || !lead?.last_appointment_at) return null;

  const appointmentAt = toMillis(lead.last_appointment_at);
  if (!Number.isFinite(appointmentAt)) return null;

  const status = String(lead.appointment_status || 'scheduled').toLowerCase();
  if (status === 'completed' || status === 'canceled' || status === 'rescheduled') return null;

  const diffMinutes = Math.round((appointmentAt - now) / 60000);

  if (
    diffMinutes >= 18 * 60 &&
    diffMinutes <= 30 * 60 &&
    !lead.last_confirmation_sent_at &&
    status === 'scheduled'
  ) {
    return 'confirmation_request';
  }

  if (
    diffMinutes >= 60 &&
    diffMinutes <= 180 &&
    !lead.last_reminder_sent_at &&
    (status === 'scheduled' || status === 'pending_confirmation' || status === 'confirmed')
  ) {
    return 'reminder_day_of';
  }

  if (
    diffMinutes <= -45 &&
    diffMinutes >= -(6 * 60) &&
    !lead.last_no_show_check_sent_at &&
    status !== 'completed' &&
    status !== 'canceled'
  ) {
    return 'missed_followup';
  }

  return null;
}

function normalizeDueLead(lead: any, phase: DuePhase) {
  return {
    leadId: lead.id,
    phone: lead.phone || null,
    full_name: lead.full_name || null,
    owner_name: lead.owner_name || null,
    calendar_event_id: lead.calendar_event_id || null,
    appointment_at: lead.last_appointment_at || null,
    appointment_status: lead.appointment_status || 'scheduled',
    phase,
    recommended_message: buildHumanizedMessage(lead, phase),
    outbound_payload: {
      contactId: lead.id,
      destination: lead.phone || null,
      message: buildHumanizedMessage(lead, phase),
      type: 'text',
      source: 'agent',
    },
  };
}

async function markPhaseSent(leadId: string, phase: DuePhase) {
  const nowIso = new Date().toISOString();
  const patch: Record<string, string | null> = {};

  if (phase === 'confirmation_request') {
    patch.lastConfirmationSentAt = nowIso;
    patch.appointmentStatus = 'pending_confirmation';
  }
  if (phase === 'reminder_day_of') {
    patch.lastReminderSentAt = nowIso;
  }
  if (phase === 'missed_followup') {
    patch.lastNoShowCheckSentAt = nowIso;
  }

  return updateLeadOps({
    leadId,
    appointmentStatus: patch.appointmentStatus ?? undefined,
    lastConfirmationSentAt: patch.lastConfirmationSentAt ?? undefined,
    lastReminderSentAt: patch.lastReminderSentAt ?? undefined,
    lastNoShowCheckSentAt: patch.lastNoShowCheckSentAt ?? undefined,
  });
}

export default async function handler(req: any, res: any) {
  const allowed = await isAuthorizedRequest(req);
  if (!allowed) {
    return json(res, 401, { ok: false, error: 'Unauthorized' });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return json(res, 500, { ok: false, error: 'missing_supabase_service_role' });
  }

  if (req.method === 'GET') {
    const now = req.query?.now ? new Date(String(req.query.now)).getTime() : Date.now();
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .not('calendar_event_id', 'is', null)
      .not('last_appointment_at', 'is', null)
      .order('last_appointment_at', { ascending: true })
      .limit(200);

    if (error) {
      return json(res, 500, { ok: false, error: 'query_failed' });
    }

    const due = (data || [])
      .map((lead: any) => {
        const phase = isDuePhase(lead, now);
        return phase ? normalizeDueLead(lead, phase) : null;
      })
      .filter(Boolean);

    return json(res, 200, {
      ok: true,
      count: due.length,
      due,
      generatedAt: new Date(now).toISOString(),
    });
  }

  if (req.method === 'POST') {
    const leadId = String(req.body?.leadId || '').trim();
    const phase = String(req.body?.phase || '').trim() as DuePhase;
    const event = String(req.body?.event || '').trim().toLowerCase();

    if (!leadId) {
      return json(res, 400, { ok: false, error: 'Missing required field: leadId' });
    }

    if (event === 'sent') {
      if (!DUE_PHASES.includes(phase)) {
        return json(res, 400, { ok: false, error: 'Invalid phase' });
      }

      const result = await markPhaseSent(leadId, phase);
      if (!result.ok) {
        return json(res, 500, { ok: false, error: result.reason });
      }

      await logIntegrationEvent({
        eventId: `appointment_${phase}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        eventType: `appointment_${phase}_sent`,
        direction: 'outbound',
        payload: { leadId, phase },
        status: 'success',
      });

      return json(res, 200, { ok: true, lead: result.lead });
    }

    if (STATUS_VALUES.includes(event as AppointmentStatus)) {
      const patch = await updateLeadOps({
        leadId,
        appointmentStatus: event as AppointmentStatus,
        appointmentConfirmedAt: event === 'confirmed' ? new Date().toISOString() : undefined,
      });

      if (!patch.ok) {
        return json(res, 500, { ok: false, error: patch.reason });
      }

      await logIntegrationEvent({
        eventId: `appointment_status_${event}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        eventType: `appointment_status_${event}`,
        direction: 'inbound',
        payload: { leadId, status: event },
        status: 'success',
      });

      return json(res, 200, { ok: true, lead: patch.lead });
    }

    return json(res, 400, {
      ok: false,
      error: 'Invalid event. Use sent or one of scheduled, pending_confirmation, confirmed, completed, no_show, canceled, rescheduled.',
    });
  }

  return json(res, 405, { ok: false, error: 'Method not allowed' });
}
