import { useState, useEffect, useMemo, useRef } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Sparkles, ArrowRight, ShieldCheck, Heart, Clock, Star, Play, Award, CheckCircle2, ChevronRight, Phone, Activity, Maximize2 } from "lucide-react";

const patients = [
  {
    name: "Letícia Oliveira",
    role: "Influenciadora & Advogada",
    location: "Parauapebas - PA",
    comment: "Minha rotina exige uma imagem impecável e natural. O protocolo de Harmonização Facial do Dr. Rafael trouxe frescor e rejuvenescimento, mantendo minha identidade. Um atendimento premium único.",
    beforeImage: "/assets/spa_portrait.png",
    afterImage: "/assets/spa_portrait.png",
    protocols: [
      { name: "Toxina Botulínica", area: "Fronte & Glabela", effect: "Suavização de linhas" },
      { name: "Preenchimento Labial", area: "Lábios", effect: "Definição e volume sutil" },
      { name: "Bioestimulador de Colágeno", area: "Malar & Mandíbula", effect: "Sustentação natural" }
    ],
    markers: [
      { x: "50%", y: "22%", label: "Toxina Botulínica", desc: "Fronte Suavizada" },
      { x: "50%", y: "56%", label: "Ácido Hialurônico", desc: "Contorno Labial" },
      { x: "35%", y: "45%", label: "Bioestimulador", desc: "Sustentação Malar" },
      { x: "65%", y: "68%", label: "Definição", desc: "Ângulo Mandibular" }
    ],
    techStats: [
      { label: "Sustentação", value: "94%" },
      { label: "Simetria Facial", value: "+18%" },
      { label: "Índice de Colágeno", value: "+85%" }
    ]
  },
  {
    name: "Dra. Mariana Castro",
    role: "Promotora de Justiça",
    location: "Parauapebas - PA",
    comment: "Confiança e discrição. O Dr. Rafael explica cada detalhe do planejamento antes de começar. O Botox e os bioestimuladores trouxeram firmeza com total naturalidade.",
    beforeImage: "/assets/skincare_treatment.png",
    afterImage: "/assets/skincare_treatment.png",
    protocols: [
      { name: "Fios de Sustentação", area: "Terço Médio", effect: "Lifting sutil e imediato" },
      { name: "Bioestimuladores (Sculptra)", area: "Lateral da Face", effect: "Recuperação do colágeno" }
    ],
    markers: [
      { x: "42%", y: "42%", label: "Fios PDO", desc: "Lifting Terço Médio" },
      { x: "68%", y: "52%", label: "Bioestimulador", desc: "Estímulo de Colágeno" }
    ],
    techStats: [
      { label: "Firmeza Cutânea", value: "91%" },
      { label: "Elasticidade", value: "+30%" },
      { label: "Efeito Lifting", value: "Natural" }
    ]
  },
  {
    name: "Dr. Carlos Eduardo",
    role: "Advogado Sócio-Sênior",
    location: "Parauapebas - PA",
    comment: "Sempre tive receio de ficar artificial. O Dr. Rafael me tranquilizou na consulta presencial. O resultado do preenchimento e colágeno ficou incrível, discreto e rejuvenescido.",
    beforeImage: "/assets/facial_massage.png",
    afterImage: "/assets/facial_massage.png",
    protocols: [
      { name: "Preenchimento Mandibular", area: "Mandíbula", effect: "Estruturação e definição" },
      { name: "Rinomodelação Estética", area: "Nariz", effect: "Alinhamento do dorso" }
    ],
    markers: [
      { x: "50%", y: "38%", label: "Rinomodelação", desc: "Alinhamento Sutil" },
      { x: "72%", y: "70%", label: "Mandíbula & Mento", desc: "Definição de Contorno" }
    ],
    techStats: [
      { label: "Projeção Mandibular", value: "96%" },
      { label: "Alinhamento Nasal", value: "Preciso" },
      { label: "Naturalidade", value: "100%" }
    ]
  },
  {
    name: "Gabriela Viana",
    role: "Empresária de Moda Luxury",
    location: "Parauapebas - PA",
    comment: "O cuidado com os lábios foi essencial. Hidratação, contorno sutil e volume ideal. A clínica é linda, o atendimento é espetacular. O melhor de Parauapebas.",
    beforeImage: "/assets/clinic_interior.png",
    afterImage: "/assets/clinic_interior.png",
    protocols: [
      { name: "Protocolo Lip Gloss", area: "Vermelho Labial", effect: "Volume e hidratação profunda" },
      { name: "Ultraformer III", area: "Pálpebras & Pescoço", effect: "Efeito tightening e contorno" }
    ],
    markers: [
      { x: "50%", y: "52%", label: "Lip Gloss", desc: "Hidratação & Brilho" },
      { x: "46%", y: "34%", label: "Ultraformer", desc: "Firmeza das Pálpebras" }
    ],
    techStats: [
      { label: "Hidratação Labial", value: "+120%" },
      { label: "Compactação Flacidez", value: "Excelente" },
      { label: "Luminosidade", value: "Alta" }
    ]
  }
];


