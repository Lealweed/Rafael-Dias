import { useState, useEffect, useMemo, useRef } from "react";
import { Link as RouterLink } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence, useSpring } from "motion/react";
import { Sparkles, ArrowRight, Play, CheckCircle2, Phone, Instagram, Facebook, Heart, Activity, Sun } from "lucide-react";
import Lenis from "lenis";
import { PremiumButton } from "../components/premium/PremiumButton";
import { BeforeAfterSlider } from "../components/premium/BeforeAfterSlider";
import { TestimonialCarousel } from "../components/premium/TestimonialCarousel";
import { BentoServices } from "../components/premium/BentoServices";
import { fetchSiteSettings, mergeMediaSettings, DEFAULT_MEDIA_SETTINGS } from "../lib/siteSettings";

const patientTemplates = [
  {
    name: "Letícia Oliveira",
    role: "Influenciadora & Advogada",
    location: "Parauapebas - PA",
    comment: "Minha rotina exige uma imagem impecável e natural. O protocolo de Harmonização Facial do Dr. Rafael trouxe frescor e rejuvenescimento, mantendo minha identidade. Um atendimento premium único.",
    beforeKey: "patient_before_image_0",
    afterKey: "patient_after_image_0",
    markers: [
      { x: "50%", y: "22%", label: "Toxina Botulínica", desc: "Fronte Suavizada" },
      { x: "50%", y: "56%", label: "Ácido Hialurônico", desc: "Contorno Labial" },
      { x: "35%", y: "45%", label: "Bioestimulador", desc: "Sustentação Malar" },
      { x: "65%", y: "68%", label: "Definição", desc: "Ângulo Mandibular" }
    ]
  },
  {
    name: "Dra. Mariana Castro",
    role: "Promotora de Justiça",
    location: "Parauapebas - PA",
    comment: "Confiança e discrição. O Dr. Rafael explica cada detalhe do planejamento antes de começar. O Botox e os bioestimuladores trouxeram firmeza com total naturalidade.",
    beforeKey: "patient_before_image_1",
    afterKey: "patient_after_image_1",
    markers: [
      { x: "42%", y: "42%", label: "Fios PDO", desc: "Lifting Terço Médio" },
      { x: "68%", y: "52%", label: "Bioestimulador", desc: "Estímulo de Colágeno" }
    ]
  },
  {
    name: "Dr. Carlos Eduardo",
    role: "Advogado Sócio-Sênior",
    location: "Parauapebas - PA",
    comment: "Sempre tive receio de ficar artificial. O Dr. Rafael me tranquilizou na consulta presencial. O resultado do preenchimento e colágeno ficou incrível, discreto e rejuvenescido.",
    beforeKey: "patient_before_image_2",
    afterKey: "patient_after_image_2",
    markers: [
      { x: "50%", y: "38%", label: "Rinomodelação", desc: "Alinhamento Sutil" },
      { x: "72%", y: "70%", label: "Mandíbula & Mento", desc: "Definição de Contorno" }
    ]
  }
];

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const [activePatient, setActivePatient] = useState(0);
  const [siteSettings, setSiteSettings] = useState(DEFAULT_MEDIA_SETTINGS);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.98]);
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, -20]);
  
  const portraitY = useTransform(scrollYProgress, [0, 0.5], [0, 100]);
  const resultsY = useTransform(scrollYProgress, [0.3, 0.7], [50, -50]);
  const auraY = useTransform(scrollYProgress, [0, 1], [0, 400]);
  const floatY = useTransform(scrollYProgress, [0, 1], [0, -200]);

  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      duration: 1.5,
      anchors: true,
    });

    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    fetchSiteSettings().then((result) => {
      if (result.ok && result.settings) {
        setSiteSettings(mergeMediaSettings(result.settings));
      }
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.log("Autoplay was prevented on mount:", error);
        });
      }
    }
  }, [siteSettings.home_hero_video]);

  const services = useMemo(() => [
    {
      title: "Harmonização Facial",
      desc: "Equilíbrio e simetria com resultados naturais e sofisticados.",
      icon: <Sparkles className="text-gold" />,
      size: "large" as const,
      image: siteSettings.bento_service_image_0,
    },
    {
      title: "Protocolo Lip Gloss",
      desc: "Hidratação profunda e volume sutil para lábios perfeitos.",
      icon: <Heart className="text-gold" />,
      size: "small" as const,
      image: siteSettings.bento_service_image_1,
    },
    {
      title: "Bioestimuladores",
      desc: "Recupere o colágeno e a firmeza da sua pele.",
      icon: <Activity className="text-gold" />,
      size: "small" as const,
      image: siteSettings.bento_service_image_2,
    },
    {
      title: "Ultraformer III",
      desc: "Tecnologia de ponta para lifting e contorno facial.",
      icon: <Sun className="text-gold" />,
      size: "medium" as const,
      image: siteSettings.bento_service_image_3,
    },
  ], [siteSettings]);

  const patients = useMemo(() => patientTemplates.map((patient) => ({
    ...patient,
    beforeImage: siteSettings[patient.beforeKey] || DEFAULT_MEDIA_SETTINGS[patient.beforeKey],
    afterImage: siteSettings[patient.afterKey] || DEFAULT_MEDIA_SETTINGS[patient.afterKey],
  })), [siteSettings]);

  return (
    <div className="relative min-h-screen bg-black-void text-[#E3D5C1] font-sans selection:bg-gold/30 selection:text-gold overflow-x-hidden">
      
      {/* Dynamic Scroll Progress */}
      <motion.div 
        className="fixed top-0 left-0 h-[2px] bg-gold z-[100] origin-left"
        style={{ scaleX: scrollYProgress }}
      />

      {/* Parallax Background Aura */}
      <motion.div 
        style={{ y: auraY }}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] bg-gold/[0.03] blur-[150px] rounded-full pointer-events-none z-0"
      />

      {/* Floating Decorative Elements */}
      <motion.div 
        style={{ y: floatY }}
        className="absolute top-[20%] right-[10%] w-32 h-32 border border-gold/10 rounded-full pointer-events-none z-0 hidden lg:block"
      />
      <motion.div 
        style={{ y: useTransform(scrollYProgress, [0, 1], [0, -400]) }}
        className="absolute top-[60%] left-[5%] w-64 h-64 border border-gold/5 rounded-full pointer-events-none z-0 hidden lg:block"
      />

      {/* Luxury Navbar */}
      <nav className={`fixed top-0 left-0 z-50 w-full transition-all duration-1000 ${
        scrolled ? "glass border-b border-gold/10 py-3" : "bg-transparent py-8"
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 group cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <div className="h-10 w-10 glass-gold overflow-hidden flex items-center justify-center rounded-full group-hover:scale-110 transition-transform duration-500">
              <img src="/assets/logo.jpg" alt="Dr. Rafael Dias Logo" className="w-full h-full object-cover" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xs font-bold tracking-[0.5em] uppercase text-gold font-display leading-none mb-1">Instituto</h1>
              <p className="text-[7px] text-white/30 tracking-[0.6em] uppercase font-mono leading-none">Rafael Dias</p>
            </div>
          </motion.div>
          
          <div className="hidden lg:flex items-center gap-12 text-[9px] uppercase tracking-[0.3em] font-bold">
            {["Serviços", "Resultados", "Método", "Depoimentos"].map((item, i) => (
              <motion.a 
                key={item} 
                href={`#${item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`} 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="hover:text-gold transition-colors relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-gold transition-all duration-500 group-hover:w-full" />
              </motion.a>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 sm:gap-6"
          >
            <PremiumButton variant="ghost" href="/login" className="hidden sm:flex opacity-50 hover:opacity-100">
              Equipe
            </PremiumButton>
            <PremiumButton href="https://wa.me/5594999999999">
              Agendar
            </PremiumButton>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section: Dark Spotlight & Cinematic Background */}
      <section className="relative min-h-screen flex items-center pt-24 pb-12 overflow-hidden">
        {/* Cinematic Video/Motion Background */}
        <div className="absolute inset-0 z-0">
          <video 
            ref={videoRef}
            src={siteSettings.home_hero_video}
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover opacity-20 grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black-void via-transparent to-black-void opacity-90" />
        </div>

        <div className="absolute inset-0 top-spotlight pointer-events-none z-[1]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gold/5 blur-[150px] rounded-full pointer-events-none z-[1]" />
        
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
          <motion.div 
            style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-10"
          >
            <h2 className="text-6xl md:text-8xl lg:text-9xl font-display font-light leading-[0.85] text-white">
              Dr. Rafael <br />
              <span className="italic text-gold text-glow-gold relative">
                Dias
                <motion.span 
                  className="absolute -bottom-2 left-0 h-[1px] bg-gold/50"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 1, duration: 2 }}
                />
              </span>
            </h2>
            
            <p className="text-white/40 text-sm md:text-base font-light max-w-md leading-relaxed tracking-wide">
              Descubra a arte da transformação sutil. Sob a liderança do Dr. Rafael Dias, esculpimos sua melhor versão com precisão clínica e um toque de luxo incomparável.
            </p>

            <div className="flex flex-wrap gap-10 pt-6">
              <PremiumButton className="px-14 py-6 text-[10px]">
                Agendar Consulta VIP
              </PremiumButton>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
            style={{ y: portraitY }}
          >
            <div className="relative rounded-[48px] overflow-hidden border border-white/5 aspect-[4/5] shadow-2xl group">
              <motion.img 
                src={siteSettings.home_hero_portrait_image} 
                alt="Dr. Rafael Dias" 
                className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-1000"
                whileHover={{ scale: 1.03 }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black-void via-black-void/10 to-transparent opacity-40" />
              <div className="absolute inset-0 inner-glow opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            </div>
            
            {/* Elegant Floating Review */}
            <motion.div 
              className="absolute -bottom-10 -left-10 glass p-10 rounded-[32px] hidden lg:block max-w-[320px] shadow-gold border-gold/10"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              <div className="flex gap-1.5 mb-5">
                {[...Array(5)].map((_, i) => <Sparkles key={i} size={8} className="text-gold" />)}
              </div>
              <p className="text-xs text-white/80 italic leading-relaxed font-light">
                "O Dr. Rafael Dias mudou minha percepção sobre estética. Naturalidade em cada detalhe, um verdadeiro artista."
              </p>
              <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center font-display text-[10px] text-gold">RD</div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gold">Letícia Oliveira</p>
                  <p className="text-[8px] text-white/30 uppercase tracking-tighter">Influenciadora Digital</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Services: Asymmetric Bento */}
      <section id="servicos" className="py-40 relative">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="mb-24 space-y-6 max-w-2xl"
          >
            <h4 className="text-[9px] uppercase tracking-[0.6em] font-bold text-gold">Premium Services</h4>
            <h2 className="text-5xl md:text-8xl font-display font-light text-white leading-tight">
              Especialidades <br /> <span className="italic text-glow-gold">Esculpidas</span>
            </h2>
          </motion.div>

          <BentoServices services={services} />
        </div>
      </section>

      {/* Results: Professional Visualizer */}
      <section id="resultados" className="py-40 bg-black-matte/20 relative overflow-hidden border-y border-white/5">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gold/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-20 items-center">
          <div className="lg:col-span-5 space-y-12">
            <div className="space-y-6">
              <h4 className="text-[9px] uppercase tracking-[0.6em] font-bold text-gold">Clinical Evidence</h4>
              <h2 className="text-5xl md:text-7xl font-display font-light text-white leading-[0.85]">
                Precisão <br /> <span className="italic">Visualizada</span>
              </h2>
              <p className="text-white/40 text-sm md:text-base leading-relaxed font-light tracking-wide">
                Nossos resultados são fruto de um planejamento milimétrico. Explore as marcações técnicas e as transformações sutis que honram sua identidade única.
              </p>
            </div>

            <div className="space-y-3">
              {patients.map((p, i) => (
                <motion.button 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setActivePatient(i)}
                  aria-pressed={activePatient === i}
                  className={`w-full text-left p-8 rounded-[24px] border transition-all duration-700 group ${
                    activePatient === i ? "glass-gold border-gold/30 shadow-gold" : "glass border-transparent hover:border-white/10"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] mb-1 group-hover:text-gold transition-colors">{p.name}</p>
                      <p className="text-[10px] text-white/30 uppercase tracking-tighter">{p.role}</p>
                    </div>
                    {activePatient === i && <ArrowRight size={14} className="text-gold" />}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={activePatient}
                initial={{ opacity: 0, scale: 0.98, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.98, x: -20 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                style={{ y: resultsY }}
              >
                <BeforeAfterSlider 
                  beforeImage={patients[activePatient].beforeImage}
                  afterImage={patients[activePatient].afterImage}
                  markers={patients[activePatient].markers}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Testimonials: Peek Carousel */}
      <section id="depoimentos" className="py-40">
        <div className="max-w-7xl mx-auto px-6 mb-24 text-center space-y-8">
          <h4 className="text-[9px] uppercase tracking-[0.6em] font-bold text-gold">The Inner Circle</h4>
          <h2 className="text-5xl md:text-8xl font-display font-light text-white">Relatos de <span className="italic text-glow-gold">Excelência</span></h2>
          <p className="text-white/20 text-[8px] tracking-[0.5em] uppercase font-medium">Trusted by high-standard professionals</p>
        </div>
        
        <TestimonialCarousel testimonials={patients} />
      </section>

      {/* Grand Footer CTA */}
      <footer className="relative pt-48 pb-20 bg-black-void overflow-hidden border-t border-white/5">
        <motion.div 
          style={{ y: useTransform(scrollYProgress, [0.8, 1], [0, -100]) }}
          className="absolute inset-0 top-spotlight rotate-180 opacity-40 pointer-events-none" 
        />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-48 space-y-16">
            <motion.h2 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-6xl md:text-9xl font-display font-light text-white tracking-tight leading-none"
            >
              Pronta para revelar <br /> sua <span className="italic text-gold text-glow-gold">radiância?</span>
            </motion.h2>
            <PremiumButton href="https://wa.me/5594999999999" className="px-24 py-8 text-[11px] shadow-gold">
              Agendar Avaliação VIP
            </PremiumButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 border-t border-white/10 pt-24">
            <div className="space-y-8">
              <div className="h-12 w-12 glass-gold flex items-center justify-center rounded-full font-display font-bold text-gold tracking-tighter">
                RD
              </div>
              <p className="text-[13px] text-white/40 leading-relaxed font-light tracking-wide">
                Esculpindo a beleza com naturalidade e sofisticação clínica em Parauapebas.
              </p>
              <div className="flex gap-5">
                {[Instagram, Facebook].map((Icon, i) => (
                  <a key={i} href="#" className="h-10 w-10 glass flex items-center justify-center rounded-full hover:border-gold/50 hover:text-gold transition-all duration-500">
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-10">
              <h5 className="text-[10px] font-medium uppercase tracking-[0.4em] text-white/50">Menu</h5>
              <ul className="space-y-5 text-[10px] uppercase tracking-[0.25em] text-white/30 font-medium">
                {["Serviços", "Resultados", "Método", "Equipe"].map(item => (
                  <li key={item}><a href="#" className="hover:text-gold transition-colors">{item}</a></li>
                ))}
              </ul>
            </div>

            <div className="space-y-10">
              <h5 className="text-[10px] font-medium uppercase tracking-[0.4em] text-white/50">Concierge</h5>
              <ul className="space-y-5 text-[10px] uppercase tracking-[0.15em] text-white/30 font-light">
                <li className="flex items-center gap-3 text-white/60"><Phone size={14} className="text-gold/50" /> (94) 99999-9999</li>
                <li>contato@rafaeldias.com.br</li>
                <li>Rua das Esmeraldas, 123</li>
                <li>Parauapebas - PA</li>
              </ul>
            </div>

            <div className="space-y-10">
              <h5 className="text-[10px] font-medium uppercase tracking-[0.4em] text-white/50">Newsletter VIP</h5>
              <div className="flex flex-col gap-6">
                <p className="text-[11px] text-white/20 leading-relaxed font-light tracking-wide">Junte-se ao nosso círculo exclusivo para atualizações e insights estéticos.</p>
                <div className="relative">
                  <input 
                    type="email" 
                    placeholder="Seu melhor e-mail" 
                    className="w-full bg-transparent border-b border-white/10 pb-3 text-[11px] font-light focus:border-gold outline-none transition-all placeholder:text-white/10 text-white/60"
                  />
                  <button className="absolute right-0 bottom-3 text-gold/60 text-[9px] font-bold uppercase tracking-[0.3em] hover:translate-x-1 transition-transform">Entrar</button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-32 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[9px] uppercase tracking-[0.4em] text-white/10 font-bold">
            <p>&copy; 2024 Instituto Rafael Dias. Definido pela Excelência.</p>
            <div className="flex gap-12">
              <a href="/privacy-policy" className="hover:text-white transition-colors">Privacidade</a>
              <a href="/terms-of-service" className="hover:text-white transition-colors">Termos</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
