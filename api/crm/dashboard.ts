import { createClient } from '@supabase/supabase-js';

function json(res: any, status: number, payload: any) {
  return res.status(status).json(payload);
}

function normalizePhone(raw: any): string {
  return String(raw || '').split('@')[0].replace(/\D/g, '');
}

async function countRows(sb: any, table: string, apply?: (query: any) => any) {
  let query = sb.from(table).select('*', { count: 'exact', head: true });
  if (apply) query = apply(query);
  const { count, error } = await query;
  if (error) return 0;
  return count || 0;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return json(res, 500, { ok: false, error: 'Missing Supabase service configuration' });
  }

  const sb = createClient(supabaseUrl, serviceKey);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const [
    usuariosCount,
    leadsCount,
    newUsuariosToday,
    newLeadsToday,
    hotLeads,
    totalMessages,
    totalConversations,
    totalEvents,
    usuariosPhones,
    leadsPhones,
  ] = await Promise.all([
    countRows(sb, 'Usuarios'),
    countRows(sb, 'leads'),
    countRows(sb, 'Usuarios', (query) => query.gte('created_at', todayIso)),
    countRows(sb, 'leads', (query) => query.gte('created_at', todayIso)),
    countRows(sb, 'leads', (query) => query.eq('temperature', 'hot')),
    countRows(sb, 'messages'),
    countRows(sb, 'conversations'),
    countRows(sb, 'integration_events'),
    sb.from('Usuarios').select('telefone'),
    sb.from('leads').select('phone'),
  ]);

  const uniquePhones = new Set<string>();
  for (const row of usuariosPhones.data || []) {
    const phone = normalizePhone(row.telefone);
    if (phone) uniquePhones.add(phone);
  }
  for (const row of leadsPhones.data || []) {
    const phone = normalizePhone(row.phone);
    if (phone) uniquePhones.add(phone);
  }

  const totalContacts = usuariosCount || leadsCount;

  return json(res, 200, {
    ok: true,
    newLeadsToday: newUsuariosToday + newLeadsToday,
    totalLeads: Math.max(totalContacts, uniquePhones.size, leadsCount),
    hotLeads,
    totalMessages,
    totalConversations: Math.max(totalConversations, usuariosCount, leadsCount),
    totalEvents,
    sources: {
      usuarios: usuariosCount,
      leads: leadsCount,
      messages: totalMessages,
      conversations: totalConversations,
      integrationEvents: totalEvents,
    },
  });
}
