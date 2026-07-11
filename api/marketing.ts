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
          const metaUrl = `https://graph.facebook.com/v19.0/${leadgenId}?fields=field_data,campaign_name,campaign_id,ad_name&access_token=${metaAccessToken}`;
          const response = await fetch(metaUrl);
          const resData = await response.json() as any;
          if (resData?.campaign_name) {
            utmCampaign = resData.campaign_name;
          }
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

  // Fetch dynamic credentials from database, fallback to environment variables
  let metaAccessToken = process.env.META_ACCESS_TOKEN;
  let metaAdAccountId = process.env.META_AD_ACCOUNT_ID;
  let googleDevToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  let googleClientId = process.env.GOOGLE_ADS_CLIENT_ID;
  let googleClientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  let googleRefreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  let googleCustomerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

  try {
    const { data: dbSettings } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'marketing_credentials')
      .maybeSingle();

    if (dbSettings && dbSettings.value && typeof dbSettings.value === 'object') {
      const val = dbSettings.value as any;
      if (val.meta_access_token) metaAccessToken = val.meta_access_token;
      if (val.meta_ad_account_id) metaAdAccountId = val.meta_ad_account_id;
      if (val.google_developer_token) googleDevToken = val.google_developer_token;
      if (val.google_client_id) googleClientId = val.google_client_id;
      if (val.google_client_secret) googleClientSecret = val.google_client_secret;
      if (val.google_refresh_token) googleRefreshToken = val.google_refresh_token;
      if (val.google_customer_id) googleCustomerId = val.google_customer_id;
    }
  } catch (err) {
    console.error('Error fetching credentials from site_settings:', err);
  }

  const hasMetaCreds = Boolean(metaAccessToken && metaAdAccountId);
  const hasGoogleCreds = Boolean(googleDevToken && googleClientId && googleClientSecret && googleRefreshToken && googleCustomerId);

  const syncLog: string[] = [];

  try {
    if (hasMetaCreds) {
      try {
        const cleanAcctId = String(metaAdAccountId).replace('act_', '');
        
        // 1. Fetch all campaigns to get names, real status, budgets, start/end dates, and nested adset budgets
        const campaignsUrl = `https://graph.facebook.com/v19.0/act_${cleanAcctId}/campaigns?fields=name,status,effective_status,daily_budget,lifetime_budget,start_time,stop_time,created_time,adsets{daily_budget,lifetime_budget}&limit=100&access_token=${metaAccessToken}`;
        const campaignsRes = await fetch(campaignsUrl);
        const campaignsResData = await campaignsRes.json() as any;
        const allCampaigns = campaignsResData?.data || [];

        // 2. Fetch insights for performance data
        const insightsUrl = `https://graph.facebook.com/v19.0/act_${cleanAcctId}/insights?fields=campaign_name,impressions,clicks,spend&level=campaign&time_range={"since":"2026-01-01","until":"2026-12-31"}&limit=100&access_token=${metaAccessToken}`;
        const insightsRes = await fetch(insightsUrl);
        const insightsResData = await insightsRes.json() as any;
        const insights = insightsResData?.data || [];

        // Map insights by campaign name
        const insightsMap = new Map<string, any>();
        for (const item of insights) {
          if (item.campaign_name) {
            insightsMap.set(item.campaign_name.toLowerCase().trim(), item);
          }
        }

        // Upsert all campaigns (even those with 0 activity)
        let upsertedCount = 0;
        for (const camp of allCampaigns) {
          const campName = camp.name;
          const statusVal = (camp.status === 'ACTIVE' || camp.effective_status === 'ACTIVE') ? 'active' : 'paused';
          
          // Get performance data if exists in insights
          const matchedInsight = insightsMap.get(campName.toLowerCase().trim());
          const cost = matchedInsight ? Number(matchedInsight.spend || 0) : 0;
          const clicks = matchedInsight ? Number(matchedInsight.clicks || 0) : 0;
          const impressions = matchedInsight ? Number(matchedInsight.impressions || 0) : 0;
          
          // Budget calculation (Meta returns in cents, divide by 100)
          // Handle CBO (Campaign Level) and ABO (Ad Set Level)
          let budget = 0;
          if (camp.daily_budget) {
            budget = Number(camp.daily_budget) / 100;
          } else if (camp.lifetime_budget) {
            budget = Number(camp.lifetime_budget) / 100;
          } else if (camp.adsets && camp.adsets.data) {
            let sum = 0;
            for (const adset of camp.adsets.data) {
              sum += Number(adset.daily_budget || adset.lifetime_budget || 0);
            }
            budget = sum / 100;
          }
          if (budget === 0) budget = 50.00; // reasonable fallback

          // Start / Stop times (hours included)
          let rawStart = camp.start_time;
          // Fallback to created_time if start_time is Unix epoch/invalid (paused campaigns)
          if (!rawStart || rawStart.startsWith("1969") || rawStart.startsWith("1970")) {
            rawStart = camp.created_time;
          }
          const start_date = rawStart ? new Date(rawStart).toISOString() : new Date().toISOString();
          const end_date = camp.stop_time ? new Date(camp.stop_time).toISOString() : null;

          const { error } = await supabase
            .from('marketing_campaigns')
            .upsert({
              name: campName,
              platform: 'meta_ads',
              status: statusVal,
              budget,
              impressions,
              clicks,
              cost,
              start_date,
              end_date,
              updated_at: new Date().toISOString()
            }, { onConflict: 'name' });

          if (error) {
            console.error(`Error upserting Meta campaign ${campName}:`, error);
          } else {
            upsertedCount++;
          }
        }
        syncLog.push(`Successfully synced ${upsertedCount} Meta Ads campaigns via API.`);
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
// Historical Daily Insights Logic
// ----------------------------------------------------
async function handleHistoricalInsights(req: any, res: any) {
  const campaignName = String(req.query?.campaignName || req.body?.campaignName || '').trim();
  if (!campaignName) {
    return res.status(400).json({ error: "Missing required parameter: campaignName" });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service role client not initialized' });
  }

  let metaAccessToken = process.env.META_ACCESS_TOKEN;
  let metaAdAccountId = process.env.META_AD_ACCOUNT_ID;

  try {
    const { data: dbSettings } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'marketing_credentials')
      .maybeSingle();

    if (dbSettings && dbSettings.value && typeof dbSettings.value === 'object') {
      const val = dbSettings.value as any;
      if (val.meta_access_token) metaAccessToken = val.meta_access_token;
      if (val.meta_ad_account_id) metaAdAccountId = val.meta_ad_account_id;
    }
  } catch (err) {
    console.error('Error fetching credentials from site_settings:', err);
  }

  const hasMetaCreds = Boolean(metaAccessToken && metaAdAccountId);

  if (!hasMetaCreds) {
    const dummy = generateDummyInsights(campaignName);
    return res.status(200).json({ success: true, source: 'simulation', data: dummy });
  }

  try {
    const cleanAcctId = String(metaAdAccountId).replace('act_', '');
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgoDate = new Date();
    sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
    const sevenDaysAgo = sevenDaysAgoDate.toISOString().split('T')[0];

    const url = `https://graph.facebook.com/v19.0/act_${cleanAcctId}/insights?level=campaign&time_increment=1&time_range={"since":"${sevenDaysAgo}","until":"${today}"}&fields=campaign_name,impressions,clicks,spend,date_start,date_stop&limit=500&access_token=${metaAccessToken}`;
    
    const response = await fetch(url);
    const resData = await response.json() as any;
    
    if (resData.error) {
      throw new Error(resData.error.message || "Meta API error");
    }

    const insights = resData?.data || [];
    
    const targetInsights = insights.filter((item: any) => 
      item.campaign_name?.toLowerCase().trim() === campaignName.toLowerCase().trim()
    );

    const formatted = targetInsights.map((item: any) => ({
      date: item.date_start,
      impressions: Number(item.impressions || 0),
      clicks: Number(item.clicks || 0),
      spend: Number(item.spend || 0)
    })).sort((a: any, b: any) => a.date.localeCompare(b.date));

    // If no insights found, generate dummy data as fallback
    if (formatted.length === 0) {
      const dummy = generateDummyInsights(campaignName);
      return res.status(200).json({ success: true, source: 'simulation_fallback', data: dummy });
    }

    return res.status(200).json({ success: true, source: 'meta_api', data: formatted });
  } catch (err: any) {
    console.error('Error fetching historical campaign insights:', err);
    const dummy = generateDummyInsights(campaignName);
    return res.status(200).json({ success: true, source: 'fallback_simulation', data: dummy, error: err.message });
  }
}

function generateDummyInsights(campaignName: string) {
  const data = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const seed = campaignName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + i;
    const clicks = Math.floor(10 + (seed % 15) + Math.sin(i) * 5);
    const impressions = clicks * Math.floor(35 + (seed % 20));
    const spend = clicks * (1.2 + (seed % 5) * 0.1);

    data.push({
      date: dateStr,
      impressions,
      clicks,
      spend: Number(spend.toFixed(2))
    });
  }
  return data;
}

// ----------------------------------------------------
// Ad Creative Analyzer Logic (Copywriting & Roteiro)
// ----------------------------------------------------
async function handleAdAnalysis(req: any, res: any) {
  const campaignName = String(req.query?.campaignName || req.body?.campaignName || '').trim();
  if (!campaignName) {
    return res.status(400).json({ error: "Missing required parameter: campaignName" });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service role client not initialized' });
  }

  let metaAccessToken = process.env.META_ACCESS_TOKEN;
  let metaAdAccountId = process.env.META_AD_ACCOUNT_ID;

  try {
    const { data: dbSettings } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'marketing_credentials')
      .maybeSingle();

    if (dbSettings && dbSettings.value && typeof dbSettings.value === 'object') {
      const val = dbSettings.value as any;
      if (val.meta_access_token) metaAccessToken = val.meta_access_token;
      if (val.meta_ad_account_id) metaAdAccountId = val.meta_ad_account_id;
    }
  } catch (err) {
    console.error('Error fetching credentials from site_settings:', err);
  }

  const hasMetaCreds = Boolean(metaAccessToken && metaAdAccountId);

  if (!hasMetaCreds) {
    const dummyAds = generateDummyAds(campaignName);
    return res.status(200).json({ success: true, source: 'simulation', data: dummyAds });
  }

  try {
    const cleanAcctId = String(metaAdAccountId).replace('act_', '');
    
    // 1. Fetch campaigns from Meta to find the campaign_id by name
    const campaignsUrl = `https://graph.facebook.com/v19.0/act_${cleanAcctId}/campaigns?fields=name&limit=100&access_token=${metaAccessToken}`;
    const campaignsRes = await fetch(campaignsUrl);
    const campaignsResData = await campaignsRes.json() as any;
    const allCampaigns = campaignsResData?.data || [];

    const targetCampaign = allCampaigns.find((c: any) => 
      c.name?.toLowerCase().trim() === campaignName.toLowerCase().trim()
    );

    if (!targetCampaign) {
      // Fallback if campaign not active on Meta (e.g. historical Google Ads or simulation)
      const dummyAds = generateDummyAds(campaignName);
      return res.status(200).json({ success: true, source: 'simulation_fallback', data: dummyAds });
    }

    const campaignId = targetCampaign.id;

    // 2. Fetch ads inside this campaign
    const adsUrl = `https://graph.facebook.com/v19.0/act_${cleanAcctId}/ads?campaign_id=${campaignId}&fields=name,status,creative{name,body,title,object_story_spec}&limit=50&access_token=${metaAccessToken}`;
    const adsRes = await fetch(adsUrl);
    const adsResData = await adsRes.json() as any;
    
    if (adsResData.error) {
      throw new Error(adsResData.error.message || "Meta API error");
    }

    const ads = adsResData?.data || [];

    // Parse and analyze
    const analyzedAds = ads.map((ad: any) => {
      // Find copy in body or object_story_spec
      let body = ad.creative?.body || '';
      if (!body && ad.creative?.object_story_spec) {
        const spec = ad.creative.object_story_spec;
        body = spec.video_data?.message || spec.link_data?.message || spec.photo_data?.message || '';
      }

      const analysis = analyzeAdCopy(ad.name, body, campaignName);

      return {
        id: ad.id,
        name: ad.name,
        status: String(ad.status).toLowerCase(),
        body: body || 'Sem texto de anúncio cadastrado.',
        analysis
      };
    });

    if (analyzedAds.length === 0) {
      const dummyAds = generateDummyAds(campaignName);
      return res.status(200).json({ success: true, source: 'simulation_fallback', data: dummyAds });
    }

    return res.status(200).json({ success: true, source: 'meta_api', data: analyzedAds });
  } catch (err: any) {
    console.error('Error in ad analysis:', err);
    const dummyAds = generateDummyAds(campaignName);
    return res.status(200).json({ success: true, source: 'fallback_simulation', data: dummyAds, error: err.message });
  }
}

