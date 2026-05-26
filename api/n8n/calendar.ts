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

function normalizeDateTime(value: any): string {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    throw new Error('Invalid date. Use ISO format, e.g. 2026-06-01T14:00:00-03:00');
  }
  return dt.toISOString();
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
      return json(res, 200, {
        ok: true,
        action,
        count: Array.isArray(data.items) ? data.items.length : 0,
        events: data.items || [],
      });
    }

    if (action === 'create') {
      const summary = String(req.body?.summary || '').trim();
      const start = req.body?.start;
      const end = req.body?.end;

      if (!summary || !start || !end) {
        return json(res, 400, { ok: false, error: 'Missing required fields: summary, start, end' });
      }

      const payload = {
        summary,
        description: req.body?.description || '',
        location: req.body?.location || '',
        attendees: Array.isArray(req.body?.attendees)
          ? req.body.attendees.map((email: string) => ({ email }))
          : undefined,
        start: { dateTime: normalizeDateTime(start), timeZone: timezone },
        end: { dateTime: normalizeDateTime(end), timeZone: timezone },
      };

      const event = await gcal('/events', 'POST', accessToken, payload);
      return json(res, 200, {
        ok: true,
        action,
        eventId: event.id,
        htmlLink: event.htmlLink,
        event,
      });
    }

    if (action === 'update') {
      const eventId = String(req.body?.eventId || '').trim();
      if (!eventId) {
        return json(res, 400, { ok: false, error: 'Missing required field: eventId' });
      }

      const current = await gcal(`/events/${encodeURIComponent(eventId)}`, 'GET', accessToken);

      const payload = {
        summary: req.body?.summary ?? current.summary,
        description: req.body?.description ?? current.description,
        location: req.body?.location ?? current.location,
        attendees: Array.isArray(req.body?.attendees)
          ? req.body.attendees.map((email: string) => ({ email }))
          : current.attendees,
        start: req.body?.start
          ? { dateTime: normalizeDateTime(req.body.start), timeZone: timezone }
          : current.start,
        end: req.body?.end
          ? { dateTime: normalizeDateTime(req.body.end), timeZone: timezone }
          : current.end,
      };

      const event = await gcal(`/events/${encodeURIComponent(eventId)}`, 'PUT', accessToken, payload);
      return json(res, 200, {
        ok: true,
        action,
        eventId: event.id,
        htmlLink: event.htmlLink,
        event,
      });
    }

    if (action === 'delete') {
      const eventId = String(req.body?.eventId || '').trim();
      if (!eventId) {
        return json(res, 400, { ok: false, error: 'Missing required field: eventId' });
      }

      await gcal(`/events/${encodeURIComponent(eventId)}`, 'DELETE', accessToken);
      return json(res, 200, {
        ok: true,
        action,
        eventId,
      });
    }

    return json(res, 400, { ok: false, error: 'Invalid action' });
  } catch (err: any) {
    return json(res, 500, {
      ok: false,
      action,
      error: err?.message || 'unknown_error',
      timestamp: new Date().toISOString(),
    });
  }
}
