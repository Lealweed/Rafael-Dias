import { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { getServiceSupabase } from "../_lib/crm";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, phone, email, cpf, treatment, date, slot } = req.body;

  if (!name || !phone || !date || !slot) {
    return res.status(400).json({ error: "Dados incompletos para agendamento." });
  }

  const cleanPhone = phone.replace(/\D/g, "");

  // Create Supabase client
  const supabase = getServiceSupabase();
  if (!supabase) {
    return res.status(500).json({ error: "Conexao com banco de dados nao configurada." });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    console.log("Stripe secret key missing. Executing in SIMULATOR mode.");
    
    try {
      // 1. Find or create lead
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
            origin: "Agendamento Online (Simulado)",
            temperature: "warm",
            conversation_status: "agendado",
          })
          .select("id")
          .single();

        if (leadErr) throw leadErr;
        leadId = newLead.id;
      }

      // 2. Create calendar appointment with sinal / payment status
      const appointmentDateStr = `${date}T${slot}:00`;
      const appointmentDate = new Date(appointmentDateStr);
      
      const { error: apptErr } = await supabase
        .from("appointments")
        .insert({
          lead_id: leadId,
          title: `Consulta VIP: ${treatment}`,
          appointment_date: appointmentDate.toISOString(),
          status: "scheduled",
          notes: "Agendamento com sinal R$ 150 pago (Modo Simulacao)",
          cpf: cpf || null,
          email: email || null,
          payment_status: "paid_deposit", // paid sinal
          deposit_amount: 150.00,
          remaining_amount: 150.00,
          stripe_session_id: "sim_" + Date.now(),
        });

      if (apptErr) throw apptErr;

      // 3. Log Analytics
      await supabase.from("landing_analytics").insert([
        { event_type: "form_submission", lead_id: leadId },
        { event_type: "whatsapp_redirect", lead_id: leadId }
      ]);

      // 4. Publish notification
      await supabase.from("notifications").insert({
        recipient_id: leadId,
        title: "Agendamento Efetuado",
        message: `Seu agendamento para ${treatment} em ${new Date(appointmentDate).toLocaleDateString("pt-BR")} as ${slot} foi confirmado com sinal de R$ 150,00 recebido (Modo Simulado).`
      });

      const successUrl = `/calendar?success=true&name=${encodeURIComponent(name)}&date=${date}&slot=${slot}&treatment=${encodeURIComponent(treatment)}&phone=${cleanPhone}&notes=${encodeURIComponent("Sinal de R$ 150,00 pago (Test Mode)")}`;
      return res.status(200).json({ url: successUrl });

    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ error: "Erro ao registrar agendamento simulado: " + err.message });
    }
  }

  // Real Stripe Integration
  try {
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16" as any
    });

    const host = req.headers.host || "rafael-dias.vercel.app";
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const origin = `${protocol}://${host}`;

    // Create session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: "Sinal de Reserva - Consulta VIP",
              description: `Dr. Rafael Dias - Procedimento: ${treatment} em ${date} as ${slot}. Valor restante de R$ 150,00 a ser pago no consultorio.`,
            },
            unit_amount: 15000, // R$ 150,00 in cents
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
        cpf: cpf || "",
        treatment,
        date,
        slot,
      },
      success_url: `${origin}/calendar?session_id={CHECKOUT_SESSION_ID}&success=true&name=${encodeURIComponent(name)}&date=${date}&slot=${slot}&treatment=${encodeURIComponent(treatment)}&phone=${cleanPhone}`,
      cancel_url: `${origin}/`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe error:", err);
    return res.status(500).json({ error: "Falha ao iniciar sessao de pagamento com Stripe: " + err.message });
  }
}
