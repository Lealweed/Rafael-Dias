import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { findLeadByIdOrPhone, getLeadAutomationState, setLeadAutomationState } from "./api/_lib/automation";
import outboundHandler from "./api/n8n/outbound";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes (Fase 1: Healthcheck)
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      supabase: process.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "missing",
      n8n: process.env.N8N_WEBHOOK_OUTBOUND_TOKEN ? "configured" : "missing"
    });
  });

  app.get("/api/conversations/automation", async (req, res) => {
    const leadId = String(req.query.leadId || "").trim();
    const phone = String(req.query.phone || "").trim();
    if (!leadId && !phone) {
      return res.status(400).json({ ok: false, error: "Missing required field: leadId or phone" });
    }

    const state = leadId ? await getLeadAutomationState(leadId) : await findLeadByIdOrPhone({ phone });
    if (!state.ok) {
      const status = state.reason === "lead_not_found" ? 404 : 500;
      return res.status(status).json({ ok: false, error: state.reason });
    }

    return res.json({ ok: true, lead: state.lead });
  });

  app.post("/api/conversations/automation", async (req, res) => {
    const leadId = String(req.body?.leadId || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const action = String(req.body?.action || "").trim().toLowerCase();

    if (!leadId && !phone) {
      return res.status(400).json({ ok: false, error: "Missing required field: leadId or phone" });
    }

    if (action !== "pause" && action !== "resume") {
      return res.status(400).json({ ok: false, error: "Invalid action. Use pause or resume." });
    }

    const state = await setLeadAutomationState({
      leadId,
      phone,
      status: action === "pause" ? "paused_human" : "active",
    });

    if (!state.ok) {
      const status = state.reason === "lead_not_found" ? 404 : 500;
      return res.status(status).json({ ok: false, error: state.reason });
    }

    return res.json({ ok: true, lead: state.lead });
  });

  // API Route: n8n Webhook Inbound
  const handleInboundWebhook = async (req: express.Request, res: express.Response) => {
    const authHeader = String(req.headers['authorization'] || '').trim();
    const expectedSecret = process.env.N8N_WEBHOOK_INBOUND_SECRET;

    // Accept both formats to avoid integration drift:
    // 1) Authorization: Bearer <secret>
    // 2) Authorization: <secret>
    if (expectedSecret) {
      const bearer = `Bearer ${expectedSecret}`;
      const secretOnly = expectedSecret;
      const authorized = authHeader === bearer || authHeader === secretOnly;

      if (!authorized) {
        console.warn("Unauthorized webhook attempt:", { authHeader });
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const payload = req.body;
    console.log("Recebido payload do n8n webhook in:", JSON.stringify(payload, null, 2));
    
    if (!payload || Object.keys(payload).length === 0) {
       return res.status(400).json({ error: "Missing payload" });
    }
    
    const eventId = payload.event_id || payload.id || payload.message_id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Inbound webhook must run with service role to avoid RLS/write failures.
    if (!supabaseUrl || !supabaseServiceKey) {
        console.warn("Supabase URL/service role not configured for webhook. Logging to console.");
        return res.json({ received: true, simulated: true, timestamp: new Date().toISOString(), reason: "missing_supabase_service_role" });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
      // 1. Save integration event
      const { error: eventError } = await supabase.from('integration_events').insert({
         event_id: eventId,
         event_type: payload.type || payload.event || 'inbound_message',
         direction: 'inbound',
         payload: payload,
         status: 'success'
      });

      if (eventError) {
         if (eventError.code === '23505') { // unique violation
            return res.json({ received: true, status: 'already_processed', timestamp: new Date().toISOString() });
         }
         console.error("Save event warning:", eventError);
      }

      // 2. Process message & Lead
      // Extract phone from various possible formats (Evolution API, WZAPI, Wati, Gupshup, generic)
      let phone = payload.phone || payload.destination || payload.from || payload.remoteJid || payload.wa_id || payload.sender;
      
      // If it's an object with data (like Evolution API)
      if (payload.data && payload.data.key && payload.data.key.remoteJid) {
          phone = payload.data.key.remoteJid;
      } else if (payload.data && payload.data.message && payload.data.pushName) {
          phone = payload.data.key?.remoteJid || phone;
      }
      
      if (phone) {
          // clean up phone format (remove @s.whatsapp.net etc)
          phone = phone.toString().split('@')[0];
          
          let content = payload.message || payload.text || payload.content || JSON.stringify(payload);
          let name = payload.name || payload.contact_name || payload.pushName || (payload.data && payload.data.pushName) || phone;

          if (payload.data && payload.data.message) {
              const msgNode = payload.data.message;
              content = msgNode.conversation || msgNode.extendedTextMessage?.text || content;
          }

          // Find lead by phone using ilike to match suffixes if needed, or exact match
          let { data: leads, error: findError } = await supabase.from('leads').select('id, automation_status').like('phone', `%${phone.slice(-8)}`).limit(1);
          let lead_id = leads && leads.length > 0 ? leads[0].id : null;
          let current_automation_status = leads && leads.length > 0 ? leads[0].automation_status : 'active';

          if (!lead_id) {
             // Create new lead
             const { data: newLead, error: insertLeadError } = await supabase.from('leads').insert({
                full_name: name,
                phone: phone,
                origin: 'n8n Webhook',
                temperature: 'cold',
                automation_status: 'active'
             }).select('id, automation_status').single();
             if (newLead) {
                 lead_id = newLead.id;
                 current_automation_status = newLead.automation_status || 'active';
             }
          }

          if (lead_id) {
             // Ensure conversation exists
             let { data: convs } = await supabase.from('conversations').select('id').eq('lead_id', lead_id).limit(1);
             let conv_id = convs && convs.length > 0 ? convs[0].id : null;

             if (!conv_id) {
                const { data: newConv } = await supabase.from('conversations').insert({ lead_id }).select('id').single();
                if (newConv) conv_id = newConv.id;
             }
             
             if (conv_id) {
                // Insert message
                await supabase.from('messages').insert({
                   conversation_id: conv_id,
                   direction: 'inbound',
                   type: 'text',
                   content: typeof content === 'string' ? content : JSON.stringify(content),
                   n8n_message_id: eventId
                });
                
                // Update lead last_interaction_at
                await supabase.from('leads').update({ last_interaction_at: new Date().toISOString() }).eq('id', lead_id);
             }
          }
      } else {
        console.warn("Could not extract phone number from payload", payload);
      }

      // We explicitly return automation_status here so n8n can immediately stop the flow if it is "paused_human"
      res.json({ 
          received: true, 
          simulated: false, 
          automation_status: current_automation_status,
          timestamp: new Date().toISOString() 
      });
    } catch (err: any) {
      console.error("Webhook processing error:", err);
      res.status(500).json({ error: "Internal error processing webhook" });
    }
  };

  app.post("/api/n8n/webhook", handleInboundWebhook);
  app.post("/api/webhook/n8n", handleInboundWebhook);
  app.post("/api/webhook/inbound", handleInboundWebhook);

  app.post("/api/n8n/outbound", outboundHandler);

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
