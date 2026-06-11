import { useState, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Sparkles, ArrowRight, ShieldCheck, Heart, Clock, Star, Play, Award, CheckCircle2, ChevronRight, Phone } from "lucide-react";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

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
    };

    window.addEventListener("scroll", handleScroll);

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

      {/* SECTION 5: TESTIMONIALS & RATING */}
      <section id="depoimentos" className="relative z-10 bg-[#F4EFEB] text-[#1B1B1C] py-20 border-t border-[#1B1B1C]/5">
        <div className="mx-auto max-w-6xl px-6 space-y-12">
          
          <div className="text-center space-y-2 reveal">
            <span className="text-[9px] uppercase tracking-widest font-bold text-[#1B1B1C]/40">Avaliações</span>
            <h2 className="text-2xl md:text-[34px] font-light font-serif tracking-tight text-[#1b1b1c]">Voz dos Pacientes</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { name: "Mariana Souza", text: "Minha experiência foi incrível. O resultado ficou extremamente sutil e natural.", stars: 5, avatar: "MS" },
              { name: "Carolina Castro", text: "Profissionalismo impecável. O Dr. Rafael explicou cada detalhe das marcações faciais.", stars: 5, avatar: "CC" },
              { name: "Juliana Santos", text: "Lábios hidratados, definidos e muito simétricos. Recomendo de olhos fechados!", stars: 5, avatar: "JS" }
            ].map((t, idx) => (
              <div 
                key={idx} 
                className={`rounded-[24px] border border-[#1b1b1c]/5 bg-[#E3D5C1]/20 p-6 flex flex-col justify-between reveal delay-${(idx + 1) * 100}`}
              >
                <div className="space-y-3">
                  <div className="flex gap-0.5">
                    {[...Array(t.stars)].map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-[#ffd700] text-[#ffd700]" />
                    ))}
                  </div>
                  <p className="text-[11px] text-[#1B1B1C]/70 italic leading-relaxed font-light">"{t.text}"</p>
                </div>
                <div className="flex items-center gap-3 pt-4 mt-4 border-t border-[#1b1b1c]/5">
                  <div className="h-8 w-8 rounded-full bg-[#1B1B1C] text-[#E3D5C1] text-[10px] font-bold flex items-center justify-center">
                    {t.avatar}
                  </div>
                  <h4 className="text-[10px] font-bold text-[#1B1B1C]">{t.name}</h4>
                </div>
              </div>
            ))}
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
