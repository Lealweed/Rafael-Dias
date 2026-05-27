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

function classifyTemperature(value: any) {
  const temp = String(value || '').toLowerCase();
  if (temp === 'hot' || temp === 'quente') return 'hot';
  if (temp === 'warm' || temp === 'morno') return 'warm';
  return 'cold';
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
    sb.from('Usuarios').select('*').order('created_at', { ascending: false }).limit(500),
    sb.from('leads').select('*').order('updated_at', { ascending: false }).limit(500),
    sb.from('conversations').select('*').order('updated_at', { ascending: false }).limit(500),
    sb.from('messages').select('*').order('created_at', { ascending: false }).limit(1000),
  ]);

  const errors = [usuariosResp.error, leadsResp.error, convsResp.error, messagesResp.error].filter(Boolean);
  if (errors.length) return json(res, 500, { ok: false, error: errors[0].message });

  const conversationByLead = new Map<string, any>();
  const latestMessageByConversation = new Map<string, any>();

  for (const conv of convsResp.data || []) {
    if (conv.lead_id) conversationByLead.set(conv.lead_id, conv);
  }

  for (const message of messagesResp.data || []) {
    if (!message.conversation_id || latestMessageByConversation.has(message.conversation_id)) continue;
    latestMessageByConversation.set(message.conversation_id, message);
  }

  const byKey = new Map<string, any>();

  for (const usuario of usuariosResp.data || []) {
    const phone = normalizePhone(usuario.telefone || usuario.phone);
    const key = phone || `usuario:${usuario.id}`;

    byKey.set(key, {
      id: `usuario:${usuario.id}`,
      usuarioId: usuario.id,
      leadId: null,
      name: usuario.nome || usuario.full_name || phone || 'Sem nome',
      phone,
      origin: usuario.origem || usuario.origin || 'n8n / WhatsApp',
      interest: usuario.interesse || usuario.interest || '',
      temperature: 'cold',
      owner: '',
      lastInteractionAt: latestDate(usuario.created_at),
      createdAt: usuario.created_at,
      latestMessage: '',
      source: 'Usuarios',
    });
  }

  for (const lead of leadsResp.data || []) {
    const phone = normalizePhone(lead.phone);
    const key = phone || `lead:${lead.id}`;
    const existing = byKey.get(key) || {};
    const conv = conversationByLead.get(lead.id);
    const latestMessage = conv ? latestMessageByConversation.get(conv.id) : null;

    byKey.set(key, {
      ...existing,
      id: lead.id,
      leadId: lead.id,
      conversationId: conv?.id || null,
      name: lead.full_name || existing.name || phone || 'Sem nome',
      phone: phone || existing.phone || '',
      origin: lead.origin || existing.origin || 'WhatsApp',
      interest: lead.main_interest || lead.interest || existing.interest || '',
      temperature: classifyTemperature(lead.temperature || existing.temperature),
      owner: lead.owner || existing.owner || '',
      lastInteractionAt: latestDate(
        lead.last_interaction_at,
        lead.updated_at,
        conv?.updated_at,
        latestMessage?.created_at,
        existing.lastInteractionAt,
      ),
      createdAt: latestDate(lead.created_at, existing.createdAt),
      latestMessage: latestMessage?.content || existing.latestMessage || '',
      source: existing.usuarioId ? 'Usuarios + leads' : 'leads',
    });
  }

  const leads = Array.from(byKey.values()).sort((a, b) => {
    const ta = new Date(a.lastInteractionAt || a.createdAt || 0).getTime();
    const tb = new Date(b.lastInteractionAt || b.createdAt || 0).getTime();
    return tb - ta;
  });

  const diagnostics = {
    total: leads.length,
    withoutPhone: leads.filter((lead) => !lead.phone).length,
    withoutInterest: leads.filter((lead) => !lead.interest).length,
    withoutOwner: leads.filter((lead) => !lead.owner).length,
    onlyUsuarios: leads.filter((lead) => lead.source === 'Usuarios').length,
    withLeadRecord: leads.filter((lead) => lead.leadId).length,
  };

  return json(res, 200, { ok: true, leads, diagnostics });
}
