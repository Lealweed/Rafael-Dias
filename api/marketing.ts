import { getServiceSupabase, normalizePhone } from './_lib/crm.js';

// ====================================================
// Sync Handler Config & Constants
// ====================================================
const MOCK_SEED_CAMPAIGNS = [
  {
    name: "Campanha Carrossel Botox 2026",
    platform: "meta_ads",
    status: "active",
    budget: 50.00,
    impressions: 24500,
    clicks: 1220,
    cost: 850.50,
    start_date: "2026-06-01"
  },
  {
    name: "Bioestimuladores de Colágeno - Vídeo",
    platform: "meta_ads",
    status: "active",
    budget: 75.00,
    impressions: 18200,
    clicks: 940,
    cost: 620.00,
    start_date: "2026-06-15"
  },
  {
    name: "Preenchimento Labial / Mandíbula - Pesquisa",
    platform: "google_ads",
    status: "active",
    budget: 100.00,
    impressions: 8900,
    clicks: 1050,
    cost: 1240.20,
    start_date: "2026-06-05"
  },
  {
    name: "Clínica Harmonização Facial Parauapebas",
    platform: "google_ads",
    status: "active",
    budget: 80.00,
    impressions: 12000,
    clicks: 1350,
    cost: 980.10,
    start_date: "2026-06-01"
  },
  {
    name: "Rinomodelação - Antes e Depois",
    platform: "meta_ads",
    status: "paused",
    budget: 40.00,
    impressions: 15000,
    clicks: 650,
    cost: 450.00,
    start_date: "2026-05-10",
    end_date: "2026-06-10"
  }
];

