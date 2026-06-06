import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return res.status(200).json({ ok: false, reason: 'missing_supabase_env' });
  }

  const sb = createClient(supabaseUrl, serviceKey);

  const out: any = { ok: true, supabaseUrlHost: new URL(supabaseUrl).host };

  const checks = ['Usuarios', 'leads', 'messages', 'conversations', 'integration_events'];
  out.tables = {};

  for (const t of checks) {
    const { data, error } = await sb.from(t).select('*').order('created_at', { ascending: false }).limit(3);
    out.tables[t] = {
      exists: !error,
      recent_count: Array.isArray(data) ? data.length : 0,
      latest_created_at: Array.isArray(data) && data[0] ? data[0].created_at : null,
      sample_phone: Array.isArray(data) && data[0] ? (data[0].phone || data[0].telefone || null) : null,
      sample_name: Array.isArray(data) && data[0] ? (data[0].full_name || data[0].nome || null) : null,
      error: error ? error.message : null,
      code: error ? (error as any).code || null : null,
    };
  }

  const { data: automationSample } = await sb
    .from('leads')
    .select('id, full_name, phone, automation_status, automation_paused_at, automation_resumed_at')
    .order('updated_at', { ascending: false })
    .limit(10);

  out.automation = {
    paused_count: Array.isArray(automationSample)
      ? automationSample.filter((lead: any) => lead.automation_status === 'paused_human').length
      : 0,
    recent_sample: Array.isArray(automationSample) ? automationSample : [],
  };

  return res.status(200).json(out);
}
