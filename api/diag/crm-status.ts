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

  const checks = ['leads', 'messages', 'conversations', 'integration_events'];
  out.tables = {};

  for (const t of checks) {
    const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true });
    out.tables[t] = {
      exists: !error,
      count: error ? null : count,
      error: error ? error.message : null,
      code: error ? (error as any).code || null : null,
    };
  }

  return res.status(200).json(out);
}
