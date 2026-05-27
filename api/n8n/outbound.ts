import { createClient } from '@supabase/supabase-js';

function normalizePhone(raw: any): string {
  if (!raw) return '';
  return String(raw).split('@')[0].replace(/\D/g, '');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contactId, message, type, destination } = req.body || {};
  const n8nUrl = process.env.VITE_N8N_OUTBOUND_WEBHOOK_URL || process.env.N8N_OUTBOUND_WEBHOOK_URL;
  let phone = normalizePhone(destination);
  let contactName = '';

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseServiceKey && contactId) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: usuario } = await supabase
        .from('Usuarios')
        .select('nome, telefone')
        .eq('id', contactId)
        .maybeSingle();

      phone = phone || normalizePhone(usuario?.telefone);
      contactName = usuario?.nome || '';

      await supabase
        .from('Usuarios')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', contactId);

      let { data: convs } = await supabase.from('conversations').select('id').eq('lead_id', contactId).limit(1);
      let convId = convs?.[0]?.id as string | undefined;

      if (!convId) {
        const { data: newConv } = await supabase.from('conversations').insert({ lead_id: contactId }).select('id').single();
        convId = newConv?.id;
      }

      if (convId) {
        await supabase.from('messages').insert({
          conversation_id: convId,
          direction: 'outbound',
          type: 'text',
          content: message,
          n8n_message_id: `out_${Date.now()}`,
        });

        await supabase.from('leads').update({ last_interaction_at: new Date().toISOString() }).eq('id', contactId);
      }
    }

    if (!phone) {
      return res.status(400).json({ error: 'Contato sem telefone válido para envio ao WhatsApp' });
    }

    if (!n8nUrl || !String(n8nUrl).startsWith('http')) {
      return res.status(200).json({ success: true, simulated: true, timestamp: new Date().toISOString() });
    }

    const response = await fetch(String(n8nUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.N8N_WEBHOOK_OUTBOUND_TOKEN || ''}`,
      },
      body: JSON.stringify({
        source: 'crm_outbound',
        contactId,
        name: contactName,
        phone,
        message,
        type,
        destination: phone,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`n8n error: ${response.status} ${response.statusText}`);
    }

    return res.status(200).json({ success: true, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: 'Falha ao comunicar com n8n', details: err?.message || 'unknown_error' });
  }
}
