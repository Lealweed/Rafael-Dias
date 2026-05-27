import { createClient } from '@supabase/supabase-js';

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

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return json(res, 500, { ok: false, error: 'Missing Supabase service configuration' });
  }

  const sb = createClient(supabaseUrl, serviceKey);

  const [usuariosResp, leadsResp, convsResp, messagesResp] = await Promise.all([
    sb.from('Usuarios').select('*').order('created_at', { ascending: false }).limit(200),
    sb.from('leads').select('*').order('updated_at', { ascending: false }).limit(200),
    sb.from('conversations').select('*').order('updated_at', { ascending: false }).limit(500),
    sb.from('messages').select('*').order('created_at', { ascending: true }).limit(1000),
  ]);

  const errors = [usuariosResp.error, leadsResp.error, convsResp.error, messagesResp.error].filter(Boolean);
  if (errors.length) {
    return json(res, 500, { ok: false, error: errors[0].message });
  }

  const contacts = new Map<string, any>();
  const conversationByLead = new Map<string, any>();
  const messagesByConversation = new Map<string, any[]>();

  for (const conv of convsResp.data || []) {
    if (conv.lead_id) conversationByLead.set(conv.lead_id, conv);
  }

  for (const message of messagesResp.data || []) {
    if (!message.conversation_id) continue;
    const bucket = messagesByConversation.get(message.conversation_id) || [];
    bucket.push({
      id: message.id,
      type: message.direction,
      text: message.content || '',
      messageType: message.type || 'text',
      createdAt: message.created_at,
      n8nMessageId: message.n8n_message_id,
    });
    messagesByConversation.set(message.conversation_id, bucket);
  }

  for (const usuario of usuariosResp.data || []) {
    const phone = normalizePhone(usuario.telefone || usuario.phone);
    const key = phone || `usuario:${usuario.id}`;
    contacts.set(key, {
      id: usuario.id,
      usuarioId: usuario.id,
      leadId: null,
      name: usuario.nome || usuario.full_name || phone || 'Contato',
      phone,
      origin: usuario.origem || usuario.origin || 'n8n / WhatsApp',
      lastInteractionAt: latestDate(usuario.created_at),
      messages: [],
      source: 'Usuarios',
    });
  }

  for (const lead of leadsResp.data || []) {
    const phone = normalizePhone(lead.phone);
    const key = phone || `lead:${lead.id}`;
    const existing = contacts.get(key) || {};
    const conv = conversationByLead.get(lead.id);
    const messages = conv ? messagesByConversation.get(conv.id) || [] : [];

    contacts.set(key, {
      ...existing,
      id: lead.id,
      usuarioId: existing.usuarioId || null,
      leadId: lead.id,
      conversationId: conv?.id || null,
      name: lead.full_name || existing.name || phone || 'Contato',
      phone: phone || existing.phone || '',
      origin: lead.origin || existing.origin || 'WhatsApp',
      interest: lead.main_interest || existing.interest || '',
      temperature: lead.temperature || existing.temperature || 'cold',
      lastInteractionAt: latestDate(
        lead.last_interaction_at,
        lead.updated_at,
        conv?.updated_at,
        messages[messages.length - 1]?.createdAt,
        existing.lastInteractionAt,
      ),
      messages,
      source: existing.usuarioId ? 'Usuarios + leads' : 'leads',
    });
  }

  const data = Array.from(contacts.values()).sort((a, b) => {
    const ta = new Date(a.lastInteractionAt || 0).getTime();
    const tb = new Date(b.lastInteractionAt || 0).getTime();
    return tb - ta;
  });

  return json(res, 200, { ok: true, contacts: data });
}
