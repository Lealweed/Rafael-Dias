import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
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
  Award,
  MessageSquare,
  Check,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { fetchSiteSettings, mergeMediaSettings, DEFAULT_MEDIA_SETTINGS } from "../lib/siteSettings";

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export default function Mentorship() {
  const [siteSettings, setSiteSettings] = useState(DEFAULT_MEDIA_SETTINGS);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [selectedMentorship, setSelectedMentorship] = useState("Mentoria Botox");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Mentorias de Harmonização Facial Avançada | Instituto Rafael Dias";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "Desenvolva segurança clínica absoluta com as mentorias de Harmonização Facial do Dr. Rafael Dias. Botox, Regiões Isoladas e Full Face RD."
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

  const getWhatsAppUrl = (mentorshipName: string) => {
    const rawPhone = siteSettings.home_footer_phone || "(94) 99999-9999";
    const clean = onlyDigits(rawPhone);
    const whatsappNumber = clean.length >= 10 ? (clean.startsWith("55") ? clean : `55${clean}`) : "5594999999999";
    const message = `Olá! Gostaria de solicitar a reserva da minha vaga na pré-venda e obter mais informações sobre a ${mentorshipName} do Instituto Rafael Dias.`;
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  };

  const scrollToSection = (id: string, selectValue?: string) => {
    if (selectValue) {
      setSelectedMentorship(selectValue);
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
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
          treatment: selectedMentorship,
          date: siteSettings.mentoria_date || "A definir",
          slot: siteSettings.mentoria_time || "09:00 às 18:00",
          notes: `Cidade: ${city} | Mentoria de Interesse: ${selectedMentorship}`,
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
    <main className="min-h-screen bg-black-void text-[#E3D5C1] overflow-x-hidden selection:bg-gold/30 selection:text-gold relative">
      {/* ─── Floating WhatsApp Button ─── */}
      <a
        href={getWhatsAppUrl("Mentoria de Harmonização Facial")}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_4px_20px_rgba(37,211,102,0.4)] transition hover:scale-110 active:scale-95"
        aria-label="Falar no WhatsApp"
      >
        <MessageSquare className="h-7 w-7 fill-current" />
      </a>

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
              <p className="text-[14px] uppercase tracking-[0.5em] text-gold font-display leading-none mb-1">Instituto</p>
              <h1 className="font-display text-lg text-white">Rafael Dias</h1>
            </div>
          </Link>
          <button
            onClick={() => scrollToSection("investimento")}
            className="rounded-full border border-gold/30 bg-gold/10 px-5 py-3 text-[13px] font-bold uppercase tracking-[0.24em] text-gold transition hover:bg-gold hover:text-black cursor-pointer"
          >
            Garantir minha vaga
          </button>
        </div>
      </section>

      {/* ─── Hero / Seção 1: O Posicionamento ─── */}
      <section className="relative px-6 py-16 md:py-24">
        <div className="absolute inset-0 top-spotlight opacity-40 pointer-events-none" />
        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-9"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-4 py-2 text-[13px] font-bold uppercase tracking-[0.28em] text-gold">
              <GraduationCap className="h-3.5 w-3.5" />
              Mentorias de Harmonização Avançada
            </div>
            <div className="space-y-6">
              <h2 className="font-display text-4xl font-light leading-[1.05] text-white md:text-5xl lg:text-6xl">
                Conectando Conhecimento, <span className="italic text-gold text-glow-gold">Técnica e Resultados</span> de Alto Valor
              </h2>
              <p className="max-w-xl text-sm font-light leading-8 tracking-wide text-white/60 md:text-base">
                A pós-graduação tradicional te entrega o diploma e os conceitos teóricos, mas a verdadeira segurança clínica nasce no mocho, sob a supervisão minuciosa de quem já vivenciou centenas de casos reais. 
              </p>
              <p className="max-w-xl text-sm font-light leading-8 tracking-wide text-white/50 md:text-base">
                O <strong>Instituto Rafael Dias</strong> nasceu com um propósito inegociável: formar profissionais da estética em autoridades capazes de entregar resultados naturais, refinados e altamente valorizados pelo mercado premium.
              </p>
            </div>
            <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                [CalendarDays, siteSettings.mentoria_date || "15 de Agosto de 2026", "Mentoria presencial"],
                [Clock, siteSettings.mentoria_time || "09:00 às 18:00", "Imersão VIP Prática"],
                [MapPin, siteSettings.mentoria_location || "Parauapebas - PA", "Instituto Rafael Dias"],
              ].map(([Icon, title, desc]: any) => (
                <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <Icon className="mb-4 h-5 w-5 text-gold" />
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white">{title}</p>
                  <p className="mt-2 text-[13px] leading-5 text-white/35">{desc}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => scrollToSection("programas")}
              className="inline-flex items-center gap-3 rounded-full bg-gradient-to-tr from-[#D4AF37] via-[#E5C38C] to-[#B8860B] px-8 py-4 text-[13px] font-bold uppercase tracking-[0.24em] text-black shadow-[0_12px_40px_rgba(212,175,55,0.18)] transition hover:scale-[1.02] cursor-pointer"
            >
              Conhecer Programas
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9 }}
          >
            <div className="relative overflow-hidden rounded-[36px] border border-gold/20 bg-gold/10 p-6 md:p-8">
              {siteSettings.mentoria_hero_video ? (
                <video
                  src={siteSettings.mentoria_hero_video}
                  controls
                  className="h-80 w-full rounded-[28px] border border-white/10 object-cover"
                />
              ) : (
                <div className="flex h-80 w-full items-center justify-center rounded-[28px] border border-white/10 bg-black/30 relative group">
                  <img
                    src={siteSettings.mentoria_mentor_image || "/assets/spa_portrait.png"}
                    alt="Dr. Rafael Dias"
                    className="absolute inset-0 h-full w-full object-cover rounded-[28px] opacity-40 grayscale group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border border-gold/30 bg-black/50 text-gold group-hover:bg-gold group-hover:text-black transition-colors duration-300">
                    <Play className="h-8 w-8 fill-current ml-1" />
                  </div>
                </div>
              )}
              <p className="mt-6 text-[13px] font-bold uppercase tracking-[0.35em] text-gold">
                Método Exclusivo
              </p>
              <h3 className="mt-4 max-w-lg font-display text-2xl text-white md:text-3xl">
                Desenvolva a confiança clínica para entregar resultados naturais e seguros.
              </h3>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/45">
                Nossas mentorias unem teoria anatômica profunda e prática intensa em pacientes reais selecionados pelo Instituto.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Seção 2: O Filtro de Exclusividade ─── */}
      <section className="border-t border-white/5 bg-black-matte/10 px-6 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-center space-y-6"
          >
            <p className="text-[13px] font-bold uppercase tracking-[0.5em] text-gold">
              Filtro de Exclusividade
            </p>
            <h2 className="font-display text-3xl font-light text-white md:text-4xl">
              Um Treinamento Avançado para Profissionais de Elite
            </h2>
            <p className="max-w-2xl mx-auto text-sm leading-7 text-white/50">
              Nossas mentorias e imersões práticas são direcionadas estritamente para profissionais pós-graduados e devidamente habilitados na área da estética que recusam o básico e buscam o mais alto padrão técnico:
            </p>
          </motion.div>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {[
              "Biomédicos Estetas",
              "Cirurgiões-Dentistas",
              "Médicos",
              "Farmacêuticos Estetas",
              "Enfermeiros Estetas",
              "Profissionais Habilitados",
            ].map((prof, i) => (
              <motion.div
                key={prof}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.01] p-5 text-center transition-all duration-300 hover:border-gold/20 hover:bg-gold/[0.02]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/10 text-gold mb-4">
                  <Check className="h-4 w-4" />
                </div>
                <span className="text-[13px] font-medium text-white/80 leading-snug">{prof}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Seção 3: As Modalidades de Mentoria ─── */}
      <section id="programas" className="border-t border-white/5 px-6 py-20 md:py-28 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.04),transparent_50%)] pointer-events-none" />
        <div className="mx-auto max-w-7xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="mb-16 text-center"
          >
            <p className="text-[13px] font-bold uppercase tracking-[0.5em] text-gold">
              Escolha seu Próximo Nível
            </p>
            <h2 className="mt-5 font-display text-4xl font-light text-white md:text-6xl">
              Nossos Programas de <span className="italic text-gold">Mentoria</span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-sm text-white/50 leading-7">
              Três caminhos de especialização moldados para elevar seu faturamento, refinar seu olho artístico e entregar máxima segurança clínica aos seus pacientes.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 items-stretch">
            {/* Card 1: Mentoria Botox */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex flex-col rounded-[32px] border border-white/10 bg-white/[0.01] p-8 transition-all duration-500 hover:border-gold/30 hover:bg-gold/[0.01]"
            >
              <div className="space-y-4 flex-grow">
                <div className="flex items-center gap-2 text-gold">
                  <Rocket className="h-5 w-5" />
                  <span className="text-[12px] font-bold uppercase tracking-[0.2em]">Mentoria 1</span>
                </div>
                <h3 className="font-display text-3xl text-white font-light">Toxina Botulínica (Botox)</h3>
                <p className="text-xs italic text-gold/80 font-medium">Precisão Dinâmica, Mapeamento Customizado e Risco Zero.</p>
                <p className="text-sm font-light leading-7 text-white/50">
                  Esqueça de uma vez por todas as fórmulas prontas de aplicação que geram resultados engessados ou artificiais. Aprenda a ler a dinâmica muscular de cada paciente.
                </p>
                <div className="pt-6 border-t border-white/5 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-white">Grade Avançada:</p>
                  <ul className="space-y-2 text-[13px] text-white/40 leading-relaxed font-light">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" />
                      Anatomia Aplicada à Dinâmica Facial e Terço Superior
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" />
                      Avaliação Detalhada e Mapeamento Muscular
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" />
                      Marcação Personalizada e Técnicas de Diluição
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" />
                      Manejo Clínico de Intercorrências e Segurança Vascular
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" />
                      Fotografia Clínica e Precificação de Consultório
                    </li>
                  </ul>
                </div>
                <div className="pt-4 text-[13px] text-gold/90 font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Prática: Atendimento em pacientes reais (VIP)
                </div>
              </div>
              <div className="mt-8 space-y-3">
                <button
                  onClick={() => scrollToSection("cadastro", "Mentoria Botox")}
                  className="w-full rounded-2xl bg-white/5 border border-white/10 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-gold hover:text-black cursor-pointer"
                >
                  Selecionar esta
                </button>
                <a
                  href={getWhatsAppUrl("Mentoria Botox")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center rounded-2xl border border-gold/20 bg-gold/5 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-gold transition hover:bg-gold/10 cursor-pointer"
                >
                  Falar com Consultor
                </a>
              </div>
            </motion.div>

            {/* Card 2: Mentoria VIP Regiões Isoladas */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex flex-col rounded-[32px] border border-white/10 bg-white/[0.01] p-8 transition-all duration-500 hover:border-gold/30 hover:bg-gold/[0.01]"
            >
              <div className="space-y-4 flex-grow">
                <div className="flex items-center gap-2 text-gold">
                  <Target className="h-5 w-5" />
                  <span className="text-[12px] font-bold uppercase tracking-[0.2em]">Mentoria 2</span>
                </div>
                <h3 className="font-display text-3xl text-white font-light">Regiões Isoladas (VIP)</h3>
                <p className="text-xs italic text-gold/80 font-medium">Refino da Escultura Facial e Domínio das Zonas de Risco.</p>
                <p className="text-sm font-light leading-7 text-white/50">
                  O domínio absoluto das áreas mais lucrativas e desafiadoras do consultório (Lábios, Mento ou Rinomodelação). Foco em volumização, sustentação e riscos.
                </p>
                <div className="pt-6 border-t border-white/5 space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-white">Preenchimento Labial Avançado:</p>
                    <p className="text-[12px] text-white/40 font-light">
                      Anatomia vascular labial, proporção áurea, contorno, volumização tridimensional, assimetrias e uso de Hialuronidase.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-white">Rinomodelação & Mento:</p>
                    <p className="text-[12px] text-white/40 font-light">
                      Anatomia nasal profunda, mapeamento de risco vascular, técnicas de sustentação, projeção de ponta, dorso e manejo de intercorrências.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-white">Bioestimuladores de Colágeno:</p>
                    <p className="text-[12px] text-white/40 font-light">
                      Planejamento integrado, sustentação profunda e vetorização tecidual.
                    </p>
                  </div>
                </div>
                <div className="pt-4 text-[13px] text-gold/90 font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Prática: Procedimentos exaustivos em modelos reais
                </div>
              </div>
              <div className="mt-8 space-y-3">
                <button
                  onClick={() => scrollToSection("cadastro", "Mentoria Região Isolada (Lábios, Mento ou Nariz)")}
                  className="w-full rounded-2xl bg-white/5 border border-white/10 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-gold hover:text-black cursor-pointer"
                >
                  Selecionar esta
                </button>
                <a
                  href={getWhatsAppUrl("Mentoria de Regiões Isoladas")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center rounded-2xl border border-gold/20 bg-gold/5 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-gold transition hover:bg-gold/10 cursor-pointer"
                >
                  Falar com Consultor
                </a>
              </div>
            </motion.div>

            {/* Card 3: Mentoria Premium Full Face RD */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col rounded-[32px] border border-gold/30 bg-gold/[0.02] p-8 shadow-gold relative overflow-hidden transform lg:scale-[1.03] lg:-translate-y-2"
            >
              <div className="absolute top-0 right-0 bg-gold text-black text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl">
                O Mais Completo
              </div>
              <div className="space-y-4 flex-grow">
                <div className="flex items-center gap-2 text-gold">
                  <Award className="h-5 w-5 animate-pulse" />
                  <span className="text-[12px] font-bold uppercase tracking-[0.2em]">Mentoria 3</span>
                </div>
                <h3 className="font-display text-3xl text-white font-light">Premium Full Face RD</h3>
                <p className="text-xs italic text-gold font-medium">A Elite do Mercado: Pare de Vender Seringas, Venda Transformações.</p>
                <p className="text-sm font-light leading-7 text-white/60">
                  O treinamento definitivo do Instituto. Aprenda a enxergar o rosto como um todo, desenvolvendo raciocínio clínico tridimensional para planejar tratamentos faciais integrados de alto ticket.
                </p>
                <div className="pt-6 border-t border-gold/10 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-white">Grade de Elite:</p>
                  <ul className="space-y-2 text-[13px] text-white/50 leading-relaxed font-light">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" />
                      Avaliação e Planejamento Estrutural Full Face
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" />
                      Toxina, Ácido Hialurônico e Bioestimuladores Integrados
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" />
                      Arquitetura de Mento, Mandíbula, Malar, Olheiras e Temporal
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" />
                      Particularidades e Harmonização Masculina vs Feminina
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-gold shrink-0 mt-0.5" />
                      <strong>Módulo Business:</strong> Gestão, Marketing de Atração e Posicionamento Premium
                    </li>
                  </ul>
                </div>
                <div className="pt-4 text-[13px] text-gold font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Prática: Imersão prática total em pacientes reais
                </div>
              </div>
              <div className="mt-8 space-y-3">
                <button
                  onClick={() => scrollToSection("cadastro", "Mentoria Premium Full Face RD")}
                  className="w-full rounded-2xl bg-gradient-to-tr from-[#D4AF37] via-[#E5C38C] to-[#B8860B] py-4 text-xs font-bold uppercase tracking-[0.2em] text-black shadow-gold transition hover:scale-[1.01] cursor-pointer"
                >
                  Selecionar esta
                </button>
                <a
                  href={getWhatsAppUrl("Mentoria Premium Full Face RD")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center rounded-2xl border border-gold/40 bg-gold/10 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-gold transition hover:bg-gold/20 cursor-pointer"
                >
                  Falar com Consultor
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Seção 4: O Padrão de Entrega (Diferenciais) ─── */}
      <section className="border-t border-white/5 bg-black-matte/20 px-6 py-20 md:py-28">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="mb-16 text-center"
          >
            <p className="text-[13px] font-bold uppercase tracking-[0.5em] text-gold">
              Diferenciais do Instituto
            </p>
            <h2 className="mt-5 font-display text-4xl font-light text-white md:text-6xl">
              Por que nosso método é <span className="italic text-gold">único</span>?
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: TrendingUp,
                title: "Turmas Reduzidas",
                desc: "Mentorias desenhadas para pouquíssimos profissionais por edição, garantindo foco total no seu aprendizado e retenção.",
              },
              {
                icon: Users,
                title: "Acompanhamento Individualizado",
                desc: "O Dr. Rafael acompanha pessoalmente cada marcação, planejamento and movimento da sua mão diretamente no mocho.",
              },
              {
                icon: Target,
                title: "Pacientes Reais Garantidos",
                desc: "Nós fazemos toda a captação, triagem e seleção rigorosa dos pacientes modelo para que você execute a prática real com segurança.",
              },
              {
                icon: BookOpen,
                title: "Material Didático Exclusivo",
                desc: "Acesso direto aos guias de cabeceira, fichas de anamnese e protocolos clínicos oficiais utilizados no Instituto Rafael Dias.",
              },
              {
                icon: MessageSquare,
                title: "Grupo Exclusivo de Suporte",
                desc: "Você não estará sozinho após o curso. Acesso a uma comunidade fechada para discussão de casos futuros e suporte técnico direto.",
              },
              {
                icon: Award,
                title: "Certificação de Valor",
                desc: "Ao concluir as atividades, você recebe o certificado oficial de participação com o selo de qualidade emitido pelo Instituto Rafael Dias.",
              },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group rounded-[28px] border border-white/10 bg-white/[0.015] p-8 transition-all duration-500 hover:border-gold/20 hover:bg-gold/[0.02]"
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

      {/* ─── Seção 5: Tabela de Investimento ─── */}
      <section id="investimento" className="border-t border-white/5 px-6 py-20 md:py-28 relative">
        <div className="mx-auto max-w-5xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="mb-16 text-center"
          >
            <p className="text-[13px] font-bold uppercase tracking-[0.5em] text-gold">
              Valores e Oportunidades
            </p>
            <h2 className="mt-5 font-display text-4xl font-light text-white md:text-6xl">
              Condições Especiais de <span className="italic text-gold">Pré-Venda</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="overflow-x-auto rounded-[28px] border border-white/10 bg-black/40 backdrop-blur-md p-2 md:p-6"
          >
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/10 text-white/60 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6 font-display text-sm tracking-widest text-gold font-normal">Mentoria Selecionada</th>
                  <th className="py-4 px-6 text-center">Plano Individual (Cartão)</th>
                  <th className="py-4 px-6 text-center">Indique um Amigo (Cada um)</th>
                  <th className="py-4 px-6 text-center">À Vista Especial (PIX)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[14px]">
                {[
                  ["Mentoria Botox", "10x de R$ 300,00", "10x de R$ 250,00", "R$ 2.300,00"],
                  ["Região Isolada (Lábios, Mento ou Nariz)", "10x de R$ 400,00", "10x de R$ 350,00", "R$ 3.200,00"],
                  ["Premium Full Face RD", "10x de R$ 700,00", "10x de R$ 650,00", "R$ 6.000,00"],
                ].map(([name, ind, friend, pix]) => (
                  <tr key={name} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-5 px-6 font-medium text-white">{name}</td>
                    <td className="py-5 px-6 text-center text-white/70">{ind}</td>
                    <td className="py-5 px-6 text-center text-gold/90 font-medium">{friend}</td>
                    <td className="py-5 px-6 text-center text-white font-bold">{pix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>

          <div className="mt-8 flex flex-col md:flex-row items-center gap-6 rounded-[24px] border border-red-500/20 bg-red-500/5 p-6 max-w-4xl mx-auto">
            <ShieldAlert className="h-8 w-8 text-red-400 shrink-0" />
            <p className="text-xs leading-6 text-red-200/70">
              <strong>ATENÇÃO:</strong> Devido à infraestrutura premium exigida e à quantidade rigorosa de pacientes reais selecionados para a prática individual dos alunos, as vagas de cada turma são estritamente limitadas e encerradas sem aviso prévio.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Seção 6: Biografia do Mentor ─── */}
      <section className="border-t border-white/5 bg-black-matte/10 px-6 py-20 md:py-28">
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
                src={siteSettings.mentoria_mentor_image || "/assets/spa_portrait.png"}
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
              Quem Conduz a Sua Jornada?
            </p>
            <h2 className="font-display text-4xl font-light leading-tight text-white md:text-6xl">
              Dr. Rafael <span className="italic text-gold">Dias</span>
            </h2>
            <div className="space-y-5 text-sm font-light leading-8 text-white/50 md:text-base">
              <p>
                O Dr. Rafael Dias é Biomédico Esteta, especialista de referência em Harmonização Facial, fundador do Instituto Rafael Dias e mentor de profissionais que buscam alcançar a elite do mercado da estética avançada.
              </p>
              <p>
                Sua metodologia autoral e exclusiva combina de forma rígida o conhecimento científico aprofundado, uma visão artística refinada e a aplicação prática intensa em ambiente clínico. O foco principal de suas mentorias é formar profissionais peritos, totalmente preparados para atuar com segurança absoluta, alta performance técnica, domínio de intercorrências e a naturalidade que os clientes de alto padrão exigem.
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

      {/* ─── Seção 7: Pré-Reserva de Vaga (Formulário) ─── */}
      <section id="cadastro" className="border-t border-white/5 px-6 py-20 relative">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="space-y-7"
          >
            <p className="text-[13px] font-bold uppercase tracking-[0.5em] text-gold">
              Inscrição e Pré-Reserva
            </p>
            <h2 className="font-display text-5xl font-light leading-tight text-white md:text-6xl">
              Garanta sua vaga na mentoria de elite.
            </h2>
            <p className="text-sm leading-8 text-white/45">
              Escolha seu programa de interesse abaixo e preencha seus dados para efetuar a pré-reserva da sua vaga. O pagamento do sinal de pré-reserva é realizado via Stripe de forma 100% segura.
            </p>
            <div className="space-y-4">
              <div className="rounded-[28px] border border-gold/20 bg-gold/10 p-6">
                <div className="flex items-center gap-3 text-gold">
                  <CreditCard className="h-5 w-5" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em]">
                    {siteSettings.mentoria_deposit_text || "Sinal de Reserva: R$ 500,00"}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-6 text-white/45">
                  {siteSettings.mentoria_info_text || "O valor do sinal de reserva garante sua vaga física na mentoria e é integralmente abatido do valor final do curso contratado."}
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 space-y-3">
                <div className="flex items-center gap-3 text-white/60">
                  <CalendarDays className="h-5 w-5 text-gold/60" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em]">
                    {siteSettings.mentoria_date || "15 de Agosto de 2026"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-white/60">
                  <Clock className="h-5 w-5 text-gold/60" />
                  <span className="text-xs font-bold uppercase tracking-[0.2em]">
                    {siteSettings.mentoria_time || "09:00 às 18:00"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-white/60">
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
                  placeholder="Seu nome completo"
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

              <label className="space-y-2 md:col-span-2">
                <span className="text-[13px] font-bold uppercase tracking-[0.22em] text-gold font-semibold">
                  Mentoria Escolhida
                </span>
                <select
                  value={selectedMentorship}
                  onChange={(e) => setSelectedMentorship(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/80 px-4 py-3 text-sm text-white outline-none transition focus:border-gold text-white"
                >
                  <option className="bg-black text-white" value="Mentoria Botox">Mentoria Botox — Individual R$ 3.000 / Amigo R$ 2.500</option>
                  <option className="bg-black text-white" value="Mentoria Região Isolada (Lábios, Mento ou Nariz)">Mentoria Região Isolada — Individual R$ 4.000 / Amigo R$ 3.500</option>
                  <option className="bg-black text-white" value="Mentoria Premium Full Face RD">Mentoria Premium Full Face RD — Individual R$ 7.000 / Amigo R$ 6.500</option>
                </select>
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
              className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-tr from-[#D4AF37] via-[#E5C38C] to-[#B8860B] px-6 py-4 text-xs font-bold uppercase tracking-[0.22em] text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {isSubmitting ? "Abrindo checkout..." : "Inscrever-me e Pagar Sinal"}
            </button>

            <a
              href={getWhatsAppUrl(selectedMentorship)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex w-full items-center justify-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 px-6 py-4 text-xs font-bold uppercase tracking-[0.22em] text-gold transition hover:bg-gold/20 cursor-pointer"
            >
              <MessageSquare className="h-4 w-4" />
              Falar com Consultor no WhatsApp
            </a>
          </motion.form>
        </div>
      </section>

      {/* ─── Rodapé com Assinatura Conceito ─── */}
      <footer className="border-t border-white/5 py-12 px-6 bg-black-void">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div className="space-y-2">
            <h4 className="text-xs uppercase tracking-[0.4em] text-gold font-display font-bold">Instituto Rafael Dias</h4>
            <p className="text-[11px] text-white/30 tracking-wider">
              Rua 10, 216, Cidade Nova — Parauapebas - PA.
            </p>
          </div>
          
          <blockquote className="max-w-md font-display text-white/50 italic text-sm border-l border-gold/30 pl-4 py-1 my-4 md:my-0 text-center md:text-left">
            "Tudo o que fizerem, façam de todo o coração, como para o Senhor, e não para os homens."
          </blockquote>

          <p className="text-[11px] text-white/30">
            © {new Date().getFullYear()} Instituto Rafael Dias. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </main>
  );
}