export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  const [activePatientIndex, setActivePatientIndex] = useState(0);
  const [sectionScrollProgress, setSectionScrollProgress] = useState(0);
  const [manualRevealProgress, setManualRevealProgress] = useState<number | null>(null);

  const revealPct = useMemo(() => {
    if (manualRevealProgress !== null) return manualRevealProgress;
    return sectionScrollProgress;
  }, [manualRevealProgress, sectionScrollProgress]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(progress);
      }

      // Calculate scroll progress specifically for #depoimentos section
      const section = document.getElementById("depoimentos");
      if (section) {
        const rect = section.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const totalDist = rect.height + windowHeight;
        const currentDist = windowHeight - rect.top;
        // Map visibility window to a nice 0-100 sweep
        const pct = Math.max(0, Math.min(100, (currentDist / totalDist) * 160 - 30));
        setSectionScrollProgress(pct);
      }
    };

    window.addEventListener("scroll", handleScroll);
    // Initial call to set correct values
    handleScroll();

    const observerOptions = {
      root: null,
      rootMargin: "0px",
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-active");
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll(".reveal");
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener("scroll", handleScroll);
      revealElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0D0D0F] text-[#E3D5C1] font-sans overflow-x-hidden flex flex-col justify-between selection:bg-[#ffd700]/20 selection:text-[#ffd700]">
      
      {/* Scroll Progress Bar */}
      <div 
        className="fixed top-0 left-0 h-[2.5px] bg-[#ffd700] z-[100] transition-all duration-100 ease-out"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* AURA GLOW AT THE TOP */}
      <div className="absolute top-0 left-0 w-full h-[600px] top-aura-glow pointer-events-none z-[1]" />

      {/* FIXED NAVBAR */}
      <nav className={`fixed top-0 left-0 z-50 w-full transition-all duration-500 border-b ${
        scrolled 
          ? "bg-[#0D0D0F]/90 backdrop-blur-2xl py-3 border-white/5 shadow-lg" 
          : "bg-transparent py-5 border-transparent"
      }`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-vibrant-gold-brushed text-[#0D0D0F] font-serif font-bold text-sm shadow-[0_0_15px_rgba(244,180,26,0.3)]">
              R
            </div>
            <div>
              <h1 className="text-xs font-bold tracking-widest font-serif text-[#ffd700] text-glow-vibrant-gold">RD Estética</h1>
              <p className="text-[8px] text-white/30 tracking-widest uppercase font-mono">Instituto Rafael Dias</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-[10px] uppercase tracking-widest text-[#E3D5C1]/70 font-semibold">
            <a href="#servicos" className="hover:text-[#ffd700] transition-colors">Serviços</a>
            <a href="#procedimentos" className="hover:text-[#ffd700] transition-colors">Procedimentos</a>
            <a href="#videos" className="hover:text-[#ffd700] transition-colors">Vídeos</a>
            <a href="#depoimentos" className="hover:text-[#ffd700] transition-colors">Depoimentos</a>
          </div>

          <div className="flex items-center gap-4">
            <RouterLink
              to="/login"
              className="text-[9px] uppercase tracking-widest font-bold text-[#E3D5C1]/50 hover:text-white transition-colors"
            >
              Acesso Equipe
            </RouterLink>
            <a
              href="https://wa.me/5594999999999?text=Olá,%20gostaria%20de%20agendar%20uma%20avaliação%20de%20Harmonização%20Estética"
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-vibrant-gold-brushed text-[#0D0D0F] hover:opacity-90 px-6 py-2 text-[9px] font-bold uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(244,180,26,0.35)]"
            >
              Agendar
            </a>
          </div>
        </div>
      </nav>

      {/* SECTION 1: HERO (Dark Atmosphere with Top Aura) */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pt-32 pb-20 md:pt-44 md:pb-28 flex flex-col md:flex-row items-center gap-12">
        <div className="flex-1 space-y-8 text-center md:text-left reveal">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-[#c5a059]/20 text-[10px] uppercase tracking-widest font-semibold text-[#ffd700]">
            <Sparkles className="h-3.5 w-3.5 text-[#ffd700] animate-pulse" />
            <span>Estética de Alta Performance</span>
          </div>
          <h2 className="text-4xl md:text-[64px] font-light leading-[1.1] text-white font-serif tracking-tight">
            Redefina o <br />
            <span className="italic font-normal text-[#ffd700] text-glow-vibrant-gold">Rejuvenescimento</span>
          </h2>
          
          <p className="text-[#E3D5C1]/60 text-xs md:text-sm leading-relaxed font-light max-w-sm">
            Descubra o equilíbrio perfeito entre sofisticação e bem-estar. No Instituto Rafael Dias, cada detalhe é esculpido para resgatar a sua versão mais leve e natural.
          </p>

          <div className="pt-2">
            <a
              href="https://wa.me/5594999999999?text=Olá,%20gostaria%20de%20agendar%20uma%20avaliação%20de%20Harmonização%20Estética"
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full bg-vibrant-gold-brushed text-[#0D0D0F] hover:opacity-90 px-8 py-3.5 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 shadow-[0_4px_20px_rgba(244,180,26,0.3)]"
            >
              Falar Conosco
            </a>
          </div>
        </div>

        {/* Large Realistic Portrait Image */}
        <div className="flex-1 w-full max-w-lg relative reveal delay-200">
          <div className="relative rounded-[32px] overflow-hidden border border-white/5 aspect-[4/3] shadow-2xl bg-[#0E1118]">
            <img 
              src="/assets/spa_portrait.png" 
              alt="Tratamento relaxante na clínica" 
              className="w-full h-full object-cover grayscale-[10%] hover:grayscale-0 transition-all duration-1000"
            />
            <div className="absolute inset-0 bg-[#0D0D0F]/15 mix-blend-multiply" />
          </div>
        </div>
      </section>

      {/* SECTION 2: SERVICES (Solid Warm Beige Background) */}
      <section id="servicos" className="relative z-10 bg-[#E3D5C1] text-[#1B1B1C] py-20 border-t border-[#1B1B1C]/5">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center gap-16">
          
          {/* Left: Stack of dark preview cards */}
          <div className="flex-1 grid grid-cols-2 gap-4 w-full reveal">
            
            <div className="rounded-[24px] bg-[#0D0D0F] text-[#E3D5C1] p-4 flex flex-col gap-4 border border-white/5 justify-between aspect-[3/4]">
              <div className="rounded-[18px] overflow-hidden aspect-[4/3]">
                <img src="/assets/skincare_treatment.png" alt="Tratamentos faciais" className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="text-[10px] uppercase tracking-wider font-bold text-white">Procedimentos</h4>
                <p className="text-[8px] text-white/40 leading-relaxed font-light mt-1">Tratamentos personalizados com tecnologias de ponta.</p>
              </div>
            </div>

            <div className="rounded-[24px] bg-[#0D0D0F] text-[#E3D5C1] p-4 flex flex-col gap-4 border border-white/5 justify-between aspect-[3/4] mt-8">
              <div className="rounded-[18px] overflow-hidden aspect-[4/3]">
                <img src="/assets/clinic_interior.png" alt="Espaço da clínica" className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="text-[10px] uppercase tracking-wider font-bold text-white">Clínica & Spa</h4>
                <p className="text-[8px] text-white/40 leading-relaxed font-light mt-1">Ambientes assépticos e confortáveis para o seu protocolo.</p>
              </div>
            </div>

          </div>

          {/* Right: Text descriptions and CTA */}
          <div className="flex-1 space-y-6 reveal delay-200">
            <h2 className="text-3xl md:text-[44px] font-light font-serif tracking-tight leading-none text-[#1b1b1c]">
              Tratamentos Avançados
            </h2>
            <p className="text-[#1B1B1C]/70 text-xs leading-relaxed font-light max-w-md">
              Unimos o que há de mais avançado na medicina estética moderna à sutileza dos detalhes de bem-estar. Nossos protocolos são conduzidos sob medida, focando sempre na naturalidade e saúde cutânea do paciente.
            </p>
            <div className="pt-2">
              <a
                href="https://wa.me/5594999999999?text=Olá,%20gostaria%20de%20agendar%20um%20protocolo%20exclusivo"
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-[#0D0D0F] text-[#E3D5C1] hover:text-[#ffd700] hover:bg-opacity-95 px-8 py-3.5 text-[10px] font-bold uppercase tracking-widest transition-all"
              >
                Agendar Agora
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 3: PACKAGES (Cream/Off-White Background) */}
      <section id="procedimentos" className="relative z-10 bg-[#F4EFEB] text-[#1B1B1C] py-24 border-t border-[#1B1B1C]/5">
        <div className="mx-auto max-w-6xl px-6 space-y-16">
          <div className="text-center space-y-2 reveal">
            <span className="text-[9px] uppercase tracking-widest font-bold text-[#1B1B1C]/40">Seleção Exclusiva</span>
            <h2 className="text-3xl md:text-[40px] font-light font-serif tracking-tight text-[#1b1b1c]">Protocolos Estéticos</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            
            <div className="space-y-4 reveal delay-100">
              <div className="rounded-[24px] overflow-hidden aspect-[4/3] shadow-md border border-[#1b1b1c]/5 bg-white">
                <img src="/assets/skincare_treatment.png" alt="Spa Facial Aromaterapia" className="w-full h-full object-cover" />
              </div>
              <div className="text-center px-2">
                <h4 className="text-xs font-serif font-bold text-[#1b1b1c]">Spa Facial Aromaterapia</h4>
                <p className="text-[9px] text-[#1B1B1C]/50 leading-relaxed font-light mt-1">Tratamento de pele focado em hidratação e desintoxicação profunda com óleos essenciais.</p>
              </div>
            </div>

            <div className="space-y-4 reveal delay-200">
              <div className="rounded-[24px] overflow-hidden aspect-[4/3] shadow-md border border-[#1b1b1c]/5 bg-white">
                <img src="/assets/spa_portrait.png" alt="Protocolo Colágeno Booster" className="w-full h-full object-cover" />
              </div>
              <div className="text-center px-2">
                <h4 className="text-xs font-serif font-bold text-[#1b1b1c]">Protocolo Colágeno Booster</h4>
                <p className="text-[9px] text-[#1B1B1C]/50 leading-relaxed font-light mt-1">Aplicação de estimuladores que redefinem o tônus e a jovialidade facial.</p>
              </div>
            </div>

            <div className="space-y-4 reveal delay-300">
              <div className="rounded-[24px] overflow-hidden aspect-[4/3] shadow-md border border-[#1b1b1c]/5 bg-white">
                <img src="/assets/facial_massage.png" alt="Protocolo Rejuvenescimento Express" className="w-full h-full object-cover" />
              </div>
              <div className="text-center px-2">
                <h4 className="text-xs font-serif font-bold text-[#1b1b1c]">Protocolo Rejuvenescimento Express</h4>
                <p className="text-[9px] text-[#1B1B1C]/50 leading-relaxed font-light mt-1">Sessões combinadas de toxina botulínica e contorno labial para resultados rápidos.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 4: THE KEYS TO... (Dark Block) */}
      <section id="videos" className="relative z-10 bg-[#0D0D0F] text-[#E3D5C1] py-24 border-t border-white/5">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-[32px] border border-white/5 bg-[#0E1118]/60 p-8 md:p-12 flex flex-col md:flex-row items-center gap-12 shadow-2xl">
            
            <div className="flex-1 space-y-6 reveal">
              <h2 className="text-2xl md:text-[38px] font-light font-serif tracking-tight leading-none text-white">
                Os Segredos de <br />
                <span className="italic font-normal text-[#ffd700] text-glow-vibrant-gold">Firmeza & Sustentação</span>
              </h2>
              <p className="text-[#E3D5C1]/50 text-xs leading-relaxed font-light max-w-md">
                Assista a explicações de métodos estruturados com agulhas finas e substâncias seguras que atuam na simetria do contorno mandibular e sustentação facial.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => alert("O vídeo demonstrativo institucional está sendo carregado.")}
                  className="inline-flex items-center gap-2 rounded-full border border-[#c5a059]/40 hover:border-[#ffd700] px-6 py-2.5 text-[9px] font-bold uppercase tracking-widest transition-all text-[#ffd700]"
                >
                  <Play className="h-3 w-3 fill-current" /> Assistir Vídeo explicativo
                </button>
              </div>
            </div>

            <div className="flex-1 w-full max-w-md relative reveal delay-200">
              <div className="rounded-[24px] overflow-hidden aspect-[16/10] border border-white/5 relative group">
                <img src="/assets/facial_massage.png" alt="Capa do vídeo explicativo" className="w-full h-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-[#0D0D0F]/30" />
                <div className="absolute inset-0 m-auto h-12 w-12 rounded-full bg-vibrant-gold-brushed text-[#0D0D0F] flex items-center justify-center cursor-pointer shadow-md">
                  <Play className="h-5 w-5 fill-current ml-0.5" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 5: CLINICAL TESTIMONIALS & HIGH-TECH VISUALIZER */}
      <section id="depoimentos" className="relative z-10 bg-[#0A0C10] text-white py-24 overflow-hidden border-t border-white/5">
        {/* Soft background aura */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[#ffd700]/2 blur-[130px] pointer-events-none" />
        <div className="absolute top-1/3 right-0 -translate-y-1/2 w-[250px] h-[250px] rounded-full bg-[#ffd700]/1 blur-[100px] pointer-events-none" />

        <div className="mx-auto max-w-6xl px-6 relative">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3 reveal">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#ffd700] flex items-center justify-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ffd700] animate-pulse"></span>
              Metodologia e Resultados Reais
            </span>
            <h2 className="text-3xl md:text-5xl font-light font-serif tracking-tight text-white leading-tight">
              Harmonização Realista <br />
              <span className="italic text-[#ffd700] text-glow-vibrant-gold font-normal">Antes & Depois</span>
            </h2>
            <p className="text-[#E3D5C1]/50 text-xs max-w-md mx-auto leading-relaxed">
              Arraste o slider ou role a tela para visualizar as marcações técnicas e a sutil transformação de nossos pacientes.
            </p>
          </div>

          <div className="grid gap-12 lg:grid-cols-12 items-start">
            
            {/* Left Column: Technological Before/After Slider Visualizer */}
            <div className="lg:col-span-7 relative w-full aspect-[4/5] rounded-[24px] overflow-hidden border border-white/10 shadow-2xl bg-[#0e1017] select-none group reveal">
              
              {/* Scientific grid pattern overlay */}
              <div className="absolute inset-0 pointer-events-none border border-white/5 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] z-10" />

              {/* Before Image (Background) */}
              <img 
                src={patients[activePatientIndex].beforeImage} 
                alt="Caso Clínico - Antes" 
                className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale"
              />
              <div className="absolute bottom-4 left-4 z-20 bg-[#0D0D0F]/70 border border-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-mono tracking-widest text-white/60">
                BASE CLINICA (ANTES)
              </div>

              {/* After Image (Slider Overlay) */}
              <div 
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${revealPct}%` }}
              >
                <img 
                  src={patients[activePatientIndex].afterImage} 
                  alt="Caso Clínico - Depois" 
                  className="absolute inset-y-0 left-0 w-full h-full object-cover"
                  style={{ width: "100%", maxWidth: "none" }}
                />
                <div className="absolute bottom-4 right-4 z-20 bg-[#ffd700]/10 border border-[#ffd700]/30 backdrop-blur-md px-3 py-1 rounded-full text-[8px] font-mono tracking-widest text-[#ffd700]">
                  DEPOIS + PROTOCOLOS
                </div>
              </div>

              {/* Slider Line Divider */}
              <div 
                className="absolute top-0 bottom-0 z-30 w-[1.5px] bg-gradient-to-b from-[#ffd700]/10 via-[#ffd700] to-[#ffd700]/10 shadow-[0_0_12px_#ffd700]"
                style={{ left: `${revealPct}%` }}
              >
                {/* Visual control pill handles */}
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-10 w-6 rounded-full bg-[#0D0D0F] border border-[#ffd700] shadow-[0_0_15px_rgba(244,180,26,0.4)] flex items-center justify-center cursor-ew-resize">
                  <div className="h-3 w-[1px] bg-[#ffd700]/60 mx-[1.5px]" />
                  <div className="h-3 w-[1px] bg-[#ffd700]/60 mx-[1.5px]" />
                </div>
              </div>

              {/* Interactive Transparent Range Input over the container */}
              <input 
                type="range"
                min="0"
                max="100"
                value={revealPct}
                onChange={(e) => setManualRevealProgress(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-40"
              />

              {/* Floating HUD Target Markers (Only visible if the divider is past them) */}
              {patients[activePatientIndex].markers.map((marker, mIdx) => {
                // Determine if this marker should show based on whether the sweep has passed it
                const markerXValue = parseFloat(marker.x);
                const isRevealed = revealPct > markerXValue - 5;
                
                return (
                  <div 
                    key={mIdx}
                    className="absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out"
                    style={{ 
                      left: marker.x, 
                      top: marker.y,
                      opacity: isRevealed ? 1 : 0,
                      transform: isRevealed ? "scale(1) translate(-50%, -50%)" : "scale(0.8) translate(-50%, -50%)"
                    }}
                  >
                    <div className="relative flex items-center justify-center group/marker">
                      <span className="absolute inline-flex h-4 w-4 rounded-full bg-[#ffd700]/30 animate-pulse" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#ffd700] shadow-[0_0_8px_#ffd700]" />
                      
                      {/* Tech HUD Tooltip */}
                      <div className="absolute left-3 top-[-14px] bg-[#0D0D0F]/90 border border-[#ffd700]/30 backdrop-blur-md px-2 py-1 rounded text-[8px] font-mono text-white whitespace-nowrap shadow-xl">
                        <span className="text-[#ffd700] font-bold block">{marker.label}</span>
                        <span className="text-white/40 block text-[6.5px] font-sans mt-0.5">{marker.desc}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>

            {/* Right Column: Patients selector, quotes & tech dashboard */}
            <div className="lg:col-span-5 space-y-8 reveal delay-200">
              
              {/* Patient Selector Tabs */}
              <div className="space-y-2 border-b border-white/5 pb-4">
                <span className="text-[9px] uppercase tracking-widest font-bold text-white/30 font-mono">SELECIONE O CASO CLÍNICO</span>
                <div className="grid grid-cols-2 gap-2">
                  {patients.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setActivePatientIndex(idx);
                        setManualRevealProgress(null); // Reset manual progress to let scroll handle it
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 text-left ${
                        idx === activePatientIndex
                          ? "bg-[#ffd700]/5 border-[#ffd700]/30 text-white shadow-lg shadow-[#ffd700]/2"
                          : "bg-transparent border-white/5 text-white/40 hover:border-white/10 hover:text-white/70"
                      }`}
                    >
                      <span className="font-mono text-[10px] text-[#ffd700]">0{idx + 1}</span>
                      <div className="truncate">
                        <h4 className="text-xs font-bold tracking-wide truncate">{p.name}</h4>
                        <p className="text-[8px] text-white/30 truncate">{p.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Delicate Patient Testimonial Quote */}
              <div className="space-y-4">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-[#ffd700] text-[#ffd700]" />
                  ))}
                </div>
                <p className="text-base md:text-lg text-white/80 font-serif leading-relaxed italic font-light">
                  "{patients[activePatientIndex].comment}"
                </p>
                <div className="text-[10px] text-white/40 font-mono tracking-wider">
                  {patients[activePatientIndex].name} — {patients[activePatientIndex].location}
                </div>
              </div>

              {/* Protocols Applied list */}
              <div className="space-y-3 border-t border-white/5 pt-6">
                <h5 className="text-[9px] uppercase tracking-widest font-bold text-[#ffd700] flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5" /> Protocolo Aplicado
                </h5>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                  {patients[activePatientIndex].protocols.map((proto, pIdx) => (
                    <div key={pIdx} className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col justify-between hover:border-white/10 transition-colors">
                      <div>
                        <span className="text-[10px] font-bold text-white tracking-wide">{proto.name}</span>
                        <span className="block text-[8px] text-[#ffd700] font-mono mt-0.5">{proto.area}</span>
                      </div>
                      <p className="text-[9.5px] text-white/40 font-light mt-2">{proto.effect}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diagnostic Biometric Stats */}
              <div className="border-t border-white/5 pt-6 space-y-3">
                <span className="text-[9px] uppercase tracking-widest font-bold text-white/30 font-mono">ANÁLISE BIOMÉTRICA DE RESULTADO</span>
                <div className="grid grid-cols-3 gap-3">
                  {patients[activePatientIndex].techStats.map((stat, sIdx) => (
                    <div key={sIdx} className="p-3 rounded-xl border border-white/5 bg-white/[0.005] text-center">
                      <span className="block text-[8px] text-white/40 uppercase tracking-wider">{stat.label}</span>
                      <span className="block text-base font-mono font-bold text-[#ffd700] mt-1">{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* FLOATING ACTION WHATSAPP BUTTON (Foco Mobile/Conversão) */}
      <a 
        href="https://wa.me/5594999999999?text=Olá,%20gostaria%20de%20agendar%20uma%20avaliação%20de%20Harmonização%20Estética" 
        target="_blank" 
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-vibrant-gold-brushed text-[#0D0D0F] flex items-center justify-center shadow-[0_4px_25px_rgba(244,180,26,0.45)] md:hidden transition-transform duration-300 active:scale-90 hover:scale-105"
      >
        <Phone className="h-6 w-6 animate-pulse" />
      </a>

      {/* FOOTER */}
      <footer className="relative z-10 bg-[#0D0D0F] border-t border-white/5 py-10 text-[#E3D5C1]/40">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-vibrant-gold-brushed text-[#0D0D0F] text-[11px] font-bold italic flex items-center justify-center">R</div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#ffd700] text-glow-vibrant-gold">RD Estética</span>
          </div>

          <div className="flex items-center gap-6 text-[9px] uppercase tracking-wider font-semibold">
            <a href="#servicos" className="hover:text-[#ffd700] transition-colors">Serviços</a>
            <a href="#procedimentos" className="hover:text-white transition-colors">Procedimentos</a>
            <a href="#videos" className="hover:text-white transition-colors">Vídeos</a>
            <RouterLink to="/privacy-policy" className="hover:text-white transition-colors">Privacidade</RouterLink>
            <RouterLink to="/terms-of-service" className="hover:text-white transition-colors">Termos</RouterLink>
          </div>

          <span className="text-[9px] tracking-wide">© 2026 RD Estética. Estética Avançada.</span>
        </div>
      </footer>

    </div>
  );
}
