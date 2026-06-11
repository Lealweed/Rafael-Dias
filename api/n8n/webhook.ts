import { appendConversationMessage, ensureLeadByPhone, logIntegrationEvent, normalizePhone } from '../_lib/crm.js';

function pickData(payload: any) {
  return payload?.data || payload?.body?.data || payload?.raw?.data || {};
}

function mapInboundMessageType(payload: any, data: any): string {
  const rawType = String(payload?.messageType || payload?.type || data?.messageType || '').trim();
  if (!rawType) return 'text';
  if (rawType === 'reactionMessage') return 'reaction';
  if (rawType === 'audioMessage') return 'audio';
  if (rawType === 'imageMessage') return 'image';
  if (rawType === 'documentMessage') return 'document';
  if (rawType === 'videoMessage') return 'video';
  return 'text';
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

    // Compat temporária: n8n deste ambiente não pode ler $env no node HTTP.
    // Se vier sem Authorization mas com payload válido de inbound, aceitamos.
    const payloadPreview = req.body || {};
    const hasInboundShape = Boolean(
      payloadPreview.phone ||
      payloadPreview.remoteJid ||
      payloadPreview.from ||
      payloadPreview.destination ||
      payloadPreview.data?.key?.remoteJid ||
      payloadPreview.raw
    );

    if (!authOk && !(authHeader === '' && hasInboundShape)) {
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

  const serviceReady = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) && Boolean(process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!serviceReady) {
    return res.status(200).json({
      received: true,
      simulated: true,
      reason: 'missing_supabase_service_role',
      timestamp: new Date().toISOString(),
    });
  }

  const eventId =
    payload.event_id || payload.id || payload.message_id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  try {
    const eventResult = await logIntegrationEvent({
      eventId,
      eventType: payload.type || payload.event || 'inbound_message',
      direction: 'inbound',
      payload,
      status: 'success',
    });

    if (eventResult.ok && eventResult.duplicated) {
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
    const messageType = mapInboundMessageType(payload, data);
    if (!String(content || '').trim()) {
      if (messageType === 'reaction') {
        content = data?.message?.reactionMessage?.text || '[Reacao recebida]';
      } else if (messageType === 'audio') {
        content = '[Audio recebido]';
      } else if (messageType === 'image') {
        content = data?.message?.imageMessage?.caption || '[Imagem recebida]';
      } else if (messageType === 'document') {
        content = data?.message?.documentMessage?.caption || '[Documento recebido]';
      } else if (messageType === 'video') {
        content = data?.message?.videoMessage?.caption || '[Video recebido]';
      }
    }

    const name = payload.name || payload.contact_name || payload.pushName || data?.pushName || phone || 'Lead';

    if (!phone) {
      return res.status(200).json({ received: true, ignored: true, reason: 'no_phone', timestamp: new Date().toISOString() });
    }

    if (!String(content || '').trim()) {
      return res.status(200).json({ received: true, ignored: true, reason: 'no_content', timestamp: new Date().toISOString() });
    }

    const lead = await ensureLeadByPhone({ phone, name });
    if (!lead.ok) {
      return res.status(500).json({ error: 'Lead sync failed', details: lead.reason });
    }

    // Auto-Pause check
    const textStr = String(content || '');
    const keywords = ['humano', 'atendente', 'falar com', 'cancelar', 'reagendar', 'desmarcar', 'remarcar', 'suporte', 'atendimento', 'pessoalmente'];
    const needsHandoff = keywords.some(kw => textStr.toLowerCase().includes(kw));

    if (needsHandoff && lead.lead.automation_status !== 'paused_human') {
      const { setLeadAutomationState } = await import('../_lib/automation.js');
      const updated = await setLeadAutomationState({
        leadId: lead.lead.id,
        status: 'paused_human',
      });
      if (updated.ok) {
        lead.lead = updated.lead;
      }
    }

    const messageWrite = await appendConversationMessage({
      leadId: lead.lead.id,
      direction: 'inbound',
      type: messageType,
      source: 'customer',
      content: String(content),
      n8nMessageId: eventId,
    });

    if (!messageWrite.ok) {
      return res.status(500).json({ error: 'Message sync failed', details: messageWrite.reason });
    }

    return res.status(200).json({
      received: true,
      simulated: false,
      leadId: lead.lead.id,
      conversationId: messageWrite.conversationId,
      automation_status: lead.lead.automation_status,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Internal error processing webhook', details: err?.message || 'unknown_error' });
  }
}
