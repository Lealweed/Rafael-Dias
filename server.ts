import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

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
          let { data: leads, error: findError } = await supabase.from('leads').select('id').eq('phone', phone).limit(1);
          let lead_id = leads && leads.length > 0 ? leads[0].id : null;

          if (!lead_id) {
             // Create new lead
             const { data: newLead, error: insertLeadError } = await supabase.from('leads').insert({
                full_name: name,
                phone: phone,
                origin: 'n8n Webhook',
                temperature: 'cold'
             }).select('id').single();
             if (newLead) lead_id = newLead.id;
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

      res.json({ received: true, simulated: false, timestamp: new Date().toISOString() });
    } catch (err: any) {
      console.error("Webhook processing error:", err);
      res.status(500).json({ error: "Internal error processing webhook" });
    }
  };

  app.post("/api/n8n/webhook", handleInboundWebhook);
  app.post("/api/webhook/n8n", handleInboundWebhook);
  app.post("/api/webhook/inbound", handleInboundWebhook);

  // API Route: n8n Webhook Outbound
  app.post("/api/n8n/outbound", async (req, res) => {
    const { contactId, message, type, destination } = req.body;
    console.log(`Sending message to ${destination} via n8n:`, req.body);
    
    // URL exposta no .env para enviar payload ao n8n
    const n8nUrl = process.env.VITE_N8N_OUTBOUND_WEBHOOK_URL || process.env.N8N_OUTBOUND_WEBHOOK_URL;
    
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          let { data: convs } = await supabase.from('conversations').select('id').eq('lead_id', contactId).limit(1);
          let conv_id = convs && convs.length > 0 ? convs[0].id : null;
          if (!conv_id) {
             const { data: newConv } = await supabase.from('conversations').insert({ lead_id: contactId }).select('id').single();
             if (newConv) conv_id = newConv.id;
          }

          if (conv_id) {
             await supabase.from('messages').insert({
                 conversation_id: conv_id,
                 direction: 'outbound',
                 type: 'text',
                 content: message,
                 n8n_message_id: `out_${Date.now()}`
             });
             
             await supabase.from('leads').update({ last_interaction_at: new Date().toISOString() }).eq('id', contactId);
          }
      }

      if (!n8nUrl || !n8nUrl.startsWith('http')) {
        console.warn("N8N_OUTBOUND_WEBHOOK_URL isValid URL is not set (received Token/JWT?). Simulating success.");
        return res.json({ success: true, simulated: true, timestamp: new Date().toISOString() });
      }

      // Simulação da chamada ao webhook n8n de saída
      const response = await fetch(n8nUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.N8N_WEBHOOK_OUTBOUND_TOKEN || ""}`
        },
        body: JSON.stringify({ contactId, message, type, destination, timestamp: new Date().toISOString() })
      });

      if (!response.ok) {
         throw new Error(`n8n error: ${response.statusText}`);
      }

      res.json({ success: true, timestamp: new Date().toISOString() });
    } catch (err: any) {
      console.error("Erro chamando webhook n8n:", err.message);
      res.status(500).json({ error: "Falha ao comunicar com n8n", details: err.message });
    }
  });

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
