import { getServiceSupabase } from '../_lib/crm.js';

function json(res: any, status: number, payload: any) {
  return res.status(status).json(payload);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return json(res, 500, { ok: false, error: 'missing_supabase_service_role' });
  }

  // ── Action: mark notification as read ──────────────────────────────────────
  // POST /api/portal/data  { action: "read-notification", notifId: "..." }
  if (req.body?.action === 'read-notification') {
    const notifId = String(req.body?.notifId || '').trim();
    if (!notifId) {
      return json(res, 400, { ok: false, error: 'notifId é obrigatório.' });
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notifId);

      if (error) {
        return json(res, 500, { ok: false, error: 'Erro ao atualizar notificação.', details: error.message });
      }
      return json(res, 200, { ok: true });
    } catch (err: any) {
      return json(res, 500, { ok: false, error: 'Erro no servidor.', details: err.message });
    }
  }

  // ── Action: fetch patient portal data (default) ────────────────────────────
  const phone = String(req.body?.phone || '').trim().replace(/\D/g, '');
  const password = String(req.body?.password || '').trim();

  if (!phone || !password) {
    return json(res, 400, { ok: false, error: 'Telefone e senha são obrigatórios.' });
  }

  try {
    // 1. Fetch lead by phone (last 8 digits)
    let { data: leads, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .like('phone', `%${phone.slice(-8)}`)
      .limit(1);

    // 1.5 Fallback to legacy Usuarios table
    if (leadError || !leads || leads.length === 0) {
      const legacy = await supabase
        .from('Usuarios')
        .select('*')
        .like('telefone', `%${phone.slice(-8)}`)
        .limit(1);
      leads = legacy.data ? legacy.data.map((u: any) => ({
        ...u,
        id: u.id,
        full_name: u.full_name || u.nome || '',
        phone: u.phone || u.telefone || '',
        portal_password: u.portal_password || null,
        portal_access_active: u.portal_access_active ?? true,
      })) : null;
      leadError = legacy.error;
    }

    if (leadError || !leads || leads.length === 0) {
      return json(res, 404, { ok: false, error: 'Paciente não localizado. Verifique o número ou fale com a clínica.' });
    }

    const lead = leads[0];

    // 2. Validate password
    if (!lead.portal_password || lead.portal_password !== password) {
      return json(res, 401, { ok: false, error: 'Senha incorreta. Verifique os dados ou solicite suporte.' });
    }

    // 3. Verify access status
    if (lead.portal_access_active === false) {
      return json(res, 403, { ok: false, error: 'Acesso ao portal desativado. Entre em contato com a clínica.' });
    }

    // 4. Fetch related patient data
    const { data: record } = await supabase
      .from('patient_records')
      .select('*')
      .eq('lead_id', lead.id)
      .maybeSingle();

    const { data: financials } = await supabase
      .from('patient_financials')
      .select('*')
      .eq('lead_id', lead.id);

    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', lead.id)
      .order('created_at', { ascending: false });

    return json(res, 200, {
      ok: true,
      patient: {
        id: lead.id,
        full_name: lead.full_name,
        phone: lead.phone,
        interest: lead.interest || lead.main_interest || 'Tratamento Estético',
        allergies_restrictions: lead.allergies_restrictions || null,
        is_vip: lead.is_vip || false,
        last_appointment_at: lead.last_appointment_at || null,
      },
      record: record || null,
      financials: financials || [],
      notifications: notifications || [],
    });
  } catch (err: any) {
    return json(res, 500, { ok: false, error: 'Erro no servidor ao buscar dados.', details: err.message });
  }
}
