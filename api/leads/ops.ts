import { findLeadByIdOrPhone } from '../_lib/automation.js';
import { updateLeadOps, isAuthorizedRequest } from '../_lib/crm.js';

const ALLOWED_STATUS = new Set([
  'novo',
  'em_atendimento',
  'aguardando_cliente',
  'agendado',
  'em_followup',
  'encerrado',
]);

function json(res: any, status: number, payload: any) {
  return res.status(status).json(payload);
}

export default async function handler(req: any, res: any) {
  const allowed = await isAuthorizedRequest(req);
  if (!allowed) {
    return json(res, 401, { ok: false, error: 'Unauthorized' });
  }

  const leadId = String(req.query?.leadId || req.body?.leadId || '').trim();
  const phone = String(req.query?.phone || req.body?.phone || '').trim();

  if (!leadId && !phone) {
    return json(res, 400, { ok: false, error: 'Missing required field: leadId or phone' });
  }

  const leadLookup = await findLeadByIdOrPhone({ leadId, phone });
  if (!leadLookup.ok) {
    return json(res, leadLookup.reason === 'lead_not_found' ? 404 : 500, {
      ok: false,
      error: leadLookup.reason,
    });
  }

  if (req.method === 'GET') {
    return json(res, 200, { ok: true, lead: leadLookup.lead });
  }

  if (req.method === 'POST') {
    const conversationStatusRaw = req.body?.conversationStatus;
    const conversationStatus =
      conversationStatusRaw === undefined || conversationStatusRaw === null || conversationStatusRaw === ''
        ? undefined
        : String(conversationStatusRaw).trim().toLowerCase();

    if (conversationStatus !== undefined && !ALLOWED_STATUS.has(conversationStatus)) {
      return json(res, 400, {
        ok: false,
        error: 'Invalid conversationStatus',
      });
    }

    const nextFollowupAtRaw = req.body?.nextFollowupAt;
    const nextFollowupAt =
      nextFollowupAtRaw === undefined ? undefined : nextFollowupAtRaw ? new Date(String(nextFollowupAtRaw)).toISOString() : null;

    const lastAppointmentAtRaw = req.body?.lastAppointmentAt;
    const lastAppointmentAt =
      lastAppointmentAtRaw === undefined ? undefined : lastAppointmentAtRaw ? new Date(String(lastAppointmentAtRaw)).toISOString() : null;

    const result = await updateLeadOps({
      leadId: leadLookup.lead.id,
      conversationStatus,
      ownerId: req.body?.ownerId === undefined ? undefined : req.body?.ownerId ? String(req.body.ownerId) : null,
      ownerName: req.body?.ownerName === undefined ? undefined : req.body?.ownerName ? String(req.body.ownerName) : null,
      nextFollowupAt,
      calendarEventId:
        req.body?.calendarEventId === undefined ? undefined : req.body?.calendarEventId ? String(req.body.calendarEventId) : null,
      lastAppointmentAt,
    });

    if (!result.ok) {
      return json(res, result.reason === 'lead_not_found' ? 404 : 500, { ok: false, error: result.reason });
    }

    return json(res, 200, { ok: true, lead: result.lead });
  }

  return json(res, 405, { ok: false, error: 'Method not allowed' });
}
