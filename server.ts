import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { findLeadByIdOrPhone, getLeadAutomationState, setLeadAutomationState } from "./api/_lib/automation.js";
import n8nInboundHandler from "./api/n8n/webhook.js";
import outboundHandler from "./api/n8n/outbound";
import calendarHandler from "./api/n8n/calendar.js";
import proposalDocHandler from "./api/n8n/proposal-doc.js";
import siteSettingsRouter from "./api/site-settings";
import leadsOpsHandler from "./api/leads/ops.js";
import appointmentsHandler from "./api/automation/appointments.js";
import stripeCheckoutHandler from "./api/stripe/checkout.js";
import stripeWebhookHandler from "./api/stripe/webhook.js";
import portalDataHandler from "./api/portal/data.js";
import healthHandler from "./api/health.js";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json());

  // API Routes (Fase 1: Healthcheck + Diagnostics)
  app.get("/api/health", healthHandler);
  app.get("/api/diag/crm-status", (req, res) => {
    req.query = { ...req.query, diag: '1' };
    return healthHandler(req, res);
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

  app.post("/api/n8n/webhook", n8nInboundHandler);
  app.post("/api/webhook/n8n", n8nInboundHandler);
  app.post("/api/webhook/inbound", n8nInboundHandler);

  app.post("/api/n8n/outbound", outboundHandler);
  app.post("/api/n8n/calendar", calendarHandler);
  app.get("/api/n8n/calendar", calendarHandler);
  app.post("/api/n8n/proposal-doc", proposalDocHandler);
  app.use("/api/site-settings", siteSettingsRouter);
  app.all("/api/leads/ops", leadsOpsHandler);
  app.all("/api/automation/appointments", appointmentsHandler);
  app.post("/api/stripe/checkout", stripeCheckoutHandler as any);
  app.post("/api/stripe/webhook", stripeWebhookHandler as any);
  app.post("/api/portal/data", portalDataHandler);
  // /api/portal/read-notification is now handled by portalDataHandler with action='read-notification'
  app.post("/api/portal/read-notification", portalDataHandler);

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
    app.get(/^(?!\/api).*/, (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
