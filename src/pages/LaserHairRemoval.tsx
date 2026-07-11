import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, CalendarDays, CheckCircle2, Clock, CreditCard, Loader2, Play, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { fetchSiteSettings, mergeMediaSettings, DEFAULT_MEDIA_SETTINGS } from "../lib/siteSettings";

const FRIDAY_SLOTS = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];

const TREATMENT_AREAS = [
  "Avaliação para depilação a laser",
  "Axilas",
  "Virilha",
  "Meia perna",
  "Perna completa",
  "Rosto",
  "Buço",
  "Costas",
  "Peito / Abdômen",
  "Pacote personalizado",
];

function nextFridays(count = 8) {
  const dates: Date[] = [];
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  const daysUntilFriday = (5 - cursor.getDay() + 7) % 7 || 7;
  cursor.setDate(cursor.getDate() + daysUntilFriday);

  while (dates.length < count) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }

  return dates;
}

function toDateInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatFriday(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`);
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export default function LaserHairRemoval() {
  const availableFridays = useMemo(() => nextFridays(10), []);
  const [siteSettings, setSiteSettings] = useState(DEFAULT_MEDIA_SETTINGS);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [area, setArea] = useState(TREATMENT_AREAS[0]);
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(availableFridays[0]));
  const [selectedSlot, setSelectedSlot] = useState(FRIDAY_SLOTS[0]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Depilação a Laser Premium em Parauapebas | Dr. Rafael Dias";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Sessões de depilação a laser seguras, eficazes e confortáveis com tecnologia de última geração. Resultados visíveis desde a primeira sessão. Agende agora.");
    }

    fetchSiteSettings().then((result) => {
      if (result.ok && result.settings) {
        setSiteSettings(mergeMediaSettings(result.settings));
      }
    });
  }, []);

  const handlePhoneChange = (value: string) => {
    const clean = onlyDigits(value).slice(0, 11);
    if (clean.length <= 2) return setPhone(clean);
    if (clean.length <= 7) return setPhone(`(${clean.slice(0, 2)}) ${clean.slice(2)}`);
    setPhone(`(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`);
  };

  const handleCpfChange = (value: string) => {
    const clean = onlyDigits(value).slice(0, 11);
    if (clean.length <= 3) return setCpf(clean);
    if (clean.length <= 6) return setCpf(`${clean.slice(0, 3)}.${clean.slice(3)}`);
    if (clean.length <= 9) return setCpf(`${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`);
    setCpf(`${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!name.trim() || onlyDigits(phone).length < 10 || !email.trim() || onlyDigits(cpf).length !== 11) {
      setError("Preencha nome, WhatsApp, e-mail e CPF antes de continuar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          cpf,
          treatment: `Depilação a Laser - ${area}`,
          date: selectedDate,
          slot: selectedSlot,
          notes,
          source: "depilacao-laser",
          requireFriday: true,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Não foi possível iniciar o pagamento agora.");
      }

      window.location.href = data.url;
    } catch (err: any) {
      setError(err?.message || "Falha ao conectar com o checkout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-black-void text-[#E3D5C1] overflow-x-hidden selection:bg-gold/30 selection:text-gold">
      <section className="relative overflow-hidden border-b border-white/5 px-6 py-8 md:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.16),transparent_35%),radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.07),transparent_22%)]" />
        <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-3">
            <img src="/assets/logo.jpg" alt="Instituto Rafael Dias" className="h-11 w-11 rounded-full border border-gold/30 object-cover" />
            <div>
              <p className="text-[14px] uppercase tracking-[0.5em] text-gold">Instituto</p>
              <h1 className="font-display text-lg text-white">Rafael Dias</h1>
            </div>
          </Link>
          <a href="#agendar" className="rounded-full border border-gold/30 bg-gold/10 px-5 py-3 text-[13px] font-bold uppercase tracking-[0.24em] text-gold transition hover:bg-gold hover:text-black">
            Agendar sexta-feira
          </a>
        </div>
      </section>

      <section className="relative px-6 py-20 md:py-28">
        <div className="absolute inset-0 top-spotlight opacity-40" />
        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="space-y-9">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-4 py-2 text-[13px] font-bold uppercase tracking-[0.28em] text-gold">
              <Zap className="h-3.5 w-3.5" />
              tecnologia laser premium
            </div>
            <div className="space-y-6">
              <h2 className="font-display text-6xl font-light leading-[0.9] text-white md:text-8xl">
                Depilação <span className="italic text-gold text-glow-gold">a Laser</span>
              </h2>
              <p className="max-w-xl text-sm font-light leading-8 tracking-wide text-white/50 md:text-base">
                Uma experiência segura, confortável e personalizada para redução progressiva dos pelos. Atendimento com avaliação individual, orientação profissional e horários dedicados às sextas-feiras.
              </p>
            </div>
            <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ["Avaliação", "Plano indicado para sua pele e área"],
                ["Sexta-feira", "Agenda concentrada para laser"],
                ["Stripe", "Sinal online para reservar horário"],
              ].map(([title, desc]) => (
                <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <CheckCircle2 className="mb-4 h-5 w-5 text-gold" />
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white">{title}</p>
                  <p className="mt-2 text-[13px] leading-5 text-white/35">{desc}</p>
                </div>
              ))}
            </div>
            <a href="#agendar" className="inline-flex items-center gap-3 rounded-full bg-gradient-to-tr from-[#D4AF37] via-[#E5C38C] to-[#B8860B] px-8 py-4 text-[13px] font-bold uppercase tracking-[0.24em] text-black shadow-[0_12px_40px_rgba(212,175,55,0.18)] transition hover:scale-[1.02]">
              Reservar meu horário
              <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9 }} className="grid gap-4 sm:grid-cols-2">
            <div className="overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.03] sm:translate-y-10">
              <img src={siteSettings.laser_hero_image_1 || "/assets/skincare_treatment.png"} alt="Tratamento estético com tecnologia" className="h-72 w-full object-cover opacity-80 grayscale-[15%]" />
            </div>
            <div className="overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.03]">
              <img src={siteSettings.laser_hero_image_2 || "/assets/spa_portrait.png"} alt="Ambiente premium Instituto Rafael Dias" className="h-72 w-full object-cover opacity-80 grayscale-[10%]" />
            </div>
            <div className="relative overflow-hidden rounded-[36px] border border-gold/20 bg-gold/10 p-8 sm:col-span-2">
              {siteSettings.laser_demo_video ? (
                <video src={siteSettings.laser_demo_video} controls className="mb-6 h-64 w-full rounded-[28px] border border-white/10 object-cover" />
              ) : (
                <div className="absolute right-8 top-8 flex h-16 w-16 items-center justify-center rounded-full border border-gold/30 bg-black/30 text-gold">
                  <Play className="h-7 w-7 fill-current" />
                </div>
              )}
              <p className="text-[13px] font-bold uppercase tracking-[0.35em] text-gold">Vídeo explicativo</p>
              <h3 className="mt-5 max-w-lg font-display text-3xl text-white">Entenda como funciona o laser e os cuidados antes da sessão.</h3>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/45">Área pronta para receber vídeos demonstrativos, depoimentos e bastidores clínicos do protocolo de depilação.</p>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-white/5 bg-black-matte/20 px-6 py-20">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 lg:grid-cols-3">
          {[
            [ShieldCheck, "Segurança primeiro", "Avaliação de pele, orientação de fotoproteção e condutas pré e pós sessão."],
            [Sparkles, "Resultado progressivo", "Protocolo planejado para reduzir pelos com naturalidade e acompanhamento."],
            [Clock, "Agenda objetiva", "Horários de sexta-feira para simplificar reserva, pagamento e confirmação no CRM."],
          ].map(([Icon, title, desc]: any) => (
            <div key={title} className="rounded-[32px] border border-white/10 bg-white/[0.025] p-8">
              <Icon className="h-7 w-7 text-gold" />
              <h3 className="mt-8 font-display text-3xl text-white">{title}</h3>
              <p className="mt-4 text-sm font-light leading-7 text-white/45">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="agendar" className="px-6 py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-7">
            <p className="text-[13px] font-bold uppercase tracking-[0.5em] text-gold">Reserva online</p>
            <h2 className="font-display text-5xl font-light leading-tight text-white md:text-7xl">Preencha e garanta seu horário.</h2>
            <p className="text-sm leading-8 text-white/45">
              Ao finalizar, você será redirecionado ao Stripe para pagar o sinal de reserva. Após o pagamento, o lead e o agendamento entram no CRM.
            </p>
            <div className="rounded-[28px] border border-gold/20 bg-gold/10 p-6">
              <div className="flex items-center gap-3 text-gold">
                <CreditCard className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">{siteSettings.laser_deposit_text || "Sinal de reserva: R$ 150,00"}</span>
              </div>
              <p className="mt-3 text-xs leading-6 text-white/45">{siteSettings.laser_info_text || "Valor e política de abatimento podem ser ajustados no backend/env sem mudar a página."}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-[36px] border border-white/10 bg-[#0B0D12]/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] md:p-9">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-[13px] font-bold uppercase tracking-[0.22em] text-white/45">Nome completo</span>
                <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-gold" placeholder="Seu nome" />
              </label>
              <label className="space-y-2">
                <span className="text-[13px] font-bold uppercase tracking-[0.22em] text-white/45">WhatsApp</span>
                <input required value={phone} onChange={(e) => handlePhoneChange(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-gold" placeholder="(94) 99999-9999" />
              </label>
              <label className="space-y-2">
                <span className="text-[13px] font-bold uppercase tracking-[0.22em] text-white/45">E-mail</span>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-gold" placeholder="voce@email.com" />
              </label>
              <label className="space-y-2">
                <span className="text-[13px] font-bold uppercase tracking-[0.22em] text-white/45">CPF</span>
                <input required value={cpf} onChange={(e) => handleCpfChange(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-gold" placeholder="000.000.000-00" />
              </label>
              <label className="space-y-2">
                <span className="text-[13px] font-bold uppercase tracking-[0.22em] text-white/45">Área de interesse</span>
                <select value={area} onChange={(e) => setArea(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/80 px-4 py-3 text-sm text-white outline-none transition focus:border-gold">
                  {TREATMENT_AREAS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-[13px] font-bold uppercase tracking-[0.22em] text-white/45">Sexta-feira disponível</span>
                <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/80 px-4 py-3 text-sm text-white outline-none transition focus:border-gold">
                  {availableFridays.map((date) => {
                    const value = toDateInputValue(date);
                    return <option key={value} value={value}>{formatFriday(value)}</option>;
                  })}
                </select>
              </label>
              <div className="md:col-span-2">
                <span className="text-[13px] font-bold uppercase tracking-[0.22em] text-white/45">Horário</span>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-7">
                  {FRIDAY_SLOTS.map((slot) => (
                    <button key={slot} type="button" onClick={() => setSelectedSlot(slot)} className={`rounded-xl border px-3 py-2 text-xs font-mono transition ${selectedSlot === slot ? "border-gold bg-gold/20 text-gold" : "border-white/10 bg-black/30 text-white/50 hover:border-white/25 hover:text-white"}`}>
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
              <label className="space-y-2 md:col-span-2">
                <span className="text-[13px] font-bold uppercase tracking-[0.22em] text-white/45">Observações</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-gold" placeholder="Conte qual região deseja tratar ou alguma dúvida importante." />
              </label>
            </div>

            {error && <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}

            <button disabled={isSubmitting} type="submit" className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-tr from-[#D4AF37] via-[#E5C38C] to-[#B8860B] px-6 py-4 text-xs font-bold uppercase tracking-[0.22em] text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
              {isSubmitting ? "Abrindo checkout..." : "Pagar sinal e reservar"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
