import { getServiceSupabase } from './crm.js';

export async function getAllSiteSettings() {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return { ok: false as const, reason: 'missing_supabase_service_role' };
  }

  const { data, error } = await supabase.from('site_settings').select('*');
  if (error) {
    return { ok: false as const, reason: 'query_failed', error };
  }

  const result: Record<string, any> = {};
  (data || []).forEach((item: any) => {
    result[item.key] = item.value;
  });

  return { ok: true as const, settings: result };
}

export async function setSiteSettings(settings: Record<string, any>) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return { ok: false as const, reason: 'missing_supabase_service_role' };
  }

  const rows = Object.entries(settings).map(([key, value]) => ({
    key,
    value,
  }));

  const { data, error } = await supabase
    .from('site_settings')
    .upsert(rows, { onConflict: 'key' });

  if (error) {
    return { ok: false as const, reason: 'upsert_failed', error };
  }

  return { ok: true as const, settings: Object.fromEntries((data || []).map((item: any) => [item.key, item.value])) };
}
