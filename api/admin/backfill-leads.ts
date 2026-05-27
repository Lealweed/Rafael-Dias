import { createClient } from '@supabase/supabase-js';

function normalizePhone(raw: any): string {
  return String(raw || '').split('@')[0].replace(/\D/g, '');
}

function json(res: any, status: number, payload: any) {
  return res.status(status).json(payload);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const expectedToken = process.env.CRM_MAINTENANCE_TOKEN;
  const authHeader = String(req.headers?.authorization || '').trim();
  const authOk = expectedToken && authHeader === `Bearer ${expectedToken}`;

  if (!authOk) return json(res, 401, { error: 'Unauthorized' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return json(res, 500, { ok: false, error: 'Missing Supabase service configuration' });
  }

  const sb = createClient(supabaseUrl, serviceKey);

  const [usuariosResp, leadsResp] = await Promise.all([
    sb.from('Usuarios').select('*').order('created_at', { ascending: true }),
    sb.from('leads').select('id, phone'),
  ]);

  if (usuariosResp.error) return json(res, 500, { ok: false, error: usuariosResp.error.message });
  if (leadsResp.error) return json(res, 500, { ok: false, error: leadsResp.error.message });

  const existingPhones = new Set((leadsResp.data || []).map((lead: any) => normalizePhone(lead.phone)).filter(Boolean));
  let created = 0;
  let skippedExisting = 0;
  let skippedNoPhone = 0;
  const errors: Array<{ phone: string; error: string }> = [];

  for (const usuario of usuariosResp.data || []) {
    const phone = normalizePhone(usuario.telefone || usuario.phone);
    if (!phone) {
      skippedNoPhone += 1;
      continue;
    }

    if (existingPhones.has(phone)) {
      skippedExisting += 1;
      continue;
    }

    const name = usuario.nome || usuario.full_name || phone;
    const { error } = await sb.from('leads').insert({
      full_name: name,
      phone,
      origin: usuario.origem || usuario.origin || 'n8n / WhatsApp',
      temperature: 'cold',
      last_interaction_at: usuario.created_at || new Date().toISOString(),
      created_at: usuario.created_at || undefined,
    });

    if (error) {
      errors.push({ phone, error: error.message });
      continue;
    }

    existingPhones.add(phone);
    created += 1;
  }

  return json(res, 200, {
    ok: errors.length === 0,
    created,
    skippedExisting,
    skippedNoPhone,
    errors,
  });
}
