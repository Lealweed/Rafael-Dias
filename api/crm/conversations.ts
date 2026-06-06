import { createClient } from '@supabase/supabase-js';

type QueryResult<T> = {
  data: T[];
  error: { message?: string; code?: string } | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  type?: string | null;
  content?: string | null;
  created_at?: string | null;
  n8n_message_id?: string | null;
};

type ConversationRow = {
  id: string;
  lead_id?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  summary?: string | null;
};

type LeadRow = {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  origin?: string | null;
  main_interest?: string | null;
  interest?: string | null;
  temperature?: string | null;
  owner?: string | null;
  owner_id?: string | null;
  stage_id?: string | null;
  stage?: string | null;
  notes?: string | null;
  last_interaction_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type UsuarioRow = {
  id: string;
  nome?: string | null;
  full_name?: string | null;
  telefone?: string | null;
  phone?: string | null;
  origem?: string | null;
  origin?: string | null;
  interesse?: string | null;
  interest?: string | null;
  created_at?: string | null;
};

type AppointmentRow = {
  id: string;
  lead_id?: string | null;
  title?: string | null;
  appointment_date?: string | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type FollowupRow = {
  id: string;
  lead_id?: string | null;
  owner_id?: string | null;
  title?: string | null;
  description?: string | null;
  due_date?: string | null;
  status?: string | null;
  type?: string | null;
  created_at?: string | null;
};

type ProfileRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
};

function json(res: any, status: number, payload: any) {
  return res.status(status).json(payload);
}

function normalizePhone(raw: any): string {
  return String(raw || '').split('@')[0].replace(/\D/g, '');
}

function latestDate(...values: any[]) {
  const dates = values
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (!dates.length) return null;
  return new Date(Math.max(...dates.map((date) => date.getTime()))).toISOString();
}

function toIsoOrNull(value: any) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function classifyTemperature(value: any): 'hot' | 'warm' | 'cold' {
  const temp = String(value || '').toLowerCase();
  if (temp === 'hot' || temp === 'quente') return 'hot';
  if (temp === 'warm' || temp === 'morno') return 'warm';
  return 'cold';
}

function trimPreview(value: any, max = 96): string {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function deriveQueueStatus(params: {
  ownerName?: string;
  appointmentDate?: string | null;
  followupDueDate?: string | null;
  temperature: 'hot' | 'warm' | 'cold';
  messageCount: number;
}) {
  const now = Date.now();
  const appointmentTime = params.appointmentDate ? new Date(params.appointmentDate).getTime() : NaN;
  const followupTime = params.followupDueDate ? new Date(params.followupDueDate).getTime() : NaN;

  if (!Number.isNaN(followupTime) && followupTime < now) return 'retorno-atrasado';
  if (!Number.isNaN(followupTime)) return 'retorno-agendado';
  if (!Number.isNaN(appointmentTime) && appointmentTime >= now) return 'agendado';
  if (params.ownerName) return 'humano';
  if (params.temperature === 'hot') return 'prioridade';
  if (params.messageCount <= 1) return 'novo';
  return 'auto';
}

async function safeQuery<T>(promise: PromiseLike<any>): Promise<QueryResult<T>> {
  const { data, error } = await promise;
  return {
    data: Array.isArray(data) ? data : [],
    error: error ? { message: error.message, code: error.code } : null,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return json(res, 500, { ok: false, error: 'Missing Supabase service configuration' });
  }

  const sb = createClient(supabaseUrl, serviceKey);

  const [usuariosResp, leadsResp, convsResp, messagesResp, appointmentsResp, followupsResp, profilesResp] = await Promise.all([
    safeQuery<UsuarioRow>(sb.from('Usuarios').select('*').order('created_at', { ascending: false }).limit(500)),
    safeQuery<LeadRow>(sb.from('leads').select('*').order('updated_at', { ascending: false }).limit(500)),
    safeQuery<ConversationRow>(sb.from('conversations').select('*').order('updated_at', { ascending: false }).limit(500)),
    safeQuery<MessageRow>(sb.from('messages').select('*').order('created_at', { ascending: true }).limit(2000)),
    safeQuery<AppointmentRow>(sb.from('appointments').select('*').order('appointment_date', { ascending: true }).limit(500)),
    safeQuery<FollowupRow>(sb.from('followups').select('*').order('due_date', { ascending: true }).limit(500)),
    safeQuery<ProfileRow>(sb.from('profiles').select('id, full_name, email').limit(500)),
  ]);

  const requiredErrors = [leadsResp.error, convsResp.error, messagesResp.error].filter(Boolean);
  if (requiredErrors.length) {
    return json(res, 500, { ok: false, error: requiredErrors[0]?.message || 'Failed to load conversations data' });
  }

  const profileById = new Map<string, ProfileRow>();
  for (const profile of profilesResp.data || []) {
    profileById.set(profile.id, profile);
  }

  const conversationByLead = new Map<string, ConversationRow>();
  for (const conv of convsResp.data || []) {
    if (!conv.lead_id || conversationByLead.has(conv.lead_id)) continue;
    conversationByLead.set(conv.lead_id, conv);
  }

  const messagesByConversation = new Map<string, MessageRow[]>();
  for (const message of messagesResp.data || []) {
    if (!message.conversation_id) continue;
    const bucket = messagesByConversation.get(message.conversation_id) || [];
    bucket.push(message);
    messagesByConversation.set(message.conversation_id, bucket);
  }

  const nextAppointmentByLead = new Map<string, AppointmentRow>();
  for (const appointment of appointmentsResp.data || []) {
    if (!appointment.lead_id) continue;
    if (String(appointment.status || '').toLowerCase() === 'canceled') continue;
    if (nextAppointmentByLead.has(appointment.lead_id)) continue;
    nextAppointmentByLead.set(appointment.lead_id, appointment);
  }

  const pendingFollowupByLead = new Map<string, FollowupRow>();
  for (const followup of followupsResp.data || []) {
    if (!followup.lead_id) continue;
    const status = String(followup.status || '').toLowerCase();
    if (status && status !== 'pending') continue;
    if (pendingFollowupByLead.has(followup.lead_id)) continue;
    pendingFollowupByLead.set(followup.lead_id, followup);
  }

  const contacts = new Map<string, any>();

  for (const usuario of usuariosResp.data || []) {
    const phone = normalizePhone(usuario.telefone || usuario.phone);
    const key = phone || `usuario:${usuario.id}`;

    contacts.set(key, {
      id: `usuario:${usuario.id}`,
      usuarioId: usuario.id,
      leadId: null,
      conversationId: null,
      name: usuario.nome || usuario.full_name || phone || 'Sem nome',
      phone,
      origin: usuario.origem || usuario.origin || 'n8n / WhatsApp',
      interest: usuario.interesse || usuario.interest || '',
      temperature: 'cold',
      ownerName: '',
      ownerId: null,
      stage: '',
      notes: '',
      lastInteractionAt: latestDate(usuario.created_at),
      createdAt: usuario.created_at || null,
      latestMessage: '',
      latestDirection: 'inbound',
      latestMessageType: 'text',
      latestMessageAt: null,
      summary: '',
      appointment: null,
      nextFollowup: null,
      messages: [],
      source: 'Usuarios',
      queueStatus: 'novo',
      flowChecklist: {
        hasOrigin: Boolean(usuario.origem || usuario.origin),
        hasInterest: Boolean(usuario.interesse || usuario.interest),
        hasTemperature: false,
        hasMessages: false,
        hasAppointment: false,
        hasFollowup: false,
      },
      metrics: {
        messageCount: 0,
        inboundCount: 0,
        outboundCount: 0,
      },
    });
  }

  for (const lead of leadsResp.data || []) {
    const phone = normalizePhone(lead.phone);
    const key = phone || `lead:${lead.id}`;
    const existing = contacts.get(key) || {};
    const conv = conversationByLead.get(lead.id);
    const rawMessages = conv ? messagesByConversation.get(conv.id) || [] : [];
    const normalizedMessages = rawMessages.map((message) => ({
      id: message.id,
      direction: message.direction || 'inbound',
      type: message.type || 'text',
      text: message.content || '',
      createdAt: toIsoOrNull(message.created_at),
      n8nMessageId: message.n8n_message_id || null,
    }));
    const latestMessage = normalizedMessages[normalizedMessages.length - 1] || null;
    const appointment = nextAppointmentByLead.get(lead.id) || null;
    const followup = pendingFollowupByLead.get(lead.id) || null;
    const ownerProfile = lead.owner_id ? profileById.get(lead.owner_id) : null;
    const ownerName = ownerProfile?.full_name || lead.owner || existing.ownerName || '';
    const temperature = classifyTemperature(lead.temperature || existing.temperature);
    const queueStatus = deriveQueueStatus({
      ownerName,
      appointmentDate: appointment?.appointment_date || null,
      followupDueDate: followup?.due_date || null,
      temperature,
      messageCount: normalizedMessages.length,
    });

    contacts.set(key, {
      ...existing,
      id: lead.id,
      usuarioId: existing.usuarioId || null,
      leadId: lead.id,
      conversationId: conv?.id || null,
      name: lead.full_name || existing.name || phone || 'Sem nome',
      phone: phone || existing.phone || '',
      origin: lead.origin || existing.origin || 'WhatsApp',
      interest: lead.main_interest || lead.interest || existing.interest || '',
      temperature,
      ownerName,
      ownerId: lead.owner_id || null,
      stage: lead.stage || existing.stage || '',
      notes: lead.notes || existing.notes || '',
      lastInteractionAt: latestDate(
        lead.last_interaction_at,
        lead.updated_at,
        conv?.updated_at,
        latestMessage?.createdAt,
        appointment?.appointment_date,
        existing.lastInteractionAt,
      ),
      createdAt: latestDate(lead.created_at, existing.createdAt),
      latestMessage: latestMessage?.text || existing.latestMessage || '',
      latestDirection: latestMessage?.direction || existing.latestDirection || 'inbound',
      latestMessageType: latestMessage?.type || existing.latestMessageType || 'text',
      latestMessageAt: latestMessage?.createdAt || null,
      summary: conv?.summary || '',
      appointment: appointment
        ? {
            id: appointment.id,
            title: appointment.title || 'Agendamento',
            status: appointment.status || 'scheduled',
            date: toIsoOrNull(appointment.appointment_date),
            notes: appointment.notes || '',
          }
        : null,
      nextFollowup: followup
        ? {
            id: followup.id,
            title: followup.title || 'Retorno',
            description: followup.description || '',
            dueDate: toIsoOrNull(followup.due_date),
            status: followup.status || 'pending',
            type: followup.type || '',
            ownerName: followup.owner_id ? profileById.get(followup.owner_id)?.full_name || '' : ownerName,
          }
        : null,
      messages: normalizedMessages,
      source: existing.usuarioId ? 'Usuarios + leads' : 'leads',
      queueStatus,
      flowChecklist: {
        hasOrigin: Boolean(lead.origin || existing.origin),
        hasInterest: Boolean(lead.main_interest || lead.interest || existing.interest),
        hasTemperature: Boolean(lead.temperature),
        hasMessages: normalizedMessages.length > 0,
        hasAppointment: Boolean(appointment),
        hasFollowup: Boolean(followup),
      },
      metrics: {
        messageCount: normalizedMessages.length,
        inboundCount: normalizedMessages.filter((message) => message.direction === 'inbound').length,
        outboundCount: normalizedMessages.filter((message) => message.direction === 'outbound').length,
      },
    });
  }

  const data = Array.from(contacts.values())
    .sort((a, b) => {
      const ta = new Date(a.lastInteractionAt || a.createdAt || 0).getTime();
      const tb = new Date(b.lastInteractionAt || b.createdAt || 0).getTime();
      return tb - ta;
    })
    .map((contact) => ({
      ...contact,
      latestMessagePreview: trimPreview(contact.latestMessage || ''),
      channel: 'whatsapp',
    }));

  const summary = {
    total: data.length,
    withMessages: data.filter((item) => item.metrics.messageCount > 0).length,
    withAppointments: data.filter((item) => item.appointment).length,
    withPendingFollowup: data.filter((item) => item.nextFollowup).length,
    assignedToHuman: data.filter((item) => item.ownerName).length,
    hotLeads: data.filter((item) => item.temperature === 'hot').length,
    missingStructuredFields: data.filter((item) => !item.flowChecklist.hasInterest || !item.flowChecklist.hasTemperature).length,
  };

  const diagnostics = {
    optionalWarnings: [appointmentsResp.error, followupsResp.error, profilesResp.error, usuariosResp.error]
      .filter(Boolean)
      .map((error) => error?.message),
    sourceCounts: {
      usuarios: usuariosResp.data.length,
      leads: leadsResp.data.length,
      conversations: convsResp.data.length,
      messages: messagesResp.data.length,
      appointments: appointmentsResp.data.length,
      followups: followupsResp.data.length,
      profiles: profilesResp.data.length,
    },
  };

  return json(res, 200, { ok: true, contacts: data, summary, diagnostics });
}
