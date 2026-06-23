import { appendConversationMessage, ensureLeadByPhone, logIntegrationEvent } from '../_lib/crm.js';
import { extractInboundPhone, extractInboundName, parseInboundMessage, isHumanHandoffRequested, getInboundEventType } from '../_lib/n8n-inbound.js';
import { setLeadAutomationState } from '../_lib/automation.js';

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
  const eventType = getInboundEventType(payload);
  const fromMe = Boolean(data?.key?.fromMe ?? payload?.fromMe ?? payload?.body?.fromMe ?? false);

  // Ignore status/echo events and messages sent by the bot itself.
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

    const phone = extractInboundPhone(payload);
    const name = extractInboundName(payload) || payload.name || payload.contact_name || payload.pushName || phone || 'Lead';
    const message = parseInboundMessage(payload);
    const needsHandoff = isHumanHandoffRequested(payload);

    if (!phone) {
      return res.status(200).json({ received: true, ignored: true, reason: 'no_phone', timestamp: new Date().toISOString() });
    }

    if (!message.content || !String(message.content).trim()) {
      return res.status(200).json({ received: true, ignored: true, reason: 'no_content', timestamp: new Date().toISOString() });
    }

    const lead = await ensureLeadByPhone({ phone, name });
    if (!lead.ok) {
      return res.status(500).json({ error: 'Lead sync failed', details: lead.reason });
    }

    if (needsHandoff && !['paused_human', 'handoff_requested'].includes(lead.lead.automation_status)) {
      const updated = await setLeadAutomationState({
        leadId: lead.lead.id,
        status: 'handoff_requested',
      });
      if (updated.ok) {
        lead.lead = updated.lead;
      }
    }

    const messageWrite = await appendConversationMessage({
      leadId: lead.lead.id,
      direction: 'inbound',
      type: message.type,
      source: 'customer',
      content: String(message.content),
      mediaUrl: message.mediaUrl || null,
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