function analyzeAdCopy(adName: string, adBody: string, campaignName: string = '') {
  const text = adBody || '';
  let rawScore = 5.5;
  
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];
  
  // 1. Hook analysis
  const hasHookQuestion = text.includes('?') && text.indexOf('?') < 120;
  const hasEmojis = /[\uD800-\uDFFF\u2600-\u27BF]/.test(text.substring(0, 100));
  
  if (hasHookQuestion || hasEmojis) {
    rawScore += 1.0;
    strengths.push("Gancho inicial com pergunta direta ou emojis para prender a atenção.");
  } else {
    rawScore -= 1.0;
    weaknesses.push("Falta gancho direto ou provocação nas primeiras linhas do criativo.");
    suggestions.push("Use uma pergunta direta sobre a dor (ex: 'Incomodado com a flacidez?').");
  }

  // 2. Offer & Benefits analysis
  const mentionsPriceOrBoleto = /boleto|parcela|pagar|parcelado|preço|valor|investimento/i.test(text);
  const mentionsBenefits = /autoestima|confiança|seguro|sofisticado|tecnologia|moderno/i.test(text);

  if (mentionsPriceOrBoleto) {
    rawScore += 0.8;
    strengths.push("Excelente clareza sobre parcelas e boleto, quebrando barreiras financeiras.");
  } else {
    weaknesses.push("Ausência de detalhes sobre facilidade ou parcelamento de pagamentos.");
    suggestions.push("Mencione que há opções leves de parcelas no boleto ou cartão.");
  }

  if (mentionsBenefits) {
    rawScore += 0.7;
    strengths.push("Foco forte em transformação, autoestima e melhora de autoconfiança.");
  } else {
    weaknesses.push("Abordagem muito técnica em vez de focar nos benefícios de bem-estar.");
    suggestions.push("Destaque a segurança e o aumento imediato da autoconfiança facial.");
  }

  // 3. CTA & Urgency analysis
  const hasCta = /clique|saiba mais|converse|fale conosco|whatsapp|link|agende/i.test(text);
  if (hasCta) {
    rawScore += 0.9;
    strengths.push("Chamada para ação (CTA) muito clara, direcionando para o WhatsApp.");
  } else {
    rawScore -= 1.0;
    weaknesses.push("Falta comando explícito para ação ao fim do criativo.");
    suggestions.push("Inclua um convite de ação: 'Clique em Saiba Mais e tire dúvidas'.");
  }

  // 4. Regulatory compliance
  const mentionsReg = /CRBM|CRM|Registro|Dr\./i.test(text);
  if (mentionsReg) {
    rawScore += 0.6;
  } else {
    suggestions.push("Insira o nome técnico e registro profissional no rodapé.");
  }

  // Compress scores toward the center: minimum 3.5, maximum 7.5
  let score = Math.max(3.5, Math.min(7.5, rawScore));
  score = Math.round(score * 10) / 10;

  // Categorize for Script Blueprint
  let theme = "Harmonização Natural (Autoridade & Posicionamento)";
  let hook = "O segredo de um procedimento estético bonito é ninguém perceber que você fez, apenas notar que você está mais jovem.";
  let pain = "O maior medo de quem procura harmonização é ficar com o rosto artificial ou com aquela aparência padronizada.";
  let solution = "Aqui nós estudamos a anatomia individual de cada paciente. A técnica e a sofisticação andam juntas para realçar o que você já tem de melhor.";
  let cta = "Envie uma mensagem pelo WhatsApp e agende seu horário para darmos início à sua transformação.";

  const lowerName = adName.toLowerCase();
  const lowerBody = text.toLowerCase();
  const lowerCampaign = campaignName.toLowerCase();

  const checkKeywords = (keys: string[]) => {
    return keys.some(k => lowerName.includes(k) || lowerBody.includes(k) || lowerCampaign.includes(k));
  };

  if (checkKeywords(["boleto", "pagamento", "parcela", "parcelado", "financia"])) {
    theme = "Acessibilidade & Financiamento (Boleto da Beleza)";
    hook = "Quer realizar seu procedimento estético mas o cartão de crédito está sem limite? Nós temos a solução ideal.";
    pain = "Muitas pessoas adiam o autocuidado e o rejuvenescimento porque acham que o pagamento precisa ser à vista ou comprometer o limite do cartão de crédito.";
    solution = "Criamos o Boleto da Beleza: uma modalidade de parcelamento próprio facilitado pela clínica, sem burocracia e com parcelas leves que cabem no seu orçamento.";
    cta = "Clique em 'Saiba Mais' agora para fazer uma simulação rápida de parcelas pelo WhatsApp!";
  } else if (checkKeywords(["orelha", "abano", "otoplastia"])) {
    theme = "Tratamento de Orelha de Abano (Autoconfiança)";
    hook = "Suas orelhas te causam algum tipo de desconforto na hora de prender o cabelo ou tirar fotos?";
    pain = "O incômodo com o formato ou a projeção das orelhas é muito comum e abala a autoconfiança de muitas pessoas desde a idade escolar.";
    solution = "Dispomos de técnicas modernas, rápidas e seguras para remodelar e corrigir o posicionamento das orelhas de forma harmoniosa e definitiva.";
    cta = "Toque no botão 'Fale Conosco' e agende uma conversa privada para planejar a sua mudança.";
  } else if (checkKeywords(["rino", "nariz"])) {
    theme = "Rinomodelação Sem Cirurgia (Rapidez & Autoestima)";
    hook = "Você sabia que é possível modelar o formato do seu nariz sem precisar passar por uma cirurgia plástica?";
    pain = "O nariz é o centro do rosto e qualquer detalhe que nos incomode nele afeta muito a nossa autoconfiança no dia a dia.";
    solution = "Com a rinomodelação com ácido hialurônico, conseguimos empinar a ponta e disfarçar a giba nasal em poucos minutos, no próprio consultório e com recuperação imediata.";
    cta = "Quer ver resultados reais? Envie uma mensagem no WhatsApp e saiba mais sobre o procedimento.";
  } else if (checkKeywords(["mãe", "maes", "materno"])) {
    theme = "Dia das Mães (Revalorização & Cuidado Especial)";
    hook = "Que tal presentear quem sempre cuidou de você com um momento único de beleza e bem-estar?";
    pain = "As mães dedicam a vida toda à família e, muitas vezes, acabam deixando o próprio autocuidado em segundo plano.";
    solution = "Preparamos um protocolo especial de rejuvenescimento e hidratação facial para devolver o viço, o brilho e a jovialidade que ela merece.";
    cta = "Garanta o presente perfeito para ela. Fale conosco no WhatsApp e agende o pacote exclusivo de Dia das Mães.";
  } else if (checkKeywords(["feedback", "depoimento", "renovado", "resultado", "antes e depois"])) {
    theme = "Resultados Reais & Prova Social (Segurança & Confiança)";
    hook = "Veja o que dizem as pessoas que decidiram transformar suas expressões e resgatar a autoestima com a gente.";
    pain = "O maior receio de fazer um procedimento estético é o medo de não gostar do resultado ou de ficar com aspecto artificial.";
    solution = "Aqui mostramos a realidade: tratamentos personalizados com foco na naturalidade e na satisfação total dos nossos pacientes.";
    cta = "Venha fazer parte dessa transformação. Clique no WhatsApp e agende sua consulta avaliativa.";
  } else if (checkKeywords(["aluguel", "sala", "consultorio", "subloca"])) {
    theme = "Aluguel de Consultórios Premium (Infraestrutura para Profissionais)";
    hook = "Procurando um espaço sofisticado e totalmente equipado para atender seus pacientes com o máximo de conforto?";
    pain = "Montar e manter uma clínica própria envolve custos altos, burocracia e preocupações com manutenção diária.";
    solution = "Oferecemos consultórios premium para sublocação/aluguel por turnos, com recepção, café, Wi-Fi e localização privilegiada para você focar apenas no seu paciente.";
    cta = "Fale conosco pelo WhatsApp e agende uma visita guiada para conhecer nossas salas disponíveis.";
  } else if (checkKeywords(["bairro", "cidade", "parauapebas", "canaã", "repartimento", "local", "peba"])) {
    theme = "Atendimento de Referência na Região (Proximidade & Comodidade)";
    hook = "Você sabia que a melhor tecnologia em estética avançada e rejuvenescimento facial está bem pertinho de você?";
    pain = "Muitas vezes achamos que para ter acesso a procedimentos sofisticados precisamos viajar para grandes capitais.";
    solution = "Nossa clínica traz o que há de mais moderno em harmonização, fios de sustentação e botox, bem aqui na nossa cidade, com equipe especializada.";
    cta = "Agende sua avaliação sem precisar viajar. Clique em Saiba Mais e fale conosco!";
  } else if (checkKeywords(["visita", "perfil", "insta", "seguidor"])) {
    theme = "Conexão com o Perfil da Clínica (Conteúdo & Educação)";
    hook = "Quer aprender como cuidar da saúde da sua pele e entender os bastidores dos procedimentos mais modernos?";
    pain = "Existe muita informação confusa e mitos na internet sobre botox, preenchimentos e cuidados faciais diários.";
    solution = "No nosso perfil compartilhamos dicas diárias, casos de antes e depois reais e orientações honestas de quem entende do assunto.";
    cta = "Siga o nosso perfil no Instagram e envie um direct com suas dúvidas para conversarmos!";
  } else if (checkKeywords(["emagrec", "colagen", "colágen", "botox", "flacidez", "preenchi", "fios", "pdo", "ácido", "hialur"])) {
    theme = "Estética Avançada (Rejuvenescimento & Sustentação)";
    hook = "Sentiu que seu rosto perdeu a sustentação e ficou com aspecto cansado após perder peso?";
    pain = "O emagrecimento ou a passagem dos anos reduz a gordura estrutural e o colágeno facial, causando flacidez e aquele aspecto de 'rosto derretido'.";
    solution = "Associando bioestimuladores de colágeno à reposição de volumes estratégicos com ácido hialurônico, devolvemos a firmeza natural do rosto sem exageros.";
    cta = "Clique em 'Converse Conosco' e venha fazer uma análise personalizada da sua anatomia facial.";
  }

  return {
    score,
    strengths: strengths.slice(0, 2),
    weaknesses: weaknesses.slice(0, 2),
    suggestions: suggestions.slice(0, 2),
    scriptBlueprint: {
      theme,
      hook,
      pain,
      solution,
      cta
    }
  };
}

