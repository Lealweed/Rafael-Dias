import { useState, useEffect, useMemo } from "react";
import { createClient } from "../lib/supabase/client";
import { 
  Users, 
  MessageSquare, 
  Calendar, 
  AlertCircle, 
  Sparkles, 
  TrendingUp, 
  ArrowRight,
  Activity,
  ArrowUpRight,
  Clock,
  Settings
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { PremiumButton } from "../components/premium/PremiumButton";
import { cn } from "../lib/utils";

// --- Assets ---
const SILK_TEXTURE_URL = "https://images.unsplash.com/photo-1705674337411-3b89e5afcc11?auto=format&fit=crop&q=80";
const FLOURISH_URL = "https://cdn.jsdelivr.net/npm/game-icons-transparent@latest/svgs/delapouite/fleur-de-lys.svg";

// --- Sub-components ---

/**
 * AmbientOrb: A pulsing, interactive ambient data orb representing system health.
 */
function AmbientOrb() {
  return (
    <div className="relative h-16 w-16 flex items-center justify-center">
      <motion.div 
        animate={{ 
          opacity: [0.1, 0.3, 0.1],
          scale: [1, 1.2, 1],
          rotate: [0, 90, 180, 270, 360]
        }}
        transition={{ 
          duration: 10, 
          repeat: Infinity, 
          ease: "linear" 
        }}
        className="absolute inset-0 rounded-full bg-gradient-to-tr from-gold/30 via-transparent to-gold/20 blur-2xl"
      />
      <motion.div 
        animate={{ 
          opacity: [0.3, 0.6, 0.3],
          scale: [1, 1.05, 1],
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute inset-3 rounded-full border border-gold/40 bg-black-void/40 backdrop-blur-xl shadow-gold flex items-center justify-center"
      >
        <Activity className="h-4 w-4 text-gold animate-pulse" />
      </motion.div>
    </div>
  );
}

/**
 * StatCard: Editorial-style KPI card with overlapping typography.
 */
function StatCard({ index, value, label, trend, icon: Icon, onClick }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
      onClick={onClick}
      className="relative glass-dark p-4 rounded-xl flex flex-col justify-between group overflow-hidden cursor-pointer border border-white/5 hover:border-gold/30 transition-colors duration-500 min-h-[110px]"
    >
      <span className="absolute -top-2 -left-1 text-2xl font-display text-white/[0.03] pointer-events-none select-none tracking-tighter">
        {index}
      </span>
      
      <div className="relative z-10 flex justify-end">
        <Icon className="h-5 w-5 text-gold/20 group-hover:text-gold/60 transition-colors duration-500" />
      </div>

      <div className="relative z-10 space-y-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-display text-glow-gold tracking-tighter leading-none">
              {value}
            </span>
            {trend !== undefined && (
              <div className={cn(
                "flex items-center gap-0.5 text-[13px] font-bold px-1.5 py-0.5 rounded-full",
                trend >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
              )}>
                <TrendingUp className={cn("h-2.5 w-2.5", trend < 0 && "rotate-180")} />
                {trend > 0 ? `+${trend}%` : `${trend}%`}
              </div>
            )}
          </div>
          <p className="text-[13px] uppercase tracking-[0.2em] font-bold text-white/40 group-hover:text-gold/80 transition-colors duration-500">
            {label}
          </p>
        </div>
      </div>

      {/* Subtle bottom line transition */}
      <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gold group-hover:w-full transition-all duration-700" />
    </motion.div>
  );
}



/**
 * VIPSpotlight: High-impact card for the next significant appointment.
 */
function VIPSpotlight({ appointment }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      className="bg-black-matte p-4 rounded-xl border border-gold/20 relative overflow-hidden h-full flex flex-col justify-between shadow-2xl"
    >
      {/* Background Ornate flourishes */}
      <img src={FLOURISH_URL} alt="" className="absolute top-3 left-3 h-5 w-5 text-gold opacity-10 -rotate-90 pointer-events-none" style={{ filter: 'brightness(1.2) sepia(1) saturate(5) hue-rotate(-10deg)' }} />
      <img src={FLOURISH_URL} alt="" className="absolute bottom-3 right-3 h-5 w-5 text-gold opacity-10 rotate-90 pointer-events-none" style={{ filter: 'brightness(1.2) sepia(1) saturate(5) hue-rotate(-10deg)' }} />
      
      <div className="relative z-10">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="h-[1px] w-4 bg-gold/40" />
            <span className="text-[13px] uppercase tracking-[0.2em] font-bold text-gold">Destaque VIP</span>
        </div>
        
        <AnimatePresence mode="wait">
          {appointment ? (
            <motion.div 
              key={appointment.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              <h2 className="text-base font-display text-white leading-tight">
                {appointment.name}
              </h2>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-white/50">
                  <Clock className="h-3.5 w-3.5 text-gold/60" />
                  <span className="text-xs font-mono tracking-tighter text-white/80">
                    {appointment.time}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-white/50">
                  <Sparkles className="h-3.5 w-3.5 text-gold/60" />
                  <span className="text-[14px] uppercase tracking-widest">
                    {appointment.procedure}
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            <p className="text-white/20 text-xs italic font-display">Sem compromissos VIP.</p>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-10 mt-4">
        <PremiumButton variant="primary" className="w-full py-2 text-[13px] tracking-widest">
          VER PRONTUÁRIO PREMIUM
        </PremiumButton>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const supabase = useMemo(() => createClient(), []);
  
  const [stats, setStats] = useState({
    newLeadsToday: 0,
    newLeadsYesterday: 0,
    humanActive: 0,
    scheduled: 0,
    pendingFollowups: 0,
    totalLeads: 0,
  });
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [nextAppointment, setNextAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Main fetching logic (Preserved from original)
      let { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        const legacy = await supabase.from('Usuarios').select('*').order('created_at', { ascending: false });
        leads = legacy.data;
      }

      if (leads) {
        const now = new Date();
        const pendingCount = leads.filter((l: any) => {
          if (!l.next_followup_at) return false;
          const when = new Date(l.next_followup_at);
          return !isNaN(when.getTime()) && when <= now && String(l.conversation_status || '').toLowerCase() !== 'encerrado';
        }).length;

        const leadsToday = leads.filter((l: any) => l.created_at && new Date(l.created_at) >= today).length;
        const leadsYesterday = leads.filter((l: any) => {
          if (!l.created_at) return false;
          const d = new Date(l.created_at);
          return d >= yesterday && d < today;
        }).length;

        setStats({
          newLeadsToday: leadsToday,
          newLeadsYesterday: leadsYesterday,
          humanActive: leads.filter((l: any) => String(l.automation_status || '').toLowerCase() === 'paused_human').length,
          scheduled: leads.filter((l: any) => Boolean(l.calendar_event_id)).length,
          pendingFollowups: pendingCount,
          totalLeads: leads.length,
        });

        setRecentLeads(leads.slice(0, 5));

        // Fetch Next VIP Appointment from appointments table
        const { data: nextAppt } = await supabase
          .from('appointments')
          .select('*, leads(full_name)')
          .gte('appointment_date', now.toISOString())
          .eq('status', 'scheduled')
          .order('appointment_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (nextAppt) {
          const apptDate = new Date(nextAppt.appointment_date);
          setNextAppointment({
            name: nextAppt.leads?.full_name || "Paciente VIP",
            time: apptDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            procedure: nextAppt.title || "Consulta Estética"
          });
        }
      }
      setLoading(false);
    }

    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, [supabase]);

  const growth = useMemo(() => {
    if (stats.newLeadsYesterday === 0) return stats.newLeadsToday > 0 ? 100 : 0;
    return Math.round(((stats.newLeadsToday - stats.newLeadsYesterday) / stats.newLeadsYesterday) * 100);
  }, [stats.newLeadsToday, stats.newLeadsYesterday]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return "Bom Dia";
    if (hour >= 12 && hour < 18) return "Boa Tarde";
    return "Boa Noite";
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 w-full h-full flex flex-col space-y-6 top-spotlight pb-12">
      
      {/* --- Section A: Hero Header (Editorial Style) --- */}
      <section className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-4 pb-4 border-b border-white/5">
        <div className="max-w-3xl space-y-2.5">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-xl md:text-2xl font-display leading-[1.1] text-white tracking-tighter"
          >
            {getGreeting().split(" ")[0]} <span className="italic font-extralight text-gold/80">{getGreeting().split(" ")[1]}</span>, <br />
            Dr. Rafael Dias
          </motion.h1>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col md:flex-row md:items-center gap-4"
          >
            <div className="flex items-center gap-1.5 bg-gold/5 px-2.5 py-1 rounded-full border border-gold/20">
              <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[13px] tracking-[0.2em] uppercase font-bold text-gold">Inteligência estética ativa</span>
            </div>
            <p className="text-[13px] font-light text-white/40 max-w-xs">
              Processamento centralizado de {stats.newLeadsToday} solicitações via n8n.
            </p>
            <button 
              onClick={() => navigate('/config')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gold/30 bg-gold/10 hover:bg-gold/20 text-[13px] font-bold uppercase tracking-widest text-[#E5C38C] transition-all cursor-pointer shadow-sm hover:shadow-gold active:scale-95 duration-300"
            >
              <Settings className="w-2.5 h-2.5" />
              <span>Ajustar Mídias do Site</span>
            </button>
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.2, type: "spring" }}
          className="hidden lg:block"
        >
          <AmbientOrb />
        </motion.div>
      </section>

      {/* --- Section B: Grindstone Metrics (Vertical Cards) --- */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          index="01" 
          value={loading ? "..." : stats.newLeadsToday} 
          label="Leads do Dia" 
          trend={growth}
          icon={Users}
          onClick={() => navigate('/leads')}
        />
        <StatCard 
          index="02" 
          value={loading ? "..." : stats.humanActive} 
          label="Em Atendimento" 
          icon={MessageSquare}
          onClick={() => navigate('/conversations')}
        />
        <StatCard 
          index="03" 
          value={loading ? "..." : stats.scheduled} 
          label="Consultas Agenda" 
          icon={Calendar}
          onClick={() => navigate('/calendar')}
        />
        <StatCard 
          index="04" 
          value={loading ? "..." : stats.pendingFollowups} 
          label="Follow-ups" 
          icon={AlertCircle}
          onClick={() => navigate('/follow-ups')}
        />
      </section>



      {/* --- Section D: Facilitation Split (Activity & VIP) --- */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
            <h3 className="text-sm font-display text-white">Stream de Leads <span className="text-gold/40 italic font-light ml-1 text-xs">Atividade recente</span></h3>
            <PremiumButton variant="ghost" onClick={() => navigate('/leads')} className="text-[13px] opacity-40">
              Ver Histórico Completo
            </PremiumButton>
          </div>
          <div className="space-y-2">
            {recentLeads.map((lead, i) => (
              <motion.div 
                key={lead.id}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.01] hover:bg-gold/5 border border-transparent hover:border-gold/20 transition-all duration-500 cursor-pointer group"
                onClick={() => navigate(`/leads?id=${lead.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full border border-gold/30 flex items-center justify-center text-[14px] font-bold text-gold group-hover:bg-gold group-hover:text-black transition-all duration-500">
                    {(lead.full_name || lead.nome || lead.name || "P").substring(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-display text-white group-hover:text-gold transition-colors duration-500">{lead.full_name || lead.nome || lead.name || "Sem Nome"}</p>
                    <p className="text-[13px] uppercase tracking-[0.15em] text-white/30 font-bold">{lead.phone || "Telefone não informado"}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <p className="text-[14px] font-mono text-white/20">{new Date(lead.created_at).toLocaleDateString('pt-BR')}</p>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gold/5 border border-gold/10">
                    <div className="h-1 w-1 rounded-full bg-gold" />
                    <span className="text-[13px] uppercase tracking-widest text-gold/80 font-bold">{lead.automation_status || "Pendente"}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <VIPSpotlight appointment={nextAppointment} />
        </div>
      </section>

    </div>
  );
}
