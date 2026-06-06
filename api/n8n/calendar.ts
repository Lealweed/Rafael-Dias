import { createClient } from '@supabase/supabase-js';
import { updateLeadOps } from '../_lib/crm.js';

type CalendarAction = 'list' | 'create' | 'update' | 'delete';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

function getAuthHeader(req: any): string {
  return String(req.headers?.authorization || '').trim();
}

function isAuthorizedBySecret(req: any): boolean {
  const header = getAuthHeader(req);
  const secret = process.env.N8N_CALENDAR_WEBHOOK_SECRET || process.env.N8N_WEBHOOK_INBOUND_SECRET || '';
  if (!secret) return true;
  return header === secret || header === `Bearer ${secret}`;
}

async function isAuthorizedBySupabaseUser(req: any): Promise<boolean> {
  const header = getAuthHeader(req);
  if (!header || !header.toLowerCase().startsWith('bearer ')) return false;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnon = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) return false;

  try {
    const resp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnon,
        Authorization: header,
      },
    });

    if (!resp.ok) return false;
    const user = await resp.json().catch(() => null);
    return Boolean(user?.id);
  } catch {
    return false;
  }
}

async function isAuthorizedForWrite(req: any): Promise<boolean> {
  if (isAuthorizedBySecret(req)) return true;
  return isAuthorizedBySupabaseUser(req);
}

function isReadOnlyAction(action: CalendarAction): boolean {
  return action === 'list';
}

function getAction(req: any): CalendarAction {
  const raw = String(req.body?.action || req.query?.action || '').toLowerCase();
  if (raw === 'create' || raw === 'update' || raw === 'delete' || raw === 'list') return raw;
  return 'list';
}

function json(res: any, status: number, payload: any) {
  return res.status(status).json(payload);
}

function sanitizePayload(payload: any) {
  if (!payload || typeof payload !== 'object') return payload;
  const { authToken, ...rest } = payload;
  return rest;
}

