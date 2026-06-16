import { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { getServiceSupabase } from "../_lib/crm";

export const config = {
  api: {
    bodyParser: false,
  },
};

const buffer = async (readable: any) => {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

  const rawBody = await buffer(req);
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
              origin: "Agendamento Online (Stripe)",
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
            notes: "Agendamento com sinal R$ 150 pago via Stripe Checkout",
            cpf: cpf || null,
            email: email || null,
            payment_status: "paid_deposit", // paid sinal
            deposit_amount: 150.00,
            remaining_amount: 150.00,
            stripe_session_id: session.id,
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
