import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  GraduationCap,
  Loader2,
  MapPin,
  Play,
  Rocket,
  Target,
  TrendingUp,
  Users,
  Clock,
} from "lucide-react";
import { fetchSiteSettings, mergeMediaSettings, DEFAULT_MEDIA_SETTINGS } from "../lib/siteSettings";

const MENTORSHIP_TOPICS = [
  {
    icon: Briefcase,
    title: "Gestão de Consultório",
    desc: "Aprenda a estruturar e gerenciar seu consultório com processos eficientes e escaláveis.",
  },
  {
    icon: Target,
    title: "Captação de Pacientes",
    desc: "Estratégias comprovadas para atrair e fidelizar pacientes de alto valor.",
  },
  {
    icon: TrendingUp,
    title: "Marketing Digital Médico",
    desc: "Domine as redes sociais e o marketing digital para posicionar sua marca pessoal.",
  },
  {
    icon: Rocket,
    title: "Finanças & Precificação",
    desc: "Precifique seus serviços com inteligência e construa um negócio lucrativo.",
  },
  {
    icon: Users,
    title: "Liderança de Equipe",
    desc: "Monte e lidere equipes de alta performance no ambiente clínico.",
  },
  {
    icon: BookOpen,
    title: "Planejamento Estratégico",
    desc: "Defina metas claras e crie um plano de ação para crescer de forma sustentável.",
  },
];

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export default function Mentorship() {
  const [siteSettings, setSiteSettings] = useState(DEFAULT_MEDIA_SETTINGS);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Mentoria em Empreendedorismo para Profissionais de Saúde | Dr. Rafael Dias";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Mentoria presencial com Dr. Rafael Dias sobre Empreendedorismo para Profissionais de Saúde. Aprenda a transformar sua carreira e seu consultório em um negócio de sucesso."
      );
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!name.trim() || onlyDigits(phone).length < 10 || !email.trim() || !city.trim()) {
      setError("Preencha todos os campos antes de continuar.");
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
          city,
          treatment: "Mentoria — Empreendedorismo para Profissionais de Saúde",
          date: siteSettings.mentoria_date || "A definir",
          slot: siteSettings.mentoria_time || "09:00 às 18:00",
          notes: `Cidade: ${city}`,
          source: "mentoria",
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
      {/* ─── Header ─── */}
      <section className="relative overflow-hidden border-b border-white/5 px-6 py-8 md:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.16),transparent_35%),radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.07),transparent_22%)]" />
        <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/assets/logo.jpg"
              alt="Instituto Rafael Dias"
              className="h-11 w-11 rounded-full border border-gold/30 object-cover"
            />
            <div>
              <p className="text-[14px] uppercase tracking-[0.5em] text-gold">Instituto</p>
              <h1 className="font-display text-lg text-white">Rafael Dias</h1>
            </div>
          </Link>
          <a
            href="#inscrever"
            className="rounded-full border border-gold/30 bg-gold/10 px-5 py-3 text-[13px] font-bold uppercase tracking-[0.24em] text-gold transition hover:bg-gold hover:text-black"
          >
            Garantir minha vaga
          </a>
        </div>
      </section>

      {/* ─── Hero ─── */}
      <section className="relative px-6 py-20 md:py-28">
        <div className="absolute inset-0 top-spotlight opacity-40" />
        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-9"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-4 py-2 text-[13px] font-bold uppercase tracking-[0.28em] text-gold">
              <GraduationCap className="h-3.5 w-3.5" />
              mentoria presencial
            </div>
            <div className="space-y-6">
              <h2 className="font-display text-5xl font-light leading-[0.95] text-white md:text-7xl lg:text-8xl">
                Empreendedorismo{" "}
                <span className="italic text-gold text-glow-gold">para Saúde</span>
              </h2>
              <p className="max-w-xl text-sm font-light leading-8 tracking-wide text-white/50 md:text-base">
                Transforme sua carreira e seu consultório em um negócio de sucesso. Uma mentoria presencial exclusiva com Dr. Rafael Dias para profissionais de saúde que querem crescer com estratégia e inteligência.
              </p>
            </div>
            <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                [CalendarDays, siteSettings.mentoria_date || "Data a definir", "Mentoria presencial"],
                [Clock, siteSettings.mentoria_time || "09:00 às 18:00", "Imersão de dia inteiro"],
                [MapPin, siteSettings.mentoria_location || "Parauapebas - PA", "Local do evento"],
              ].map(([Icon, title, desc]: any) => (
                <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <Icon className="mb-4 h-5 w-5 text-gold" />
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white">{title}</p>
                  <p className="mt-2 text-[13px] leading-5 text-white/35">{desc}</p>
                </div>
              ))}
            </div>
            <a
              href="#inscrever"
              className="inline-flex items-center gap-3 rounded-full bg-gradient-to-tr from-[#D4AF37] via-[#E5C38C] to-[#B8860B] px-8 py-4 text-[13px] font-bold uppercase tracking-[0.24em] text-black shadow-[0_12px_40px_rgba(212,175,55,0.18)] transition hover:scale-[1.02]"
            >
              Quero participar
              <ArrowRight className="h-4 w-4" />
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9 }}
          >
            <div className="relative overflow-hidden rounded-[36px] border border-gold/20 bg-gold/10 p-8">
              {siteSettings.mentoria_hero_video ? (
                <video
                  src={siteSettings.mentoria_hero_video}
                  controls
                  className="h-80 w-full rounded-[28px] border border-white/10 object-cover"
                />
              ) : (
                <div className="flex h-80 w-full items-center justify-center rounded-[28px] border border-white/10 bg-black/30">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gold/30 bg-black/50 text-gold">
                    <Play className="h-8 w-8 fill-current" />
                  </div>
                </div>
              )}
              <p className="mt-6 text-[13px] font-bold uppercase tracking-[0.35em] text-gold">
                Mensagem do Dr. Rafael
              </p>
              <h3 className="mt-4 max-w-lg font-display text-2xl text-white md:text-3xl">
                Descubra como construir um consultório lucrativo e uma carreira extraordinária.
              </h3>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/45">
                Neste vídeo, o Dr. Rafael Dias explica o que você vai aprender na mentoria e por que essa imersão pode mudar sua trajetória profissional.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── O que você vai aprender ─── */}
      <section className="border-y border-white/5 bg-black-matte/20 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="mb-16 text-center"
          >
            <p className="text-[13px] font-bold uppercase tracking-[0.5em] text-gold">
              Conteúdo da mentoria
            </p>
            <h2 className="mt-5 font-display text-4xl font-light text-white md:text-6xl">
              O que você vai <span className="italic text-gold">aprender</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MENTORSHIP_TOPICS.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group rounded-[32px] border border-white/10 bg-white/[0.025] p-8 transition-all duration-500 hover:border-gold/20 hover:bg-gold/[0.03]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 transition-all duration-500 group-hover:scale-110">
                  <Icon className="h-6 w-6 text-gold" />
                </div>
                <h3 className="mt-7 font-display text-xl text-white md:text-2xl">{title}</h3>
                <p className="mt-3 text-sm font-light leading-7 text-white/45">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Galeria de Imagens ─── */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="mb-16 text-center"
          >
            <p className="text-[13px] font-bold uppercase tracking-[0.5em] text-gold">
              Momentos & bastidores
            </p>
            <h2 className="mt-5 font-display text-4xl font-light text-white md:text-6xl">
              Uma experiência <span className="italic text-gold">transformadora</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {[
              siteSettings.mentoria_image_0,
              siteSettings.mentoria_image_1,
              siteSettings.mentoria_image_2,
            ].map((src, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="group overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03]"
              >
                <img
                  src={src}
                  alt={`Mentoria Dr. Rafael Dias - Imagem ${i + 1}`}
                  className="h-72 w-full object-cover opacity-80 grayscale-[10%] transition-all duration-700 group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0 sm:h-80"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Sobre o Mentor ─── */}
      <section className="border-y border-white/5 bg-black-matte/20 px-6 py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 lg:grid-cols-[0.45fr_1fr]">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="overflow-hidden rounded-[36px] border border-gold/20 bg-gold/10 p-3">
              <img
                src={siteSettings.mentoria_mentor_image}
                alt="Dr. Rafael Dias"
                className="h-96 w-full rounded-[30px] object-cover"
              />
            </div>
            <div className="absolute -bottom-5 -right-5 flex h-24 w-24 items-center justify-center rounded-full border border-gold/30 bg-black-void/90 shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
              <GraduationCap className="h-10 w-10 text-gold" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="space-y-7"
          >
            <p className="text-[13px] font-bold uppercase tracking-[0.5em] text-gold">
              Sobre o mentor
            </p>
            <h2 className="font-display text-4xl font-light leading-tight text-white md:text-6xl">
              Dr. Rafael <span className="italic text-gold">Dias</span>
            </h2>
            <div className="space-y-5 text-sm font-light leading-8 text-white/50 md:text-base">
              <p>
                Profissional referência em Harmonização Facial e Estética Avançada em Parauapebas, o Dr. Rafael Dias construiu um dos consultórios mais reconhecidos da região — unindo excelência clínica, marketing estratégico e gestão inteligente.
              </p>
              <p>
                Nesta mentoria, ele compartilha os bastidores do seu crescimento: como saiu de um consultório iniciante para um instituto de referência, aplicando técnicas de captação de pacientes, posicionamento de marca e gestão financeira que todo profissional de saúde precisa dominar.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["500+", "Pacientes atendidos"],
                ["5+", "Anos de experiência"],
                ["100%", "Satisfação clínica"],
                ["1ª", "Referência regional"],
              ].map(([number, label]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
                  <p className="font-display text-2xl text-gold">{number}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.15em] text-white/35">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Formulário de Inscrição ─── */}
      <section id="inscrever" className="px-6 py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="space-y-7"
          >
            <p className="text-[13px] font-bold uppercase tracking-[0.5em] text-gold">
              Inscrição
            </p>
            <h2 className="font-display text-5xl font-light leading-tight text-white md:text-7xl">
              Garanta sua vaga na mentoria.
            </h2>
            <p className="text-sm leading-8 text-white/45">
              Preencha seus dados e finalize a inscrição pelo Stripe. Após o pagamento, sua vaga estará confirmada e você receberá todas as informações por e-mail e WhatsApp.
            </p>
            <div className="space-y-4">
              <div className="rounded-[28px] border border-gold/20 bg-gold/10 p-6">
                <div className="flex items-center gap-3 text-gold">
                  <CreditCard className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em]">
                    {siteSettings.mentoria_deposit_text || "Investimento: R$ 500,00"}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-6 text-white/45">
                  {siteSettings.mentoria_info_text || "O valor do sinal garante sua vaga na mentoria presencial. Vagas limitadas."}
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <div className="flex items-center gap-3 text-white/60">
                  <CalendarDays className="h-5 w-5 text-gold/60" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em]">
                    {siteSettings.mentoria_date || "Data a definir"}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-white/60">
                  <Clock className="h-5 w-5 text-gold/60" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em]">
                    {siteSettings.mentoria_time || "09:00 às 18:00"}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-white/60">
                  <MapPin className="h-5 w-5 text-gold/60" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em]">
                    {siteSettings.mentoria_location || "Parauapebas - PA"}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            onSubmit={handleSubmit}
            className="rounded-[36px] border border-white/10 bg-[#0B0D12]/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] md:p-9"
          >
            <div className="mb-8">
              <h3 className="font-display text-2xl text-white">Preencha seus dados</h3>
              <p className="mt-2 text-sm text-white/35">Todos os campos são obrigatórios.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-[13px] font-bold uppercase tracking-[0.22em] text-white/45">
                  Nome completo
                </span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-gold"
                  placeholder="Seu nome"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[13px] font-bold uppercase tracking-[0.22em] text-white/45">
                  WhatsApp
                </span>
                <input
                  required
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-gold"
                  placeholder="(94) 99999-9999"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[13px] font-bold uppercase tracking-[0.22em] text-white/45">
                  E-mail
                </span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-gold"
                  placeholder="voce@email.com"
                />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-[13px] font-bold uppercase tracking-[0.22em] text-white/45">
                  Cidade / Estado
                </span>
                <input
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none transition focus:border-gold"
                  placeholder="Ex: Parauapebas - PA"
                />
              </label>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              disabled={isSubmitting}
              type="submit"
              className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-tr from-[#D4AF37] via-[#E5C38C] to-[#B8860B] px-6 py-4 text-xs font-bold uppercase tracking-[0.22em] text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {isSubmitting ? "Abrindo checkout..." : "Inscrever-me e pagar sinal"}
            </button>
          </motion.form>
        </div>
      </section>
    </main>
  );
}