// ----------------------------------------------------
// Webhook Logic
// ----------------------------------------------------
async function handleWebhook(req: any, res: any) {
  const method = req.method;

  if (method === 'GET') {
    const hubMode = req.query['hub.mode'];
    const hubChallenge = req.query['hub.challenge'];
    const hubVerifyToken = req.query['hub.verify_token'];
    const expectedToken = process.env.MARKETING_WEBHOOK_TOKEN || 'rd_live_83726a19f';

    if (hubMode === 'subscribe' && hubVerifyToken === expectedToken) {
      console.log('Meta Webhook verified successfully.');
      return res.status(200).send(hubChallenge);
    }
    return res.status(403).json({ error: 'Verification token mismatch' });
  }

  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.query.token || req.body.google_key || req.headers['x-webhook-token'];
  const expectedToken = process.env.MARKETING_WEBHOOK_TOKEN || 'rd_live_83726a19f';

  if (token !== expectedToken) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service role client not initialized' });
  }

  const platform = req.query.platform || (req.body.google_key ? 'google' : 'meta');
  let fullName = '';
  let phone = '';
  let email = '';
  let utmSource = platform;
  let utmCampaign = '';
  let utmMedium = 'lead_form';

  try {
    if (platform === 'google') {
      const userColumnData = req.body.user_column_data || [];
      userColumnData.forEach((col: any) => {
        const name = String(col.column_name).toUpperCase();
        if (name.includes('FULL NAME') || name.includes('NAME')) {
          fullName = col.string_value;
        } else if (name.includes('PHONE NUMBER') || name.includes('PHONE')) {
          phone = col.string_value;
        } else if (name.includes('EMAIL')) {
          email = col.string_value;
        }
      });
      utmCampaign = req.body.campaign_id ? `Campaign_${req.body.campaign_id}` : 'Google Ads Form';
      
    } else {
      const entry = req.body.entry || [];
      if (entry.length > 0 && entry[0].changes && entry[0].changes.length > 0) {
        const changeValue = entry[0].changes[0].value;
        const leadgenId = changeValue.leadgen_id;
        utmCampaign = changeValue.adgroup_id ? `AdGroup_${changeValue.adgroup_id}` : 'Meta Ads Form';

        const metaAccessToken = process.env.META_ACCESS_TOKEN;
        if (metaAccessToken && leadgenId) {
          const metaUrl = `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${metaAccessToken}`;
          const response = await fetch(metaUrl);
          const resData = await response.json() as any;
          const fieldData = resData?.field_data || [];
          
          fieldData.forEach((field: any) => {
            const fieldName = String(field.name).toLowerCase();
            const val = field.values?.[0] || '';
            if (fieldName.includes('full_name') || fieldName.includes('name')) {
              fullName = val;
            } else if (fieldName.includes('phone') || fieldName.includes('whatsapp')) {
              phone = val;
            } else if (fieldName.includes('email')) {
              email = val;
            }
          });
        } else {
          fullName = req.body.full_name || req.body.name || '';
          phone = req.body.phone || req.body.phone_number || '';
          email = req.body.email || '';
          if (req.body.utm_campaign) utmCampaign = req.body.utm_campaign;
        }
      } else {
        fullName = req.body.full_name || req.body.name || '';
        phone = req.body.phone || req.body.phone_number || '';
        email = req.body.email || '';
        if (req.body.utm_campaign) utmCampaign = req.body.utm_campaign;
      }
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ error: 'Missing or invalid phone number in payload' });
    }

    if (utmCampaign) {
      const { data: matchedCampaign } = await supabase
        .from('marketing_campaigns')
        .select('name')
        .or(`name.ilike.%${utmCampaign}%,id.eq.${utmCampaign}`)
        .limit(1)
        .maybeSingle();
      if (matchedCampaign) {
        utmCampaign = matchedCampaign.name;
      }
    }

    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', normalizedPhone)
      .limit(1)
      .maybeSingle();

    let leadResult;
    if (existingLead) {
      leadResult = await supabase
        .from('leads')
        .update({
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign || 'Tráfego Pago',
          email: email || undefined,
          origin: platform === 'google' ? 'google_ads' : 'meta_ads',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingLead.id)
        .select('id, full_name, phone, email, origin, utm_source, utm_campaign')
        .single();
    } else {
      leadResult = await supabase
        .from('leads')
        .insert({
          full_name: fullName || `Lead ${utmSource}`,
          phone: normalizedPhone,
          email: email || null,
          origin: platform === 'google' ? 'google_ads' : 'meta_ads',
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign || 'Tráfego Pago',
          conversation_status: 'novo',
          temperature: 'warm',
          last_interaction_at: new Date().toISOString()
        })
        .select('id, full_name, phone, email, origin, utm_source, utm_campaign')
        .single();
    }

    if (leadResult.error) {
      throw leadResult.error;
    }

    return res.status(200).json({
      ok: true,
      lead_id: leadResult.data.id,
      name: leadResult.data.full_name,
      phone: leadResult.data.phone,
      utm_source: utmSource,
      utm_campaign: utmCampaign
    });

  } catch (err: any) {
    console.error('Error processing marketing webhook:', err);
    return res.status(500).json({ error: 'Internal server error', details: err?.message });
  }
}

