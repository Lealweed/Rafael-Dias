import { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { getServiceSupabase } from "./_lib/crm.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const buffer = async (readable: any) => {
  if (Buffer.isBuffer(readable?.body)) {
    return readable.body;
  }
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
};

// ----------------------------------------------------
// Checkout Handler Code
// ----------------------------------------------------
async function handleCheckout(req: any, res: any, rawBody: Buffer) {
  let body: any = {};
  try {
    if (req.body && Object.keys(req.body).length > 0 && !Buffer.isBuffer(req.body)) {
      body = req.body;
    } else {
      body = JSON.parse(rawBody.toString('utf-8'));
    }
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON body payload." });
  }

  const { name, phone, email, cpf, treatment, date, slot, notes, source, requireFriday } = body;

  if (!name || !phone || !date || !slot) {
    return res.status(400).json({ error: "Dados incompletos para agendamento." });
  }

  const cleanPhone = phone.replace(/\D/g, "");
  const cleanCpf = String(cpf || "").replace(/\D/g, "");
  const sourceName = String(source || "site").trim();
  const treatmentName = String(treatment || "Avaliação Geral").trim();
  const notesText = String(notes || "").trim().slice(0, 1000);

  const appointmentDateStr = `${date}T${slot}:00`;
  const appointmentDate = new Date(appointmentDateStr);
  if (Number.isNaN(appointmentDate.getTime())) {
    return res.status(400).json({ error: "Data ou horario invalidos." });
  }

  if (requireFriday && appointmentDate.getDay() !== 5) {
    return res.status(400).json({ error: "A depilacao a laser esta disponivel para reserva online apenas às sextas-feiras." });
  }

  const depositAmountCents = Number(process.env.STRIPE_LASER_DEPOSIT_AMOUNT_CENTS || process.env.STRIPE_DEPOSIT_AMOUNT_CENTS || 15000);
  const depositAmount = depositAmountCents / 100;
  const totalAmount = Number(process.env.CONSULTATION_TOTAL_AMOUNT || 300);
  const remainingAmount = Math.max(totalAmount - depositAmount, 0);

  const supabase = getServiceSupabase();
  if (!supabase) {
    return res.status(500).json({ error: "Conexao com banco de dados nao configurada." });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    console.log("Stripe secret key missing. Executing in SIMULATOR mode.");
    try {
      let leadId: string;
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .eq("phone", cleanPhone)
        .maybeSingle();

      if (existingLead) {
        leadId = existingLead.id;
      } else {
        const { data: newLead, error: leadErr } = await supabase
          .from("leads")
          .insert({
            full_name: name.trim(),
            phone: cleanPhone,
            origin: sourceName === "depilacao-laser" ? "Depilacao a Laser Online (Simulado)" : "Agendamento Online (Simulado)",
            temperature: "warm",
            conversation_status: "agendado",
          })
          .select("id")
          .single();

        if (leadErr) throw leadErr;
        leadId = newLead.id;
      }

      const { error: apptErr } = await supabase
        .from("appointments")
        .insert({
          lead_id: leadId,
          title: `Consulta VIP: ${treatmentName}`,
          appointment_date: appointmentDate.toISOString(),
          status: "scheduled",
          notes: [`Agendamento com sinal R$ ${depositAmount.toFixed(2).replace(".", ",")} pago (Modo Simulacao)`, sourceName ? `Origem: ${sourceName}` : "", notesText ? `Observacoes: ${notesText}` : ""].filter(Boolean).join("\n"),
          cpf: cleanCpf || null,
          email: email || null,
          payment_status: "paid_deposit",
          deposit_amount: depositAmount,
          remaining_amount: remainingAmount,
          stripe_session_id: "sim_" + Date.now(),
        });

      if (apptErr) throw apptErr;

      try {
        const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
        let client_id = process.env.GOOGLE_CLIENT_ID;
        let client_secret = process.env.GOOGLE_CLIENT_SECRET;
        let refresh_token = process.env.GOOGLE_REFRESH_TOKEN;
        const timezone = process.env.TZ || "America/Fortaleza";

        // Fallback: fetch credentials from site_settings table
        if (!client_id || !client_secret || !refresh_token) {
          const sb = getServiceSupabase();
          if (sb) {
            const { data: dbSettings } = await sb
              .from('site_settings')
              .select('value')
              .eq('key', 'marketing_credentials')
              .maybeSingle();

            if (dbSettings && dbSettings.value && typeof dbSettings.value === 'object') {
              const val = dbSettings.value as any;
              if (val.google_client_id) client_id = val.google_client_id;
              if (val.google_client_secret) client_secret = val.google_client_secret;
              if (val.google_refresh_token) refresh_token = val.google_refresh_token;
            }
          }
        }

        if (client_id && client_secret && refresh_token) {
          const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
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
          
          if (tokenRes.ok && tokenData.access_token) {
            const accessToken = tokenData.access_token;
            const startIso = appointmentDate.toISOString();
            const endDate = new Date(appointmentDate.getTime() + 30 * 60000);
            const endIso = endDate.toISOString();

            const eventPayload = {
              summary: `Consulta VIP: ${treatmentName} - ${name} (Simulação)`,
              description: `Agendamento Online via Formulário de Simulação.\nPaciente: ${name}\nTelefone: ${cleanPhone}\nCPF: ${cpf || ''}\nEmail: ${email || ''}`,
              start: { dateTime: startIso, timeZone: timezone },
              end: { dateTime: endIso, timeZone: timezone },
              attendees: email ? [{ email }] : undefined,
            };

            const gcalRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(eventPayload),
            });

            if (gcalRes.ok) {
              const gcalEvent = await gcalRes.json();
              const { updateLeadOps } = await import("./_lib/crm.js");
              await updateLeadOps({
                leadId,
                calendarEventId: gcalEvent.id,
                lastAppointmentAt: startIso,
                conversationStatus: 'agendado',
                appointmentStatus: 'scheduled',
                appointmentConfirmedAt: null,
                lastConfirmationSentAt: null,
                lastReminderSentAt: null,
                lastNoShowCheckSentAt: null,
              });
              console.log(`Google Calendar event synced successfully (Simulated): ${gcalEvent.id}`);
            }
          }
        }
      } catch (gcalErr) {
        console.error("Google Calendar sync exception inside simulation:", gcalErr);
      }

      await supabase.from("landing_analytics").insert([
        { event_type: "form_submission", lead_id: leadId },
        { event_type: "whatsapp_redirect", lead_id: leadId }
      ]);

      await supabase.from("notifications").insert({
        recipient_id: leadId,
        title: "Agendamento Efetuado",
        message: `Seu agendamento para ${treatmentName} em ${new Date(appointmentDate).toLocaleDateString("pt-BR")} as ${slot} foi confirmado com sinal de R$ ${depositAmount.toFixed(2).replace(".", ",")} recebido (Modo Simulado).`
      });

      const successUrl = `/calendar?success=true&name=${encodeURIComponent(name)}&date=${date}&slot=${slot}&treatment=${encodeURIComponent(treatmentName)}&phone=${cleanPhone}&notes=${encodeURIComponent(`Sinal de R$ ${depositAmount.toFixed(2).replace(".", ",")} pago (Test Mode)`)}`;
      return res.status(200).json({ url: successUrl });

    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao registrar agendamento simulado: " + err.message });
    }
  }

  try {
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16" as any
    });

    const host = req.headers.host || "rafael-dias.vercel.app";
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const origin = `${protocol}://${host}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: sourceName === "depilacao-laser" ? "Sinal de Reserva - Depilação a Laser" : "Sinal de Reserva - Consulta VIP",
              description: `Dr. Rafael Dias - Procedimento: ${treatmentName} em ${date} as ${slot}. Valor restante de R$ ${remainingAmount.toFixed(2).replace(".", ",")} a ser pago no consultorio.`,
            },
            unit_amount: depositAmountCents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: email || undefined,
      metadata: {
        name,
        phone: cleanPhone,
        email: email || "",
        cpf: cleanCpf || "",
        treatment: treatmentName,
        date,
        slot,
        notes: notesText,
        source: sourceName,
        requireFriday: requireFriday ? "true" : "false",
      },
      success_url: `${origin}/calendar?session_id={CHECKOUT_SESSION_ID}&success=true&name=${encodeURIComponent(name)}&date=${date}&slot=${slot}&treatment=${encodeURIComponent(treatmentName)}&phone=${cleanPhone}`,
      cancel_url: sourceName === "depilacao-laser" ? `${origin}/depilacao-a-laser?checkout=cancelled` : `${origin}/`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe error:", err);
    return res.status(500).json({ error: "Falha ao iniciar sessao de pagamento com Stripe: " + err.message });
  }
}

// ----------------------------------------------------
// Webhook Handler Code
// ----------------------------------------------------
async function handleWebhook(req: any, res: any, rawBody: Buffer) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return res.status(500).json({ error: "Conexao com banco de dados nao configurada." });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return res.status(500).json({ error: "Configuracoes do Stripe nao encontradas." });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2023-10-16" as any,
  });

  const signature = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (metadata) {
      const { name, phone, email, cpf, treatment, date, slot } = metadata;
      const cleanPhone = phone.replace(/\D/g, "");

      try {
        let leadId: string;
        const { data: existingLead } = await supabase
          .from("leads")
          .select("id")
          .eq("phone", cleanPhone)
          .maybeSingle();

        if (existingLead) {
          leadId = existingLead.id;
        } else {
          const { data: newLead, error: leadErr } = await supabase
            .from("leads")
            .insert({
              full_name: name.trim(),
              phone: cleanPhone,
              origin: "Agendamento Online (Stripe)",
              temperature: "warm",
              conversation_status: "agendado",
            })
            .select("id")
            .single();

          if (leadErr) throw leadErr;
          leadId = newLead.id;
        }

        const appointmentDateStr = `${date}T${slot}:00`;
        const appointmentDate = new Date(appointmentDateStr);
        
        const { error: apptErr } = await supabase
          .from("appointments")
          .insert({
            lead_id: leadId,
            title: `Consulta VIP: ${treatment}`,
            appointment_date: appointmentDate.toISOString(),
            status: "scheduled",
            notes: "Agendamento com sinal R$ 150 pago via Stripe Checkout",
            cpf: cpf || null,
            email: email || null,
            payment_status: "paid_deposit",
            deposit_amount: 150.00,
            remaining_amount: 150.00,
            stripe_session_id: session.id,
          });

        if (apptErr) throw apptErr;

        try {
          const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
          let client_id = process.env.GOOGLE_CLIENT_ID;
          let client_secret = process.env.GOOGLE_CLIENT_SECRET;
          let refresh_token = process.env.GOOGLE_REFRESH_TOKEN;
          const timezone = process.env.TZ || "America/Fortaleza";

          // Fallback: fetch credentials from site_settings table
          if (!client_id || !client_secret || !refresh_token) {
            const sb = getServiceSupabase();
            if (sb) {
              const { data: dbSettings } = await sb
                .from('site_settings')
                .select('value')
                .eq('key', 'marketing_credentials')
                .maybeSingle();

              if (dbSettings && dbSettings.value && typeof dbSettings.value === 'object') {
                const val = dbSettings.value as any;
                if (val.google_client_id) client_id = val.google_client_id;
                if (val.google_client_secret) client_secret = val.google_client_secret;
                if (val.google_refresh_token) refresh_token = val.google_refresh_token;
              }
            }
          }

          if (client_id && client_secret && refresh_token) {
            const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
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
            
            if (tokenRes.ok && tokenData.access_token) {
              const accessToken = tokenData.access_token;
              const startIso = appointmentDate.toISOString();
              const endDate = new Date(appointmentDate.getTime() + 30 * 60000);
              const endIso = endDate.toISOString();

              const eventPayload = {
                summary: `Consulta VIP: ${treatment} - ${name}`,
                description: `Agendamento Online via Stripe.\nPaciente: ${name}\nTelefone: ${cleanPhone}\nCPF: ${cpf || ''}\nEmail: ${email || ''}`,
                start: { dateTime: startIso, timeZone: timezone },
                end: { dateTime: endIso, timeZone: timezone },
                attendees: email ? [{ email }] : undefined,
              };

              const gcalRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(eventPayload),
              });

              if (gcalRes.ok) {
                const gcalEvent = await gcalRes.json();
                const { updateLeadOps } = await import("./_lib/crm.js");
                await updateLeadOps({
                  leadId,
                  calendarEventId: gcalEvent.id,
                  lastAppointmentAt: startIso,
                  conversationStatus: 'agendado',
                  appointmentStatus: 'scheduled',
                  appointmentConfirmedAt: null,
                  lastConfirmationSentAt: null,
                  lastReminderSentAt: null,
                  lastNoShowCheckSentAt: null,
                });
                console.log(`Google Calendar event synced successfully: ${gcalEvent.id}`);
              }
            }
          }
        } catch (gcalErr) {
          console.error("Google Calendar sync exception inside webhook:", gcalErr);
        }

        await supabase.from("landing_analytics").insert([
          { event_type: "form_submission", lead_id: leadId },
          { event_type: "whatsapp_redirect", lead_id: leadId }
        ]);

        await supabase.from("notifications").insert({
          recipient_id: leadId,
          title: "Pagamento Confirmado",
          message: `O sinal de R$ 150,00 para o agendamento de ${treatment} em ${new Date(appointmentDate).toLocaleDateString("pt-BR")} as ${slot} foi confirmado via Stripe.`
        });

      } catch (dbErr: any) {
        console.error("Database entry creation failed inside webhook:", dbErr);
        return res.status(500).json({ error: "Webhook database entry creation failed" });
      }
    }
  }

  return res.status(200).json({ received: true });
}

// ----------------------------------------------------
// Main Router Export
// ----------------------------------------------------
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawBody = await buffer(req);
  const url = String(req.url || '').toLowerCase();
  
  if (url.includes('/webhook')) {
    return handleWebhook(req, res, rawBody);
  } else if (url.includes('/checkout')) {
    return handleCheckout(req, res, rawBody);
  }

  // Fallback check req.path
  const path = String((req as any).path || '').toLowerCase();
  if (path.includes('/webhook')) {
    return handleWebhook(req, res, rawBody);
  } else if (path.includes('/checkout')) {
    return handleCheckout(req, res, rawBody);
  }

  return res.status(404).json({ error: "Stripe endpoint not found" });
}
