import { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, MessageSquare, Settings, AlertCircle, BarChart3, Search, Calendar as CalendarIcon, LogOut, UserCheck, Sparkles, ShoppingBag, Calculator, DollarSign, Target } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { motion, AnimatePresence } from "motion/react";

/**
 * Global Layout: The foundation of the Premium Aesthetic Management system.
 * Standardizes navigation, branding, and ambient effects.
 */
export default function Layout() {
  const location = useLocation();
  const supabase = createClient();

  const [counters, setCounters] = useState({
    conversations: 0,
    followUps: 0
  });

  const [goalStats, setGoalStats] = useState({
    target: 600,
    current: 0,
    percent: 0
  });

  useEffect(() => {
    async function fetchCounters() {
      // Main fetching logic (Preserved from original)
      let { count: convCount, error: convErr } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      const now = new Date();
      const fortyEightHoursAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000));
      
      let { count: followUpCount, error: fuErr } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .neq('conversation_status', 'encerrado')
        .lt('last_interaction_at', fortyEightHoursAgo.toISOString());

      if (convErr || fuErr) {
        const legacyConv = await supabase.from('Usuarios').select('*', { count: 'exact', head: true });
        const legacyFu = await supabase.from('Usuarios').select('*', { count: 'exact', head: true }).lt('created_at', fortyEightHoursAgo.toISOString());
        convCount = legacyConv.count;
        followUpCount = legacyFu.count;
      }

      setCounters({
        conversations: convCount || 0,
        followUps: followUpCount || 0
      });

      try {
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

        const { count: apptCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .gte('appointment_date', firstDayOfMonth)
          .lte('appointment_date', lastDayOfMonth);

        const { data: goalData } = await supabase
          .from('crm_goals')
          .select('*')
          .eq('goal_type', 'appointments')
          .eq('month', now.getMonth() + 1)
          .eq('year', now.getFullYear())
          .maybeSingle();

        const target = goalData?.target_value ? Number(goalData.target_value) : 600;
        const current = apptCount || 0;
        const percent = Math.min(Math.round((current / target) * 100), 100);

        setGoalStats({ target, current, percent });
      } catch (err) {
        console.error('Error fetching monthly goals:', err);
      }
    }

    fetchCounters();
    const interval = setInterval(fetchCounters, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const navLinkClass = (path: string) =>
    `flex items-center justify-between rounded-xl px-3 py-2.5 text-[14px] uppercase tracking-[0.2em] font-bold transition-all duration-500 relative group ${
      location.pathname === path
        ? "text-gold"
        : "text-white/30 hover:text-white/80"
    }`;

  const navIconClass = (path: string) => `h-3.5 w-3.5 shrink-0 transition-all duration-500 ${location.pathname === path ? "text-gold scale-110" : "text-white/10 group-hover:text-gold/40"}`;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-black-void text-[#E3D5C1] font-body relative">
      {/* Premium Background Ambient Glows */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full bg-gold/5 blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-gold/3 blur-[140px] pointer-events-none" />

      {/* TOP NAVIGATION BAR (High-Fidelity) */}
      <header className="relative z-20 flex h-14 w-full shrink-0 items-center justify-between border-b border-white/5 bg-black-void/90 backdrop-blur-2xl px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-gradient text-black shadow-gold group cursor-pointer overflow-hidden border border-white/10 hover:scale-105 transition-transform duration-500">
            <img src="/assets/logo.jpg" alt="Logo" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-tighter text-white font-display leading-none">Instituto Rafael Dias</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="h-[1px] w-3 bg-gold/40" />
              <span className="text-[13px] uppercase tracking-[0.3em] text-gold/60 font-black">
                Boutique Aesthetic Hub
              </span>
            </div>
          </div>
        </div>

        {/* Global Search (Editorial Style) */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            const term = (e.currentTarget.elements.namedItem("search") as HTMLInputElement).value;
            if (term) window.location.href = `/leads?search=${encodeURIComponent(term)}`;
          }}
          className="hidden md:flex h-9 w-full max-w-[400px] items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 focus-within:border-gold/30 focus-within:bg-white/[0.04] transition-all duration-500 shadow-inner group"
        >
          <Search className="h-3.5 w-3.5 text-white/10 group-focus-within:text-gold/60 transition-colors" />
          <input
            name="search"
            type="text"
            placeholder="Search patients, protocols or inquiries..."
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-white/10 text-white font-light tracking-wide"
          />
        </form>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 bg-gold/5 border border-gold/10 px-3 py-1.5 rounded-full backdrop-blur-md">
            <motion.div 
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
            />
            <span className="text-[13px] uppercase tracking-[0.2em] font-black text-gold/80">Automation Live</span>
          </div>
          
          <Link 
            to="/config" 
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black-matte text-white/50 hover:text-gold hover:border-gold/40 hover:shadow-gold transition-all duration-500 cursor-pointer"
            title="Configurações da Página"
          >
            <Settings className="h-3.5 w-3.5" />
          </Link>

          <div className="flex items-center gap-3 group cursor-pointer" onClick={handleLogout}>
            <div className="text-right flex flex-col justify-center">
              <p className="text-[13px] font-bold text-white font-display tracking-tight uppercase group-hover:text-gold transition-colors">Dr. Rafael Dias</p>
              <p className="text-[13px] text-white/30 font-black tracking-[0.15em] uppercase">Executive Director</p>
            </div>
            <div className="h-8 w-8 border border-white/10 flex items-center justify-center rounded-lg bg-black-matte text-white shadow-premium group-hover:border-gold/40 group-hover:shadow-gold transition-all duration-500 font-bold text-[13px]">
              RD
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10">
        
        {/* SIDEBAR NAV (Premium Vertical Bar) */}
        <aside className="w-56 border-r border-white/5 bg-black-void/60 backdrop-blur-3xl p-4 flex flex-col shrink-0 gap-4 overflow-y-auto">
          <nav className="space-y-0.5">
            <Link to="/dashboard" className={navLinkClass("/dashboard")}>
              <div className="flex items-center gap-3">
                <LayoutDashboard className={navIconClass("/dashboard")} />
                <span>Overview</span>
              </div>
              {location.pathname === "/dashboard" && (
                <motion.div layoutId="nav-glow" className="absolute left-0 top-2 bottom-2 w-0.5 bg-gold rounded-r-full shadow-gold" />
              )}
            </Link>
            
            <Link to="/leads" className={navLinkClass("/leads")}>
              <div className="flex items-center gap-5">
                <Users className={navIconClass("/leads")} />
                <span>Leads CRM</span>
              </div>
              {location.pathname === "/leads" && (
                <motion.div layoutId="nav-glow" className="absolute left-0 top-3 bottom-3 w-1 bg-gold rounded-r-full shadow-gold" />
              )}
            </Link>

            <Link to="/patients" className={navLinkClass("/patients")}>
              <div className="flex items-center gap-5">
                <UserCheck className={navIconClass("/patients")} />
                <span>Patients</span>
              </div>
              {location.pathname === "/patients" && (
                <motion.div layoutId="nav-glow" className="absolute left-0 top-3 bottom-3 w-1 bg-gold rounded-r-full shadow-gold" />
              )}
            </Link>
            
            <Link to="/conversations" className={navLinkClass("/conversations")}>
              <div className="flex items-center gap-5">
                <MessageSquare className={navIconClass("/conversations")} />
                <span>Conversations</span>
              </div>
              <AnimatePresence>
                {counters.conversations > 0 && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-full bg-gold/10 border border-gold/20 px-2.5 py-0.5 text-[14px] font-black text-gold shadow-gold"
                  >
                    {counters.conversations}
                  </motion.span>
                )}
              </AnimatePresence>
              {location.pathname === "/conversations" && (
                <motion.div layoutId="nav-glow" className="absolute left-0 top-3 bottom-3 w-1 bg-gold rounded-r-full shadow-gold" />
              )}
            </Link>
            
            <Link to="/pipeline" className={navLinkClass("/pipeline")}>
              <div className="flex items-center gap-5">
                <Sparkles className={navIconClass("/pipeline")} />
                <span>Sales Funnel</span>
              </div>
              {location.pathname === "/pipeline" && (
                <motion.div layoutId="nav-glow" className="absolute left-0 top-3 bottom-3 w-1 bg-gold rounded-r-full shadow-gold" />
              )}
            </Link>
            
            <Link to="/calendar" className={navLinkClass("/calendar")}>
              <div className="flex items-center gap-5">
                <CalendarIcon className={navIconClass("/calendar")} />
                <span>Calendar</span>
              </div>
              {location.pathname === "/calendar" && (
                <motion.div layoutId="nav-glow" className="absolute left-0 top-3 bottom-3 w-1 bg-gold rounded-r-full shadow-gold" />
              )}
            </Link>
            
            <Link to="/follow-ups" className={navLinkClass("/follow-ups")}>
              <div className="flex items-center gap-5">
                <AlertCircle className={navIconClass("/follow-ups")} />
                <span>Follow-ups</span>
              </div>
              <AnimatePresence>
                {counters.followUps > 0 && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-[14px] font-black text-red-400"
                  >
                    {counters.followUps}
                  </motion.span>
                )}
              </AnimatePresence>
              {location.pathname === "/follow-ups" && (
                <motion.div layoutId="nav-glow" className="absolute left-0 top-3 bottom-3 w-1 bg-gold rounded-r-full shadow-gold" />
              )}
            </Link>
            
            <Link to="/reports" className={navLinkClass("/reports")}>
              <div className="flex items-center gap-5">
                <BarChart3 className={navIconClass("/reports")} />
                <span>Intelligence</span>
              </div>
              {location.pathname === "/reports" && (
                <motion.div layoutId="nav-glow" className="absolute left-0 top-3 bottom-3 w-1 bg-gold rounded-r-full shadow-gold" />
              )}
            </Link>

            <Link to="/marketing" className={navLinkClass("/marketing")}>
              <div className="flex items-center gap-5">
                <Target className={navIconClass("/marketing")} />
                <span>Marketing & Ads</span>
              </div>
              {location.pathname === "/marketing" && (
                <motion.div layoutId="nav-glow" className="absolute left-0 top-3 bottom-3 w-1 bg-gold rounded-r-full shadow-gold" />
              )}
            </Link>

            <Link to="/pos" className={navLinkClass("/pos")}>
              <div className="flex items-center gap-5">
                <ShoppingBag className={navIconClass("/pos")} />
                <span>PDV (Vendas)</span>
              </div>
              {location.pathname === "/pos" && (
                <motion.div layoutId="nav-glow" className="absolute left-0 top-3 bottom-3 w-1 bg-gold rounded-r-full shadow-gold" />
              )}
            </Link>

            <Link to="/cashier" className={navLinkClass("/cashier")}>
              <div className="flex items-center gap-5">
                <Calculator className={navIconClass("/cashier")} />
                <span>Caixa & Turnos</span>
              </div>
              {location.pathname === "/cashier" && (
                <motion.div layoutId="nav-glow" className="absolute left-0 top-3 bottom-3 w-1 bg-gold rounded-r-full shadow-gold" />
              )}
            </Link>

            <Link to="/financial-reports" className={navLinkClass("/financial-reports")}>
              <div className="flex items-center gap-5">
                <DollarSign className={navIconClass("/financial-reports")} />
                <span>Financeiro</span>
              </div>
              {location.pathname === "/financial-reports" && (
                <motion.div layoutId="nav-glow" className="absolute left-0 top-3 bottom-3 w-1 bg-gold rounded-r-full shadow-gold" />
              )}
            </Link>

            <Link to="/config" className={navLinkClass("/config")}>
              <div className="flex items-center gap-5">
                <Settings className={navIconClass("/config")} />
                <span>Configurações da Página</span>
              </div>
              {location.pathname === "/config" && (
                <motion.div layoutId="nav-glow" className="absolute left-0 top-3 bottom-3 w-1 bg-gold rounded-r-full shadow-gold" />
              )}
            </Link>
          </nav>

          {/* Institutional Performance (Grindstone Style) */}
          <div className="mt-auto space-y-4">
            <div className="relative rounded-xl border border-white/5 bg-white/[0.01] p-4 space-y-3 overflow-hidden group hover:border-gold/20 transition-colors duration-700">
              <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                <Sparkles className="h-10 w-10 text-gold" />
              </div>
              <div className="flex justify-between items-end">
                <div className="space-y-0.5">
                  <h4 className="text-[13px] font-black text-white/20 uppercase tracking-[0.2em]">Monthly Goal</h4>
                  <p className="text-base font-display text-white tracking-tighter italic">{goalStats.percent}% <span className="text-[14px] text-gold/40 non-italic ml-1">Achieved</span></p>
                </div>
              </div>
              <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${goalStats.percent}%` }}
                  transition={{ duration: 2, ease: "circOut" }}
                  className="h-full rounded-full gold-gradient shadow-gold"
                />
              </div>
              <p className="text-[13px] text-white/20 font-bold uppercase tracking-[0.3em] text-center">
                {goalStats.current} / {goalStats.target} Bookings
              </p>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-black uppercase tracking-[0.3em] text-white/20 bg-white/[0.02] hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all hover:text-red-400 duration-500"
            >
              <LogOut className="h-3 w-3 opacity-40" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA (The Stage) */}
        <main className="flex-1 flex flex-col overflow-hidden bg-transparent relative">
          {/* Top Stage Spotlight */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-radial-gradient(circle at top center, rgba(212, 175, 55, 0.08) 0%, transparent 70%) pointer-events-none z-0" />
          <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
            <Outlet />
          </div>
        </main>
      </div>

      {/* FOOTER STATUS BAR (The Foundation) */}
      <footer className="relative z-30 flex h-10 shrink-0 w-full items-center justify-between border-t border-white/5 bg-black-void px-6 text-[13px] font-bold text-white/10 uppercase tracking-[0.3em]">
        <div className="flex gap-8 items-center">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/40" />
            <span>Database Online</span>
          </div>
          <span className="text-gold/20 font-black">v1.2.0 • Premium Edition</span>
        </div>
        <div className="flex items-center gap-10">
          <span className="text-white/5 font-mono tracking-normal lowercase opacity-60">managed by n8n.io</span>
          <div className="flex gap-6">
            <Link to="/privacy-policy" className="hover:text-gold/60 transition-colors">Privacy</Link>
            <Link to="/terms-of-service" className="hover:text-gold/60 transition-colors">Terms</Link>
          </div>
          <span className="font-black text-white/5 italic">© 2026 Instituto Rafael Dias</span>
        </div>
      </footer>
    </div>
  );
}
