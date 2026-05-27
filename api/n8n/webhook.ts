import { createClient } from '@supabase/supabase-js';

function normalizePhone(raw: any): string {
  if (!raw) return '';
  const base = String(raw).split('@')[0].trim();
  if (/^https?:\/\//i.test(base)) return '';
  return base.replace(/\D/g, '');
}

function pickData(payload: any) {
  return payload?.data || payload?.body?.data || payload?.raw?.data || {};
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = String(req.headers?.authorization || '').trim();
  const expectedSecret = process.env.N8N_WEBHOOK_INBOUND_SECRET;

  if (expectedSecret) {
    const bearer = `Bearer ${expectedSecret}`;
    const authOk = authHeader === expectedSecret || authHeader === bearer;

    if (!authOk) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const payload = req.body || {};
  if (!Object.keys(payload).length) {
    return res.status(400).json({ error: 'Missing payload' });
  }

  const data = pickData(payload);
  const eventType = String(payload.event || payload.type || payload.body?.event || '').toLowerCase();
  const fromMe = Boolean(data?.key?.fromMe ?? payload?.fromMe ?? payload?.body?.fromMe ?? false);

  // Ignora eventos de status/eco e mensagens enviadas pelo próprio número.
  if ((eventType && !eventType.includes('messages.')) || fromMe) {
    return res.status(200).json({ received: true, ignored: true, reason: fromMe ? 'from_me' : 'non_message_event' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(200).json({
      received: true,
      simulated: true,
      reason: 'missing_supabase_service_role',
      timestamp: new Date().toISOString(),
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const eventId =
    payload.event_id || payload.id || payload.message_id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  try {
    const { error: eventError } = await supabase.from('integration_events').insert({
      event_id: eventId,
      event_type: payload.type || payload.event || 'inbound_message',
      direction: 'inbound',
      payload,
      status: 'success',
    });

    if (eventError?.code === '23505') {
      return res.status(200).json({ received: true, status: 'already_processed', timestamp: new Date().toISOString() });
    }

    let phone =
      payload.phone ||
      payload.from ||
      payload.remoteJid ||
      payload.wa_id ||
      payload.sender ||
      data?.key?.remoteJid ||
      '';

    phone = normalizePhone(phone);

    let content = payload.message || payload.text || payload.content || '';
    if (!content && data?.message) {
      content = data.message.conversation || data.message.extendedTextMessage?.text || '';
    }

    const name = payload.name || payload.contact_name || payload.pushName || data?.pushName || phone || 'Lead';

    if (!phone) {
      return res.status(200).json({ received: true, ignored: true, reason: 'no_phone', timestamp: new Date().toISOString() });
    }

    if (!String(content || '').trim()) {
      return res.status(200).json({ received: true, ignored: true, reason: 'no_content', timestamp: new Date().toISOString() });
    }

    let { data: leads } = await supabase.from('leads').select('id').eq('phone', phone).limit(1);
    let leadId = leads?.[0]?.id as string | undefined;

    if (!leadId) {
      const { data: newLead } = await supabase
        .from('leads')
        .insert({ full_name: name, phone, origin: 'n8n Webhook', temperature: 'cold' })
        .select('id')
        .single();
      leadId = newLead?.id;
    }

    if (leadId) {
      let { data: convs } = await supabase.from('conversations').select('id').eq('lead_id', leadId).limit(1);
      let convId = convs?.[0]?.id as string | undefined;

      if (!convId) {
        const { data: newConv } = await supabase.from('conversations').insert({ lead_id: leadId }).select('id').single();
        convId = newConv?.id;
      }

      if (convId) {
        await supabase.from('messages').insert({
          conversation_id: convId,
          direction: 'inbound',
          type: 'text',
          content: typeof content === 'string' ? content : JSON.stringify(content),
          n8n_message_id: eventId,
        });

        await supabase.from('leads').update({ last_interaction_at: new Date().toISOString() }).eq('id', leadId);
      }
    }

    return res.status(200).json({ received: true, simulated: false, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal error processing webhook', details: err?.message || 'unknown_error' });
  }
}