// ----------------------------------------------------
// Sync Logic
// ----------------------------------------------------
async function handleSync(req: any, res: any) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service role client not initialized' });
  }

  const metaAccessToken = process.env.META_ACCESS_TOKEN;
  const metaAdAccountId = process.env.META_AD_ACCOUNT_ID;

  const googleDevToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const googleClientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const googleRefreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const googleCustomerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

  const hasMetaCreds = Boolean(metaAccessToken && metaAdAccountId);
  const hasGoogleCreds = Boolean(googleDevToken && googleClientId && googleClientSecret && googleRefreshToken && googleCustomerId);

  const syncLog: string[] = [];

  try {
    if (hasMetaCreds) {
      try {
        const cleanAcctId = String(metaAdAccountId).replace('act_', '');
        const metaUrl = `https://graph.facebook.com/v19.0/act_${cleanAcctId}/insights?fields=campaign_name,impressions,clicks,spend&level=campaign&time_range={"since":"2026-01-01","until":"2026-12-31"}&access_token=${metaAccessToken}`;
        
        const response = await fetch(metaUrl);
        const resData = await response.json() as any;
        const insights = resData?.data || [];

        for (const item of insights) {
          const campName = item.campaign_name;
          const cost = Number(item.spend || 0);
          const clicks = Number(item.clicks || 0);
          const impressions = Number(item.impressions || 0);

          const { error } = await supabase
            .from('marketing_campaigns')
            .upsert({
              name: campName,
              platform: 'meta_ads',
              status: 'active',
              budget: 50.00,
              impressions,
              clicks,
              cost,
              updated_at: new Date().toISOString()
            }, { onConflict: 'name' });

          if (error) console.error(`Error upserting Meta campaign ${campName}:`, error);
        }
        syncLog.push(`Successfully synced ${insights.length} Meta Ads campaigns via API.`);
      } catch (err: any) {
        console.error('Meta Ads sync failed:', err);
        syncLog.push(`Meta Ads API Sync Error: ${err?.message || err}`);
      }
    }

    if (hasGoogleCreds) {
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'refresh_token',
            client_id: googleClientId,
            client_secret: googleClientSecret,
            refresh_token: googleRefreshToken
          })
        });
        
        const tokenData = await tokenRes.json() as any;
        const accessToken = tokenData?.access_token;
        if (!accessToken) throw new Error('OAuth authentication token failed');

        const cleanCustomerId = String(googleCustomerId).replace(/-/g, '');
        const queryUrl = `https://googleads.googleapis.com/v15/customers/${cleanCustomerId}/googleAds:search`;
        
        const searchRes = await fetch(queryUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'developer-token': googleDevToken,
            'Authorization': `Bearer ${accessToken}`,
            'login-customer-id': cleanCustomerId
          },
          body: JSON.stringify({
            query: "SELECT campaign.id, campaign.name, campaign.status, metrics.impressions, metrics.clicks, metrics.cost_micros FROM campaign WHERE campaign.status IN ('ENABLED', 'PAUSED')"
          })
        });

        const searchData = await searchRes.json() as any;
        const results = searchData?.results || [];
        for (const row of results) {
          const campName = row.campaign?.name;
          const status = row.campaign?.status === 'ENABLED' ? 'active' : 'paused';
          const impressions = Number(row.metrics?.impressions || 0);
          const clicks = Number(row.metrics?.clicks || 0);
          const cost = Number(row.metrics?.costMicros || 0) / 1000000;

          const { error } = await supabase
            .from('marketing_campaigns')
            .upsert({
              name: campName,
              platform: 'google_ads',
              status,
              budget: 100.00,
              impressions,
              clicks,
              cost,
              updated_at: new Date().toISOString()
            }, { onConflict: 'name' });

          if (error) console.error(`Error upserting Google campaign ${campName}:`, error);
        }
        syncLog.push(`Successfully synced ${results.length} Google Ads campaigns via API.`);
      } catch (err: any) {
        console.error('Google Ads sync failed:', err);
        syncLog.push(`Google Ads API Sync Error: ${err?.message || err}`);
      }
    }

    if (!hasMetaCreds && !hasGoogleCreds) {
      syncLog.push("Nenhuma credencial do Meta Ads ou Google Ads configurada. Sincronização ignorada (modo simulação desativado).");
    }

    return res.status(200).json({
      success: true,
      sync_mode: (hasMetaCreds || hasGoogleCreds) ? 'production_api' : 'simulation',
      logs: syncLog,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error('Error syncing marketing campaigns:', err);
    return res.status(500).json({ error: 'Internal server error during sync', details: err?.message });
  }
}

// ----------------------------------------------------
// Main Router Export
// ----------------------------------------------------
export default async function handler(req: any, res: any) {
  // Determine action from URL path or query params
  const url = String(req.url || '').toLowerCase();
  
  if (url.includes('/webhook')) {
    return handleWebhook(req, res);
  } else if (url.includes('/sync')) {
    return handleSync(req, res);
  }
  
  // Try checking req.path for express fallback
  const path = String(req.path || '').toLowerCase();
  if (path.includes('/webhook')) {
    return handleWebhook(req, res);
  } else if (path.includes('/sync')) {
    return handleSync(req, res);
  }

  // Fallback for query param (e.g. ?type=webhook)
  const type = String(req.query?.type || req.body?.type || '').toLowerCase();
  if (type === 'webhook') {
    return handleWebhook(req, res);
  } else if (type === 'sync') {
    return handleSync(req, res);
  }

  return res.status(404).json({ error: 'Marketing endpoint not found' });
}
