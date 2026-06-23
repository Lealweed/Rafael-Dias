import { findLeadByIdOrPhone, getLeadAutomationState, setLeadAutomationState } from '../_lib/automation.js';
import { updateLeadOps, isAuthorizedRequest } from '../_lib/crm.js';

function json(res: any, status: number, payload: any) {
  return res.status(status).json(payload);
}

function readLeadId(req: any): string {
  return String(req.query?.leadId || req.body?.leadId || '').trim();
}

function readPhone(req: any): string {
  return String(req.query?.phone || req.body?.phone || '').trim();
}

export default async function handler(req: any, res: any) {
  const allowed = await isAuthorizedRequest(req);
  if (!allowed) {
    return json(res, 401, { ok: false, error: 'Unauthorized' });
  }

  const leadId = readLeadId(req);
  const phone = readPhone(req);

  if (!leadId && !phone) {
    return json(res, 400, { ok: false, error: 'Missing required field: leadId or phone' });
  }

  if (req.method === 'GET') {
    const state = leadId ? await getLeadAutomationState(leadId) : await findLeadByIdOrPhone({ phone });

    if (!state.ok) {
      const status = state.reason === 'lead_not_found' ? 404 : 500;
      return json(res, status, { ok: false, error: state.reason });
    }

    return json(res, 200, { ok: true, lead: state.lead });
  }

  if (req.method === 'POST') {
    const action = String(req.body?.action || '').trim().toLowerCase();
    const pausedBy = req.body?.pausedBy ? String(req.body.pausedBy) : null;
    const ownerId = req.body?.ownerId ? String(req.body.ownerId) : null;
    const ownerName = req.body?.ownerName ? String(req.body.ownerName) : null;

    if (action !== 'pause' && action !== 'resume') {
      return json(res, 400, { ok: false, error: 'Invalid action. Use pause or resume.' });
    }

    const state = await setLeadAutomationState({
      leadId,
      phone,
      status: action === 'pause' ? 'paused_human' : 'active',
      pausedBy,
    });

    if (!state.ok) {
      const status = state.reason === 'lead_not_found' ? 404 : 500;
      return json(res, status, { ok: false, error: state.reason });
    }

    if (action === 'pause') {
      const ops = await updateLeadOps({
        leadId: state.lead.id,
        conversationStatus: 'em_atendimento',
        ownerId,
        ownerName,
      });

      if (ops.ok) {
        return json(res, 200, { ok: true, lead: { ...state.lead, ...ops.lead } });
      }
    }

    return json(res, 200, { ok: true, lead: state.lead });
  }

  return json(res, 405, { ok: false, error: 'Method not allowed' });
}