async function logCalendarEvent(params: {
  action: CalendarAction;
  status: 'success' | 'error';
  requestPayload?: any;
  responsePayload?: any;
  errorMessage?: string;
}) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return;

  try {
    const sb = createClient(supabaseUrl, serviceKey);
    const eventId = `calendar_${params.action}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    await sb.from('integration_events').insert({
      event_id: eventId,
      event_type: `calendar_${params.action}`,
      direction: 'inbound',
      status: params.status,
      payload: {
        action: params.action,
        request: sanitizePayload(params.requestPayload),
        response: params.responsePayload,
        error: params.errorMessage || null,
        source: 'api/n8n/calendar',
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    // Telemetria não pode quebrar o fluxo da agenda.
  }
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

async function gcal(path: string, method: string, accessToken: string, body?: any) {
  const calendarId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || 'primary');
  const url = `${GOOGLE_CALENDAR_API}/calendars/${calendarId}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Google Calendar error: ${res.status} ${JSON.stringify(data)}`);
  }

  return data;
}

function rangesOverlap(startA: string, endA: string, startB?: string, endB?: string) {
  if (!startB || !endB) return false;
  return new Date(startA).getTime() < new Date(endB).getTime() && new Date(endA).getTime() > new Date(startB).getTime();
}

async function findCalendarConflicts(params: {
  accessToken: string;
  startIso: string;
  endIso: string;
  ignoreEventId?: string;
}) {
  const query = new URLSearchParams({
    timeMin: params.startIso,
    timeMax: params.endIso,
    singleEvents: 'true',
    orderBy: 'startTime',
  }).toString();

  const data = await gcal(`/events?${query}`, 'GET', params.accessToken);
  const items = Array.isArray(data.items) ? data.items : [];

  return items.filter((event: any) => {
    if (!event?.id) return false;
    if (params.ignoreEventId && event.id === params.ignoreEventId) return false;
    const start = event?.start?.dateTime || event?.start?.date;
    const end = event?.end?.dateTime || event?.end?.date;
    return rangesOverlap(params.startIso, params.endIso, start, end);
  });
}

function normalizeDateTime(value: any): string {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    throw new Error('Invalid date. Use ISO format, e.g. 2026-06-01T14:00:00-03:00');
  }
  return dt.toISOString();
}

function readLeadId(req: any): string {
  return String(req.body?.leadId || req.query?.leadId || '').trim();
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const action = getAction(req);

  if (!isReadOnlyAction(action)) {
    const allowed = await isAuthorizedForWrite(req);
    if (!allowed) {
      return json(res, 401, { ok: false, action, error: 'Unauthorized' });
    }
  }

  const timezone = String(req.body?.timezone || req.query?.timezone || process.env.TZ || 'America/Fortaleza');
  const leadId = readLeadId(req);

  try {
    const accessToken = await getGoogleAccessToken();

    if (action === 'list') {
      const timeMin = req.body?.timeMin || req.query?.timeMin || new Date().toISOString();
      const days = Number(req.body?.days || req.query?.days || 14);
      const end = new Date(timeMin);
      end.setDate(end.getDate() + (Number.isFinite(days) ? days : 14));

      const query = new URLSearchParams({
        timeMin: new Date(timeMin).toISOString(),
        timeMax: end.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
      }).toString();

      const data = await gcal(`/events?${query}`, 'GET', accessToken);
      const responsePayload = {
        ok: true,
        action,
        count: Array.isArray(data.items) ? data.items.length : 0,
        events: data.items || [],
      };
      await logCalendarEvent({ action, status: 'success', requestPayload: req.body || req.query, responsePayload });
      return json(res, 200, responsePayload);
    }

    if (action === 'create') {
      const summary = String(req.body?.summary || '').trim();
      const start = req.body?.start;
      const end = req.body?.end;

      if (!summary || !start || !end) {
        return json(res, 400, { ok: false, error: 'Missing required fields: summary, start, end' });
      }

      const normalizedStart = normalizeDateTime(start);
      const normalizedEnd = normalizeDateTime(end);
      const conflicts = await findCalendarConflicts({
        accessToken,
        startIso: normalizedStart,
        endIso: normalizedEnd,
      });
      if (conflicts.length > 0) {
        return json(res, 409, {
          ok: false,
          action,
          error: 'time_conflict',
          details: 'Ja existe outro evento neste horario.',
          conflicts: conflicts.map((event: any) => ({
            id: event.id,
            summary: event.summary || 'Sem titulo',
            start: event?.start?.dateTime || event?.start?.date || null,
            end: event?.end?.dateTime || event?.end?.date || null,
          })),
        });
      }

      const payload = {
        summary,
        description: req.body?.description || '',
        location: req.body?.location || '',
        attendees: Array.isArray(req.body?.attendees)
          ? req.body.attendees.map((email: string) => ({ email }))
          : undefined,
        start: { dateTime: normalizedStart, timeZone: timezone },
        end: { dateTime: normalizedEnd, timeZone: timezone },
      };

      const event = await gcal('/events', 'POST', accessToken, payload);
      if (leadId) {
        await updateLeadOps({
          leadId,
          calendarEventId: event.id,
          lastAppointmentAt: normalizedStart,
          conversationStatus: 'agendado',
          appointmentStatus: 'scheduled',
          appointmentConfirmedAt: null,
          lastConfirmationSentAt: null,
          lastReminderSentAt: null,
          lastNoShowCheckSentAt: null,
        });
      }
      const responsePayload = {
        ok: true,
        action,
        eventId: event.id,
        htmlLink: event.htmlLink,
        event,
      };
      await logCalendarEvent({ action, status: 'success', requestPayload: req.body, responsePayload });
      return json(res, 200, responsePayload);
    }

    if (action === 'update') {
      const eventId = String(req.body?.eventId || '').trim();
      if (!eventId) {
        return json(res, 400, { ok: false, error: 'Missing required field: eventId' });
      }

      const current = await gcal(`/events/${encodeURIComponent(eventId)}`, 'GET', accessToken);
      const nextStart = req.body?.start ? normalizeDateTime(req.body.start) : current?.start?.dateTime;
      const nextEnd = req.body?.end ? normalizeDateTime(req.body.end) : current?.end?.dateTime;

      if (nextStart && nextEnd) {
        const conflicts = await findCalendarConflicts({
          accessToken,
          startIso: nextStart,
          endIso: nextEnd,
          ignoreEventId: eventId,
        });
        if (conflicts.length > 0) {
          return json(res, 409, {
            ok: false,
            action,
            error: 'time_conflict',
            details: 'Ja existe outro evento neste horario.',
            conflicts: conflicts.map((event: any) => ({
              id: event.id,
              summary: event.summary || 'Sem titulo',
              start: event?.start?.dateTime || event?.start?.date || null,
              end: event?.end?.dateTime || event?.end?.date || null,
            })),
          });
        }
      }

      const payload = {
        summary: req.body?.summary ?? current.summary,
        description: req.body?.description ?? current.description,
        location: req.body?.location ?? current.location,
        attendees: Array.isArray(req.body?.attendees)
          ? req.body.attendees.map((email: string) => ({ email }))
          : current.attendees,
        start: req.body?.start
          ? { dateTime: nextStart, timeZone: timezone }
          : current.start,
        end: req.body?.end
          ? { dateTime: nextEnd, timeZone: timezone }
          : current.end,
      };

      const event = await gcal(`/events/${encodeURIComponent(eventId)}`, 'PUT', accessToken, payload);
      if (leadId) {
        await updateLeadOps({
          leadId,
          calendarEventId: event.id,
          lastAppointmentAt: nextStart || null,
          conversationStatus: 'agendado',
          appointmentStatus: 'scheduled',
          appointmentConfirmedAt: null,
          lastConfirmationSentAt: null,
          lastReminderSentAt: null,
          lastNoShowCheckSentAt: null,
        });
      }
      const responsePayload = {
        ok: true,
        action,
        eventId: event.id,
        htmlLink: event.htmlLink,
        event,
      };
      await logCalendarEvent({ action, status: 'success', requestPayload: req.body, responsePayload });
      return json(res, 200, responsePayload);
    }

    if (action === 'delete') {
      const eventId = String(req.body?.eventId || '').trim();
      if (!eventId) {
        return json(res, 400, { ok: false, error: 'Missing required field: eventId' });
      }

      await gcal(`/events/${encodeURIComponent(eventId)}`, 'DELETE', accessToken);
      if (leadId) {
        await updateLeadOps({
          leadId,
          calendarEventId: null,
          appointmentStatus: 'canceled',
        });
      }
      const responsePayload = {
        ok: true,
        action,
        eventId,
      };
      await logCalendarEvent({ action, status: 'success', requestPayload: req.body, responsePayload });
      return json(res, 200, responsePayload);
    }

    return json(res, 400, { ok: false, error: 'Invalid action' });
  } catch (err: any) {
    await logCalendarEvent({
      action,
      status: 'error',
      requestPayload: req.body || req.query,
      errorMessage: err?.message || 'unknown_error',
    });

    return json(res, 500, {
      ok: false,
      action,
      error: err?.message || 'unknown_error',
      timestamp: new Date().toISOString(),
    });
  }
}
