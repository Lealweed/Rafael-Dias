import { getServiceSupabase } from '../_lib/crm.js';

// Default campaigns to seed in case table is empty
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = getServiceSupabase();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase service role client not initialized' });
  }

  // Meta API Credentials
  const metaAccessToken = process.env.META_ACCESS_TOKEN;
  const metaAdAccountId = process.env.META_AD_ACCOUNT_ID;

  // Google API Credentials
  const googleDevToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const googleClientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const googleRefreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const googleCustomerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

  const hasMetaCreds = Boolean(metaAccessToken && metaAdAccountId);
  const hasGoogleCreds = Boolean(googleDevToken && googleClientId && googleClientSecret && googleRefreshToken && googleCustomerId);

  const syncLog: string[] = [];

  try {
    // ----------------------------------------------------
    // CASE A: Sync Real Meta Ads Campaigns
    // ----------------------------------------------------
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

          // Update marketing_campaigns
          const { error } = await supabase
            .from('marketing_campaigns')
            .upsert({
              name: campName,
              platform: 'meta_ads',
              status: 'active',
              budget: 50.00, // Default budget wrapper
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

    // ----------------------------------------------------
    // CASE B: Sync Real Google Ads Campaigns
    // ----------------------------------------------------
    if (hasGoogleCreds) {
      try {
        // 1. Get OAuth Access Token via native fetch
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

        // 2. Query campaigns and metrics
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
          const cost = Number(row.metrics?.costMicros || 0) / 1000000; // Convert micros to currency unit

          // Update marketing_campaigns
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

    // ----------------------------------------------------
    // CASE C: Run Simulation/Mock Sync (Fallbacks)
    // ----------------------------------------------------
    if (!hasMetaCreds && !hasGoogleCreds) {
      // 1. Fetch campaigns from DB
      let { data: campaigns, error: fetchErr } = await supabase
        .from('marketing_campaigns')
        .select('*');

      if (fetchErr) throw fetchErr;

      // 2. Seed default mockup campaigns if table is empty
      if (!campaigns || campaigns.length === 0) {
        const { data: inserted, error: insertErr } = await supabase
          .from('marketing_campaigns')
          .insert(MOCK_SEED_CAMPAIGNS)
          .select('*');

        if (insertErr) throw insertErr;
        campaigns = inserted || [];
        syncLog.push("Seeded marketing_campaigns with 5 default simulation campaigns.");
      }

      // 3. Add randomized variations to simulate active daily traffic
      for (const camp of campaigns) {
        if (camp.status === 'active') {
          const newClicks = Math.floor(Math.random() * 8) + 2; // +2 to +9 clicks
          const newImpressions = newClicks * (Math.floor(Math.random() * 15) + 12); // CTR around 6-8%
          const avgCpc = camp.clicks > 0 ? (camp.cost / camp.clicks) : (Math.random() * 1.5 + 0.8);
          const addedCost = Number((newClicks * avgCpc).toFixed(2));

          const { error } = await supabase
            .from('marketing_campaigns')
            .update({
              impressions: camp.impressions + newImpressions,
              clicks: camp.clicks + newClicks,
              cost: Number(camp.cost) + addedCost,
              updated_at: new Date().toISOString()
            })
            .eq('id', camp.id);

          if (error) console.error(`Error updating simulation stats for campaign ${camp.name}:`, error);
        }
      }

      syncLog.push("Simulation mode active (Credentials missing in .env). Applied random daily traffic variations (+10%).");
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
