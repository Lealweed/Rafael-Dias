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
  app.post("/api/n8n/webhook", async (req, res) => {
    const authHeader = req.headers['authorization'];
    const expectedSecret = process.env.N8N_WEBHOOK_INBOUND_SECRET;

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const payload = req.body;
    
    if (!payload || !payload.event_id) {
       return res.status(400).json({ error: "Missing event_id in payload" });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.warn("Supabase credentials not configured for webhook. Logging to console.");
        console.log("Recebido payload do n8n webhook in:", payload);
        return res.json({ received: true, simulated: true, timestamp: new Date().toISOString() });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
      // 1. Save integration event
      const { error: eventError } = await supabase.from('integration_events').insert({
         event_id: payload.event_id,
         event_type: payload.type || 'inbound_message',
         direction: 'inbound',
         payload: payload,
         status: 'success'
      });

      if (eventError) {
         if (eventError.code === '23505') { // unique violation
            return res.json({ received: true, status: 'already_processed', timestamp: new Date().toISOString() });
         }
         throw eventError;
      }

      // 2. Process message & Lead
      const phone = payload.phone || payload.destination || payload.from;
      if (phone) {
          // Find lead by phone
          let { data: leads, error: findError } = await supabase.from('leads').select('id').eq('phone', phone).limit(1);
          let lead_id = leads && leads.length > 0 ? leads[0].id : null;

          if (!lead_id) {
             // Create new lead
             const { data: newLead, error: insertLeadError } = await supabase.from('leads').insert({
                full_name: payload.name || phone,
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
                   content: payload.message || payload.text || JSON.stringify(payload),
                   n8n_message_id: payload.event_id
                });
                
                // Update lead last_interaction_at
                await supabase.from('leads').update({ last_interaction_at: new Date().toISOString() }).eq('id', lead_id);
             }
          }
      }

      res.json({ received: true, simulated: false, timestamp: new Date().toISOString() });
    } catch (err: any) {
      console.error("Webhook processing error:", err);
      res.status(500).json({ error: "Internal error processing webhook" });
    }
  });

  // API Route: n8n Webhook Outbound
  app.post("/api/n8n/outbound", async (req, res) => {
    const { contactId, message, type, destination } = req.body;
    console.log(`Sending message to ${destination} via n8n:`, req.body);
    
    // URL exposta no .env para enviar payload ao n8n
    const n8nUrl = process.env.VITE_N8N_OUTBOUND_WEBHOOK_URL || process.env.N8N_OUTBOUND_WEBHOOK_URL;
    
    if (!n8nUrl || !n8nUrl.startsWith('http')) {
      console.warn("N8N_OUTBOUND_WEBHOOK_URL isValid URL is not set (received Token/JWT?). Simulating success.");
      return res.json({ success: true, simulated: true, timestamp: new Date().toISOString() });
    }

    try {
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
