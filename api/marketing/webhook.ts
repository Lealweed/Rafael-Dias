import { getServiceSupabase, normalizePhone } from '../_lib/crm.js';

export default async function handler(req: any, res: any) {
  const method = req.method;

  // 1. Meta Webhook GET Verification (Hub Challenge Verification)
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

  // 2. POST Verification Token (For Google or Meta payload checking)
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
  let rawPayload = req.body;

  try {
    if (platform === 'google') {
      // Parse Google Ads Lead Form payload
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
      // Parse Meta Ads payload
      const entry = req.body.entry || [];
      if (entry.length > 0 && entry[0].changes && entry[0].changes.length > 0) {
        const changeValue = entry[0].changes[0].value;
        const leadgenId = changeValue.leadgen_id;
        utmCampaign = changeValue.adgroup_id ? `AdGroup_${changeValue.adgroup_id}` : 'Meta Ads Form';

        const metaAccessToken = process.env.META_ACCESS_TOKEN;
        if (metaAccessToken && leadgenId) {
          // Fetch actual lead details from Meta Graph API using leadgen_id via native fetch
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
          // Fallback parsing if payload is simulated directly
          fullName = req.body.full_name || req.body.name || '';
          phone = req.body.phone || req.body.phone_number || '';
          email = req.body.email || '';
          if (req.body.utm_campaign) utmCampaign = req.body.utm_campaign;
        }
      } else {
        // Fallback for flat body structure
        fullName = req.body.full_name || req.body.name || '';
        phone = req.body.phone || req.body.phone_number || '';
        email = req.body.email || '';
        if (req.body.utm_campaign) utmCampaign = req.body.utm_campaign;
      }
    }

    // Normalize phone number
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({ error: 'Missing or invalid phone number in payload' });
    }

    // Determine target campaign name if matches database campaigns
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

    // Insert or update lead in Supabase
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', normalizedPhone)
      .limit(1)
      .maybeSingle();

    let leadResult;
    if (existingLead) {
      // Update existing lead with UTM details
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
      // Insert new lead
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