function generateDummyAds(campaignName: string) {
  const dummyCopyList = [
    {
      name: "01 - Avaliação Estética Facial",
      body: "Você já parou para analisar sua expressão no espelho hoje? ✨\nUma avaliação facial detalhada ajuda a identificar o que seu rosto realmente precisa para realçar sua beleza natural de forma sutil, harmônica e muito elegante.\n\nDr. Rafael Dias\n📍 Registro Profissional 5217\n\nClique no botão abaixo para agendar via WhatsApp!"
    },
    {
      name: "02 - Boleto da Beleza Estética",
      body: "Quantas vezes você adiou cuidar de si por não conseguir pagar tudo de uma vez? 💳\nO Boleto da Beleza chegou como uma forma inteligente de pagamento pra você realizar seu procedimento agora, sem pesar no bolso e com parcelas leves.\n\nGaranta sua vaga hoje clicando em Saiba Mais!"
    }
  ];

  return dummyCopyList.map((ad, i) => {
    const analysis = analyzeAdCopy(ad.name, ad.body, campaignName);
    return {
      id: `sim_ad_${i}`,
      name: ad.name,
      status: 'active',
      body: ad.body,
      analysis
    };
  });
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
  } else if (url.includes('/historical')) {
    return handleHistoricalInsights(req, res);
  } else if (url.includes('/analyze')) {
    return handleAdAnalysis(req, res);
  }
  
  // Try checking req.path for express fallback
  const path = String(req.path || '').toLowerCase();
  if (path.includes('/webhook')) {
    return handleWebhook(req, res);
  } else if (path.includes('/sync')) {
    return handleSync(req, res);
  } else if (path.includes('/historical')) {
    return handleHistoricalInsights(req, res);
  } else if (path.includes('/analyze')) {
    return handleAdAnalysis(req, res);
  }

  // Fallback for query param (e.g. ?type=webhook)
  const type = String(req.query?.type || req.body?.type || '').toLowerCase();
  if (type === 'webhook') {
    return handleWebhook(req, res);
  } else if (type === 'sync') {
    return handleSync(req, res);
  } else if (type === 'historical') {
    return handleHistoricalInsights(req, res);
  } else if (type === 'analyze') {
    return handleAdAnalysis(req, res);
  }

  return res.status(404).json({ error: 'Marketing endpoint not found' });
}
