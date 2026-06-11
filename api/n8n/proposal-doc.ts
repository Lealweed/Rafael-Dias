import { appendSystemMessage } from '../_lib/crm.js';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_DOCS_API = 'https://docs.googleapis.com/v1/documents';

function json(res: any, status: number, payload: any) {
  return res.status(status).json(payload);
}

async function getGoogleAccessToken() {
  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;
  const refresh_token = process.env.GOOGLE_REFRESH_TOKEN;

  if (!client_id || !client_secret || !refresh_token) {
    throw new Error('Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN');
  }

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id,
      client_secret,
      refresh_token,
      grant_type: 'refresh_token',
    }).toString(),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(`Google token error: ${tokenRes.status} ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token as string;
}

async function gdocs(path: string, method: string, accessToken: string, body?: any) {
  const res = await fetch(`${GOOGLE_DOCS_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Google Docs error: ${res.status} ${JSON.stringify(data)}`);
  }

  return data;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const leadId = String(req.body?.leadId || '').trim();
  const contactName = String(req.body?.contactName || '').trim();
  const phone = String(req.body?.phone || '').trim();
  const origin = String(req.body?.origin || '').trim();
  const interest = String(req.body?.interest || '').trim();

  if (!contactName) {
    return json(res, 400, { ok: false, error: 'Missing required field: contactName' });
  }

  try {
    const accessToken = await getGoogleAccessToken();

    const title = `Proposta Comercial - ${contactName}`;
    const created = await gdocs('', 'POST', accessToken, { title });

    if (!created?.documentId) {
      throw new Error('Google Docs did not return documentId');
    }

    const content = [
      'Proposta Comercial',
      '',
      `Data: ${new Date().toLocaleDateString('pt-BR')}`,
      `Cliente: ${contactName}`,
      `Telefone: ${phone || 'N/A'}`,
      `Origem: ${origin || 'N/A'}`,
      `Serviço de Interesse: ${interest || 'N/A'}`,
      '',
      '[Detalhes da Proposta Aqui]',
      '',
    ].join('\n');

    await gdocs(`/${created.documentId}:batchUpdate`, 'POST', accessToken, {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: content,
          },
        },
      ],
    });

    const docUrl = `https://docs.google.com/document/d/${created.documentId}/edit`;
    if (leadId) {
      await appendSystemMessage({
        leadId,
        content: `Contrato/Proposta Comercial gerado no Google Docs. Link: ${docUrl}`,
      });
    }
    return json(res, 200, {
      ok: true,
      documentId: created.documentId,
      docUrl,
    });
  } catch (err: any) {
    return json(res, 500, {
      ok: false,
      error: err?.message || 'unknown_error',
      timestamp: new Date().toISOString(),
    });
  }
}
