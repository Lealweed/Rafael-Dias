import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link as RouterLink } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence, useSpring } from "motion/react";
import { Sparkles, ArrowRight, Play, CheckCircle2, Phone, Instagram, Facebook, Heart, Activity, Sun, X, Loader2, Menu } from "lucide-react";
import Lenis from "lenis";
import { PremiumButton } from "../components/premium/PremiumButton";
import { BeforeAfterSlider } from "../components/premium/BeforeAfterSlider";
import { TestimonialCarousel } from "../components/premium/TestimonialCarousel";
import { BentoServices } from "../components/premium/BentoServices";
import { fetchSiteSettings, mergeMediaSettings, DEFAULT_MEDIA_SETTINGS } from "../lib/siteSettings";
import { createClient } from "../lib/supabase/client";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const [activePatient, setActivePatient] = useState(0);
  const [siteSettings, setSiteSettings] = useState(DEFAULT_MEDIA_SETTINGS);
  const videoRef = useRef<HTMLVideoElement>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // Form & Tracking States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Info, 2: Date/Time, 3: Stripe Details
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [treatment, setTreatment] = useState("Avaliação Geral");
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });
  const [selectedSlot, setSelectedSlot] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [formOrigin, setFormOrigin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const SLOTS = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];
  const [busySlots, setBusySlots] = useState<string[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  useEffect(() => {
    if (!isModalOpen || !selectedDate) return;

    let active = true;
    const fetchAvailability = async () => {
      setLoadingCalendar(true);
      try {
        const timeMin = `${selectedDate}T00:00:00-03:00`;
        const res = await fetch(`/api/n8n/calendar?action=list&timeMin=${encodeURIComponent(timeMin)}&days=1`);
        if (!res.ok) throw new Error("Failed to fetch calendar");
        const data = await res.json();
        
        if (!active) return;
        
        const events = Array.isArray(data.events) ? data.events : [];
        const occupied: string[] = [];

        for (const slot of SLOTS) {
          const slotStart = new Date(`${selectedDate}T${slot}:00-03:00`);
          const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

          const isOverlapping = events.some((event: any) => {
            const evStartStr = event.start?.dateTime || event.start?.date;
            const evEndStr = event.end?.dateTime || event.end?.date;
            if (!evStartStr || !evEndStr) return false;

            const evStart = new Date(evStartStr);
            const evEnd = new Date(evEndStr);

            return slotStart.getTime() < evEnd.getTime() && slotEnd.getTime() > evStart.getTime();
          });

          if (isOverlapping) {
            occupied.push(slot);
          }
        }

        setBusySlots(occupied);
        
        // Auto-select first available slot if current is busy
        if (occupied.includes(selectedSlot) || !selectedSlot) {
          const firstAvailable = SLOTS.find(s => !occupied.includes(s));
          setSelectedSlot(firstAvailable || "");
        }
      } catch (err) {
        console.error("Error fetching availability:", err);
      } finally {
        if (active) {
          setLoadingCalendar(false);
        }
      }
    };

    fetchAvailability();

    return () => {
      active = false;
    };
  }, [isModalOpen, selectedDate]);

  const trackEvent = async (eventType: string, leadId?: string) => {
    try {
      await supabase.from("landing_analytics").insert({
        event_type: eventType,
        lead_id: leadId || null,
      });
    } catch (e) {
      console.warn("Failed to track event:", e);
    }
  };

  const openBookingModal = (origin: string) => {
    setFormOrigin(origin);
    setStep(1);
    setIsModalOpen(true);
    trackEvent("click_vip_button");
  };

  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean.length <= 11) {
      let formatted = clean;
      if (clean.length > 2) {
        formatted = `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
      }
      if (clean.length > 7) {
        formatted = `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
      }
      setPhone(formatted);
    }
  };

  const handleCpfChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean.length <= 11) {
      let formatted = clean;
      if (clean.length > 3) {
        formatted = `${clean.slice(0, 3)}.${clean.slice(3)}`;
      }
      if (clean.length > 6) {
        formatted = `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
      }
      if (clean.length > 9) {
        formatted = `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
      }
      setCpf(formatted);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!name.trim() || !phone.trim() || !email.trim() || !cpf.trim()) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
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
          treatment,
          date: selectedDate,
          slot: selectedSlot,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.url) {
        window.location.href = data.url;
      } else {
        alert(data?.error || "Erro ao processar checkout.");
      }
    } catch (err) {
      console.error(err);
      alert("Houve uma falha ao conectar com o serviço de agendamentos.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
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

  const patients = useMemo(() => patientTemplates.map((patient, index) => ({
    ...patient,
    name: siteSettings[`case_name_${index}`] || patient.name,
    role: siteSettings[`case_role_${index}`] || patient.role,
    location: siteSettings[`case_location_${index}`] || patient.location,
    comment: siteSettings[`case_comment_${index}`] || patient.comment,
    avatar: siteSettings[`case_avatar_${index}`] || `https://i.pravatar.cc/100?u=${patient.name}`,
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
            <motion.a
              href="/depilacao-a-laser"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="hover:text-gold transition-colors relative group"
            >
              Depilação Laser
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-gold transition-all duration-500 group-hover:w-full" />
            </motion.a>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 sm:gap-6"
          >
            <PremiumButton variant="ghost" href="/login" className="hidden sm:flex opacity-50 hover:opacity-100">
              Equipe
            </PremiumButton>
            <PremiumButton onClick={() => openBookingModal("Navbar")}>
              Agendar
            </PremiumButton>
            
            {/* Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex lg:hidden h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] text-[#E3D5C1] hover:text-gold hover:border-gold/40 hover:shadow-gold transition-all duration-500 cursor-pointer z-50 relative"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </motion.div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 lg:hidden bg-black-void/98 backdrop-blur-3xl pt-28 px-8 pb-10 flex flex-col justify-between overflow-y-auto"
          >
            <div className="flex flex-col items-center justify-center gap-6 mt-4">
              {[
                { label: "Serviços", href: "#servicos" },
                { label: "Resultados", href: "#resultados" },
                { label: "Método", href: "#metodo" },
                { label: "Depoimentos", href: "#depoimentos" },
                { label: "Depilação Laser", href: "/depilacao-a-laser" },
                { label: "Equipe", href: "/login" }
              ].map((item, index) => (
                <motion.a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08, duration: 0.5 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-lg uppercase tracking-[0.25em] font-bold text-white/50 hover:text-gold active:text-gold focus:text-gold transition-all duration-300 relative py-3 w-full text-center flex flex-col items-center group"
                >
                  {item.label}
                  <span className="absolute bottom-0 h-[1.5px] bg-gold w-0 group-hover:w-20 group-active:w-20 group-focus:w-20 transition-all duration-500" />
                </motion.a>
              ))}
            </div>

            <div className="flex flex-col gap-4 mt-8">
              <PremiumButton 
                onClick={() => {
                  setMobileMenuOpen(false);
                  openBookingModal("Mobile Menu");
                }}
                className="w-full py-4 text-[10px] tracking-[0.25em] shadow-gold"
              >
                Agendar Avaliação VIP
              </PremiumButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              {siteSettings.home_hero_title_first || "Dr. Rafael"} <br />
              <span className="italic text-gold text-glow-gold relative">
                {siteSettings.home_hero_title_last || "Dias"}
                <motion.span 
                  className="absolute -bottom-2 left-0 h-[1px] bg-gold/50"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 1, duration: 2 }}
                />
              </span>
            </h2>
            
            <p className="text-white/40 text-sm md:text-base font-light max-w-md leading-relaxed tracking-wide">
              {siteSettings.home_hero_desc || "Descubra a arte da transformação sutil. Sob a liderança do Dr. Rafael Dias, esculpimos sua melhor versão com precisão clínica e um toque de luxo incomparável."}
            </p>

            <div className="flex flex-wrap gap-10 pt-6">
              <PremiumButton onClick={() => openBookingModal("Hero")} className="px-14 py-6 text-[10px]">
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
                "{patients[0]?.comment || "O Dr. Rafael Dias mudou minha percepção sobre estética. Naturalidade em cada detalhe, um verdadeiro artista."}"
              </p>
              <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center overflow-hidden font-display text-[10px] text-gold shrink-0">
                  {patients[0]?.avatar ? (
                    <img 
                      src={patients[0].avatar} 
                      alt={patients[0].name}
                      className="w-full h-full object-cover grayscale"
                    />
                  ) : (
                    "RD"
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gold">{patients[0]?.name || "Letícia Oliveira"}</p>
                  <p className="text-[8px] text-white/30 uppercase tracking-tighter">{patients[0]?.role || "Influenciadora Digital"}</p>
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
            <PremiumButton onClick={() => openBookingModal("Footer CTA")} className="px-24 py-8 text-[11px] shadow-gold">
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
                <li><a href="/depilacao-a-laser" className="hover:text-gold transition-colors">Depilação a Laser</a></li>
              </ul>
            </div>

            <div className="space-y-10">
              <h5 className="text-[10px] font-medium uppercase tracking-[0.4em] text-white/50">Concierge</h5>
              <ul className="space-y-5 text-[10px] uppercase tracking-[0.15em] text-white/30 font-light">
                <li className="flex items-center gap-3 text-white/60"><Phone size={14} className="text-gold/50" /> {siteSettings.home_footer_phone || "(94) 99999-9999"}</li>
                <li>{siteSettings.home_footer_email || "contato@rafaeldias.com.br"}</li>
                <li className="whitespace-pre-line">{siteSettings.home_footer_address || "Rua das Esmeraldas, 123 - Parauapebas - PA"}</li>
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

      {/* LUXURY VIP BOOKING MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md bg-[#0B0D12]/95 border border-[#D4AF37]/35 rounded-[32px] p-6 md:p-8 shadow-[0_10px_50px_rgba(212,175,55,0.15)] backdrop-blur-xl"
            >
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#E5C38C] mb-3">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-medium tracking-tight text-white font-serif">Agende sua Experiência VIP</h3>
                <p className="text-xs text-white/40 mt-1 font-light">
                  {step === 1 && "Passo 1: Identificação do Paciente"}
                  {step === 2 && "Passo 2: Escolha o melhor Horário"}
                  {step === 3 && "Passo 3: Regras de Pagamento & Checkout"}
                </p>
                {/* Visual Step Indicator */}
                <div className="flex justify-center gap-1.5 mt-3">
                  <span className={`w-6 h-1 rounded-full transition-all ${step >= 1 ? "bg-[#D4AF37]" : "bg-white/10"}`} />
                  <span className={`w-6 h-1 rounded-full transition-all ${step >= 2 ? "bg-[#D4AF37]" : "bg-white/10"}`} />
                  <span className={`w-6 h-1 rounded-full transition-all ${step >= 3 ? "bg-[#D4AF37]" : "bg-white/10"}`} />
                </div>
              </div>

              <form onSubmit={handleBookingSubmit} className="space-y-4">
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">Nome Completo</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Seu nome completo"
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white placeholder-white/20 outline-none focus:border-[#D4AF37] transition-all font-light"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">WhatsApp / Celular</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="(94) 99999-9999"
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white placeholder-white/20 outline-none focus:border-[#D4AF37] transition-all font-light"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">E-mail</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu.email@exemplo.com"
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white placeholder-white/20 outline-none focus:border-[#D4AF37] transition-all font-light"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">CPF</label>
                      <input
                        type="text"
                        required
                        value={cpf}
                        onChange={(e) => handleCpfChange(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white placeholder-white/20 outline-none focus:border-[#D4AF37] transition-all font-light"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 mt-4 px-6 py-3.5 bg-gradient-to-tr from-[#D4AF37] via-[#E5C38C] to-[#B8860B] text-xs font-bold uppercase tracking-wider text-[#0B0D12] rounded-xl hover:shadow-[0_4px_20px_rgba(212,175,55,0.25)] transition-all active:scale-95"
                    >
                      <span>Continuar para Data & Horário</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">Selecione o Procedimento</label>
                      <select
                        value={treatment}
                        onChange={(e) => setTreatment(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/80 px-4 py-3 text-xs text-white outline-none focus:border-[#D4AF37] transition-all font-light appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23D4AF37'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundPosition: 'right 16px center', backgroundSize: '12px', backgroundRepeat: 'no-repeat' }}
                      >
                        <option value="Avaliação Geral">Avaliação Estética Geral</option>
                        <option value="Harmonização Facial">Harmonização Facial</option>
                        <option value="Lip Gloss / Preenchimento Labial">Preenchimento Labial (Lip Gloss)</option>
                        <option value="Bioestimuladores de Colágeno">Bioestimuladores de Colágeno</option>
                        <option value="Fios de Sustentação">Fios de Sustentação PDO</option>
                        <option value="Toxina Botulínica">Toxina Botulínica (Botox)</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">Escolha a Data</label>
                      <input
                        type="date"
                        required
                        min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white outline-none focus:border-[#D4AF37] transition-all [color-scheme:dark]"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">Horários Disponíveis</label>
                        {loadingCalendar && (
                          <span className="flex items-center gap-1 text-[9px] text-[#E5C38C] animate-pulse">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Verificando agenda...
                          </span>
                        )}
                      </div>
                      
                      {loadingCalendar ? (
                        <div className="grid grid-cols-3 gap-2">
                          {SLOTS.map((slotOption) => (
                            <div
                              key={slotOption}
                              className="py-2 px-3 rounded-lg border border-white/5 bg-black/10 text-center text-xs font-mono text-white/20 animate-pulse select-none"
                            >
                              {slotOption}
                            </div>
                          ))}
                        </div>
                      ) : SLOTS.every(s => busySlots.includes(s)) ? (
                        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-center text-xs text-red-300 font-light">
                          😔 Nenhum horário disponível nesta data. Por favor, selecione outro dia.
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          {SLOTS.map((slotOption) => {
                            const isBusy = busySlots.includes(slotOption);
                            return (
                              <button
                                key={slotOption}
                                type="button"
                                disabled={isBusy}
                                onClick={() => setSelectedSlot(slotOption)}
                                className={`py-2 px-3 rounded-lg border text-center text-xs font-mono transition-all ${
                                  selectedSlot === slotOption
                                    ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#E5C38C] font-bold shadow-[0_0_10px_rgba(212,175,55,0.15)]"
                                    : isBusy
                                    ? "bg-red-500/5 border-red-500/10 text-red-400/30 line-through cursor-not-allowed"
                                    : "bg-black/20 border-white/10 text-white/50 hover:border-white/20 hover:text-white"
                                }`}
                                title={isBusy ? "Horário indisponível (reservado)" : `Selecionar ${slotOption}`}
                              >
                                {slotOption}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 mt-4">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="flex-1 py-3 px-5 border border-white/10 rounded-xl text-xs font-semibold text-white/60 hover:text-white transition-all text-center"
                      >
                        Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={!selectedSlot || loadingCalendar}
                        className="flex-[1.5] flex items-center justify-center gap-2 py-3 px-5 bg-gradient-to-tr from-[#D4AF37] via-[#E5C38C] to-[#B8860B] text-xs font-bold uppercase tracking-wider text-[#0B0D12] rounded-xl hover:shadow-[0_4px_20px_rgba(212,175,55,0.25)] transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <span>Avançar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div className="bg-[#07090E] border border-white/5 p-4 rounded-2xl space-y-3">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#E5C38C]">Resumo Financeiro da Consulta</h4>
                      <div className="flex justify-between text-xs text-white/60">
                        <span>Valor Total da Consulta</span>
                        <span className="font-mono text-white font-semibold">R$ 300,00</span>
                      </div>
                      <div className="flex justify-between text-xs text-[#E5C38C]">
                        <span>Sinal Pago Agora (Garantia)</span>
                        <span className="font-mono font-bold">R$ 150,00</span>
                      </div>
                      <div className="flex justify-between text-xs text-white/40">
                        <span>Valor Restante na Clínica</span>
                        <span className="font-mono">R$ 150,00</span>
                      </div>
                      
                      <div className="pt-2 border-t border-white/5 text-[9px] text-white/40 leading-relaxed">
                        ⚠️ **Nota de Dedução**: Caso você feche qualquer procedimento após a avaliação, os R$ 300,00 inteiros serão deduzidos do preço final do procedimento!
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">Observações Especiais (Opcional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Algum detalhe relevante sobre seu agendamento?"
                        rows={2}
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-white placeholder-white/20 outline-none focus:border-[#D4AF37] transition-all font-light resize-none"
                      />
                    </div>

                    <div className="flex gap-3 mt-4">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="flex-1 py-3 px-5 border border-white/10 rounded-xl text-xs font-semibold text-white/60 hover:text-white transition-all text-center"
                      >
                        Voltar
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-[2] flex items-center justify-center gap-2 py-3.5 px-5 bg-gradient-to-tr from-[#D4AF37] via-[#E5C38C] to-[#B8860B] text-xs font-bold uppercase tracking-wider text-[#0B0D12] rounded-xl hover:shadow-[0_4px_20px_rgba(212,175,55,0.25)] transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Redirecionando...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Confirmar & Reservar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
