import { normalizePhone } from './crm.js';

export function extractInboundPhone(payload: any): string | null {
  const candidates = [
    payload.phone,
    payload.destination,
    payload.from,
    payload.remoteJid,
    payload.wa_id,
    payload.sender,
    payload.to,
    payload.contact?.phone,
    payload.data?.key?.remoteJid,
    payload.data?.message?.key?.remoteJid,
    payload.data?.message?.key?.participant,
    payload.data?.message?.sender?.id,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = normalizePhone(candidate);
    if (normalized) return normalized;
  }

  return null;
}

export function extractInboundName(payload: any): string | null {
  const candidates = [
    payload.name,
    payload.contact_name,
    payload.pushName,
    payload.data?.pushName,
    payload.data?.message?.pushName,
    payload.data?.message?.contact?.displayName,
    payload.data?.message?.contactMessage?.displayName,
    payload.data?.message?.sender?.name,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const value = String(candidate).trim();
    if (value) return value;
  }

  return null;
}

export function parseInboundMessage(payload: any) {
  const messagePayload = payload.data?.message || payload.message || payload;
  const text =
    messagePayload?.conversation ||
    messagePayload?.extendedTextMessage?.text ||
    messagePayload?.text?.body ||
    messagePayload?.caption ||
    messagePayload?.imageMessage?.caption ||
    messagePayload?.videoMessage?.caption ||
    messagePayload?.documentMessage?.caption ||
    messagePayload?.buttonsMessage?.contentText ||
    messagePayload?.listMessage?.description ||
    messagePayload?.audioMessage?.fileName ||
    messagePayload?.contactMessage?.displayName ||
    payload.text ||
    payload.content ||
    payload.body ||
    "";

  if (messagePayload?.imageMessage || messagePayload?.image) {
    return {
      type: 'image',
      content: messagePayload?.imageMessage?.caption || messagePayload?.caption || text || 'Imagem recebida',
      mediaUrl: messagePayload?.imageMessage?.url || messagePayload?.image?.url || payload.image_url || null,
    };
  }

  if (messagePayload?.videoMessage || messagePayload?.video) {
    return {
      type: 'video',
      content: messagePayload?.videoMessage?.caption || messagePayload?.caption || text || 'Vídeo recebido',
      mediaUrl: messagePayload?.videoMessage?.url || messagePayload?.video?.url || payload.video_url || null,
    };
  }

  if (messagePayload?.audioMessage || messagePayload?.audio) {
    return {
      type: 'audio',
      content: messagePayload?.audioMessage?.fileName || text || 'Áudio recebido',
      mediaUrl: messagePayload?.audioMessage?.url || messagePayload?.audio?.url || payload.audio_url || null,
    };
  }

  if (messagePayload?.documentMessage || messagePayload?.document) {
    return {
      type: 'document',
      content: messagePayload?.documentMessage?.fileName || text || 'Documento recebido',
      mediaUrl: messagePayload?.documentMessage?.url || messagePayload?.document?.url || payload.document_url || null,
    };
  }

  if (messagePayload?.location) {
    return {
      type: 'location',
      content: JSON.stringify(messagePayload.location),
      mediaUrl: null,
    };
  }

  if (messagePayload?.contacts || messagePayload?.contactMessage) {
    return {
      type: 'contact',
      content: messagePayload?.contactMessage?.displayName || text || 'Contato recebido',
    };
  }

  if (messagePayload?.stickerMessage || messagePayload?.sticker) {
    return {
      type: 'sticker',
      content: text || 'Figurinha recebida',
      mediaUrl: messagePayload?.stickerMessage?.url || messagePayload?.sticker?.url || null,
    };
  }

  if (messagePayload?.reaction || payload.reaction) {
    return {
      type: 'reaction',
      content: String(messagePayload?.reaction || payload.reaction || text || 'Reação recebida'),
      mediaUrl: null,
    };
  }

  return {
    type: 'text',
    content: String(text || JSON.stringify(payload || {})),
    mediaUrl: null,
  };
}

export function isHumanHandoffRequested(payload: any) {
  const explicit = payload.handoff === true || payload.human === true || payload.handoffRequested === true;
  if (explicit) return true;

  const messagePayload = payload.data?.message || payload.message || payload;
  const content = (
    messagePayload?.conversation ||
    messagePayload?.extendedTextMessage?.text ||
    messagePayload?.text?.body ||
    payload.text ||
    payload.content ||
    ""
  ).toString().toLowerCase();

  const keywords = [
    'humano', 'atendente', 'falar com', 'atendimento', 'suporte', 'operador', 'pessoa', 'ajuda', 'help', 'opa', 'ai', 'humana', 'humano', 'falar', 'responsável'
  ];

  return keywords.some((keyword) => content.includes(keyword));
}

export function getInboundEventType(payload: any) {
  return String(payload.type || payload.event || payload.event_type || 'inbound_message').toLowerCase();
}
