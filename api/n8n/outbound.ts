import { findLeadByIdOrPhone, getLeadAutomationState, setLeadAutomationState, type MessageSource } from '../_lib/automation.js';
import { appendConversationMessage, logIntegrationEvent, updateLeadOps } from '../_lib/crm.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contactId, message, type, destination, reaction, targetKey, ownerId, ownerName, nextFollowupAt } = req.body || {};
  const source = String(req.body?.source || 'agent').trim().toLowerCase() as MessageSource;
  const n8nUrl = process.env.VITE_N8N_OUTBOUND_WEBHOOK_URL || process.env.N8N_OUTBOUND_WEBHOOK_URL;
  const outboundEventId = `out_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const rawOutboundType = String(type || 'text').trim().toLowerCase();
  const outboundType = rawOutboundType === 'whatsapp' ? 'text' : rawOutboundType;

  try {
    if (!contactId && !destination) {
      return res.status(400).json({ error: 'Missing required fields: contactId or destination' });
    }

    if (source !== 'agent' && source !== 'human') {
      return res.status(400).json({ error: 'Invalid source. Use human or agent.' });
    }

    if (outboundType === 'reaction') {
      const reactionEmoji = String(reaction || message || '').trim();
      if (!reactionEmoji || !targetKey?.id || !targetKey?.remoteJid) {
        return res.status(400).json({
          error: 'Missing required fields for reaction: reaction and targetKey{id, remoteJid}',
        });
      }
    } else if (!message) {
      return res.status(400).json({ error: 'Missing required field: message' });
    }

    const automationState = contactId
      ? await getLeadAutomationState(String(contactId))
      : await findLeadByIdOrPhone({ phone: destination });
    if (automationState.ok && automationState.lead.automation_status === 'paused_human' && source === 'agent') {
      await logIntegrationEvent({
        eventId: `blocked_${outboundEventId}`,
        eventType: outboundType === 'reaction' ? 'agent_reaction_blocked_human_handoff' : 'agent_outbound_blocked_human_handoff',
        direction: 'outbound',
        payload: { contactId, destination, message, reaction, targetKey, type: outboundType, source, lead: automationState.lead },
        status: 'failed',
        errorMessage: 'automation_paused_human',
      });

      return res.status(409).json({
        error: 'automation_paused_human',
        details: 'Atendimento humano ativo. O agente nao pode enviar novas mensagens.',
        lead: automationState.lead,
      });
    }

    if (source === 'human') {
      await setLeadAutomationState({
        leadId: contactId ? String(contactId) : null,
        phone: destination,
        status: 'paused_human',
      });
    }

    if (source === 'human' && automationState.ok) {
      await updateLeadOps({
        leadId: automationState.lead.id,
        conversationStatus: 'em_atendimento',
        ownerId: ownerId === undefined ? undefined : ownerId ? String(ownerId) : null,
        ownerName: ownerName === undefined ? undefined : ownerName ? String(ownerName) : null,
        nextFollowupAt: nextFollowupAt === undefined ? undefined : nextFollowupAt ? new Date(String(nextFollowupAt)).toISOString() : null,
      });
    }

    let messageSyncStatus: 'success' | 'failed' | 'skipped' = automationState.ok ? 'success' : 'skipped';
    let messageSyncError: string | null = null;

    if (automationState.ok && outboundType !== 'reaction') {
      const messageWrite = await appendConversationMessage({
        leadId: automationState.lead.id,
        direction: 'outbound',
        content: String(message),
        type: outboundType,
        source,
        n8nMessageId: outboundEventId,
      });

      if (!messageWrite.ok) {
        messageSyncStatus = 'failed';
        messageSyncError = messageWrite.reason;
        await logIntegrationEvent({
          eventId: `sync_failed_${outboundEventId}`,
          eventType: source === 'human' ? 'human_message_sync_failed' : 'agent_message_sync_failed',
          direction: 'outbound',
          payload: { contactId, destination, type: outboundType, source, reason: messageWrite.reason },
          status: 'failed',
          errorMessage: messageWrite.reason,
        });
      }
    }

    if (automationState.ok && outboundType === 'reaction') {
      const reactionText = String(reaction || message || '').trim();
      const reactionWrite = await appendConversationMessage({
        leadId: automationState.lead.id,
        direction: 'outbound',
        type: 'reaction',
        source,
        content: reactionText || '👍',
        n8nMessageId: outboundEventId,
      });

      if (!reactionWrite.ok) {
        messageSyncStatus = 'failed';
        messageSyncError = reactionWrite.reason;
        await logIntegrationEvent({
          eventId: `sync_failed_${outboundEventId}`,
          eventType: source === 'human' ? 'human_reaction_sync_failed' : 'agent_reaction_sync_failed',
          direction: 'outbound',
          payload: { contactId, destination, type: outboundType, source, reason: reactionWrite.reason },
          status: 'failed',
          errorMessage: reactionWrite.reason,
        });
      }
    }

    if (!n8nUrl || !String(n8nUrl).startsWith('http')) {
      await logIntegrationEvent({
        eventId: outboundEventId,
        eventType:
          outboundType === 'reaction'
            ? source === 'human'
              ? 'human_outbound_reaction'
              : 'agent_outbound_reaction'
            : source === 'human'
              ? 'human_outbound_message'
              : 'agent_outbound_message',
        direction: 'outbound',
        payload: { contactId, destination, message, reaction, targetKey, type: outboundType, source, simulated: true },
        status: 'success',
      });

      return res.status(200).json({
        success: true,
        simulated: true,
        source,
        type: outboundType,
        messageSync: { status: messageSyncStatus, error: messageSyncError },
        timestamp: new Date().toISOString(),
      });
    }

    const response = await fetch(String(n8nUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.N8N_WEBHOOK_OUTBOUND_TOKEN || ''}`,
      },
      body: JSON.stringify({
        contactId,
        message,
        type: outboundType,
        destination,
        source,
        reaction,
        targetKey,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`n8n error: ${response.status} ${response.statusText}`);
    }

    await logIntegrationEvent({
      eventId: outboundEventId,
      eventType:
        outboundType === 'reaction'
          ? source === 'human'
            ? 'human_outbound_reaction'
            : 'agent_outbound_reaction'
          : source === 'human'
            ? 'human_outbound_message'
            : 'agent_outbound_message',
      direction: 'outbound',
      payload: { contactId, destination, message, reaction, targetKey, type: outboundType, source },
      status: 'success',
    });

    return res.status(200).json({
      success: true,
      source,
      type: outboundType,
      messageSync: { status: messageSyncStatus, error: messageSyncError },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    await logIntegrationEvent({
      eventId: outboundEventId,
      eventType:
        outboundType === 'reaction'
          ? source === 'human'
            ? 'human_outbound_reaction'
            : 'agent_outbound_reaction'
          : source === 'human'
            ? 'human_outbound_message'
            : 'agent_outbound_message',
      direction: 'outbound',
      payload: { contactId, destination, message, reaction, targetKey, type: outboundType, source },
      status: 'failed',
      errorMessage: err?.message || 'unknown_error',
    });
    return res.status(500).json({ error: 'Falha ao comunicar com n8n', details: err?.message || 'unknown_error' });
  }
}
