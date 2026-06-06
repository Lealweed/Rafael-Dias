import { useEffect, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, MessageSquare, Settings, AlertCircle, BarChart3, Search, Calendar as CalendarIcon, LogOut } from "lucide-react";
import { createClient } from "../lib/supabase/client";

export default function Layout() {
  const location = useLocation();
  const supabase = createClient();

  const [counters, setCounters] = useState({
    conversations: 0,
    followUps: 0
  });

  useEffect(() => {
    async function fetchCounters() {
      // Fonte principal no schema atual
      let { count: convCount, error: convErr } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      // Get follow-ups count (leads without interaction in the last 48 hours)
      const now = new Date();
      const fortyEightHoursAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000));
      
      let { count: followUpCount, error: fuErr } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .lt('updated_at', fortyEightHoursAgo.toISOString());

      // Fallback para estrutura legada
      if (convErr || fuErr) {
        const legacyConv = await supabase
          .from('Usuarios')
          .select('*', { count: 'exact', head: true });

        const legacyFu = await supabase
          .from('Usuarios')
          .select('*', { count: 'exact', head: true })
          .lt('updated_at', fortyEightHoursAgo.toISOString());

        convCount = legacyConv.count;
        followUpCount = legacyFu.count;
      }

      setCounters({
        conversations: convCount || 0,
        followUps: followUpCount || 0
      });
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
    `flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-350 ${
      location.pathname === path
        ? "bg-gradient-to-r from-[#D4AF37]/15 to-transparent border-l-2 border-[#D4AF37] text-[#E5C38C] font-semibold"
        : "text-white/60 hover:text-white hover:bg-white/[0.02]"
    }`;

  const navIconClass = (path: string) => `h-4 w-4 shrink-0 transition-colors ${location.pathname === path ? "text-[#E5C38C]" : "text-white/40 group-hover:text-white"}`;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#07090E] text-white font-sans relative">
      {/* Luzes de fundo sutis para quebrar o preto absoluto */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#E5C38C]/2 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] rounded-full bg-[#D4AF37]/2 blur-[100px] pointer-events-none" />

      {/* TOP NAVIGATION BAR */}
      <header className="relative z-10 flex h-20 w-full shrink-0 items-center justify-between border-b border-white/5 bg-[#0B0D12]/75 backdrop-blur-md px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] text-[#0B0D12] font-semibold italic text-lg shadow-[0_4px_15px_rgba(212,175,55,0.35)]">
            RD
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-bold tracking-tight text-white font-serif">Instituto Rafael Dias</h1>
            <span className="text-[9px] uppercase tracking-widest text-[#E5C38C] font-semibold">
              Sistema Comercial Integrado
            </span>
          </div>
        </div>

        {/* Busca Global Customizada */}
        <div className="hidden md:flex h-11 w-full max-w-[450px] items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 focus-within:border-[#D4AF37]/45 transition-colors">
          <Search className="h-4 w-4 text-white/30" />
          <input
            type="text"
            placeholder="Busca global de leads por nome ou telefone..."
            className="w-full bg-transparent text-xs outline-none placeholder:text-white/20 text-white"
          />
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 px-3.5 py-1.5 rounded-full backdrop-blur-md">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] uppercase tracking-widest font-semibold text-white/60">n8n Conectado</span>
          </div>
          
          <div className="h-8 w-px bg-white/5"></div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-white uppercase font-serif tracking-wide">Rafael Dias</p>
              <p className="text-[9px] text-[#E5C38C] font-semibold tracking-widest uppercase">Admin</p>
            </div>
            <div 
              className="h-10 w-10 border border-white/10 flex items-center justify-center rounded-full bg-[#111622] font-semibold text-white shadow-sm cursor-pointer hover:bg-white/5 transition-colors"
              onClick={handleLogout} 
              title="Sair do Sistema"
            >
              RD
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10">
        
        {/* SIDEBAR NAV */}
        <aside className="w-64 border-r border-white/5 bg-[#0B0D12]/60 backdrop-blur-md p-4 flex flex-col shrink-0 justify-between">
          <nav className="space-y-1.5">
            <Link to="/dashboard" className={navLinkClass("/dashboard")}>
              <div className="flex items-center gap-3">
                <LayoutDashboard className={navIconClass("/dashboard")} />
                <span>Dashboard</span>
              </div>
            </Link>
            
            <Link to="/leads" className={navLinkClass("/leads")}>
              <div className="flex items-center gap-3">
                <Users className={navIconClass("/leads")} />
                <span>Leads CRM</span>
              </div>
            </Link>
            
            <Link to="/conversations" className={navLinkClass("/conversations")}>
              <div className="flex items-center gap-3">
                <MessageSquare className={navIconClass("/conversations")} />
                <span>Conversas</span>
              </div>
              {counters.conversations > 0 && (
                <span className="rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/30 px-2 py-0.5 text-[9px] font-mono font-bold text-[#E5C38C]">
                  {counters.conversations}
                </span>
              )}
            </Link>
            
            <Link to="/pipeline" className={navLinkClass("/pipeline")}>
              <div className="flex items-center gap-3">
                <LayoutDashboard className={navIconClass("/pipeline")} />
                <span>Funil</span>
              </div>
            </Link>
            
            <Link to="/calendar" className={navLinkClass("/calendar")}>
              <div className="flex items-center gap-3">
                <CalendarIcon className={navIconClass("/calendar")} />
                <span>Agenda</span>
              </div>
            </Link>
            
            <Link to="/follow-ups" className={navLinkClass("/follow-ups")}>
              <div className="flex items-center gap-3">
                <AlertCircle className={navIconClass("/follow-ups")} />
                <span>Follow-ups</span>
              </div>
              {counters.followUps > 0 && (
                <span className="rounded-full bg-red-500/10 border border-red-500/25 px-2.5 py-0.5 text-[9px] font-mono font-bold text-red-400">
                  {counters.followUps}
                </span>
              )}
            </Link>
            
            <Link to="/reports" className={navLinkClass("/reports")}>
              <div className="flex items-center gap-3">
                <BarChart3 className={navIconClass("/reports")} />
                <span>Relatórios</span>
              </div>
            </Link>
            
            <Link to="/config" className={navLinkClass("/config")}>
              <div className="flex items-center gap-3">
                <Settings className={navIconClass("/config")} />
                <span>Configurações</span>
              </div>
            </Link>
          </nav>

          {/* Barra de Progresso / Metas no Sidebar */}
          <div className="mt-auto">
            <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-4">
              <h4 className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Meta de Agendados</h4>
              <div className="mt-3.5 h-2 w-full rounded-full bg-white/5 overflow-hidden">
                <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E5C38C]"></div>
              </div>
              <p className="mt-2 text-xs font-semibold text-[#E5C38C]">75% <span className="text-white/40 font-light font-mono ml-1">(450 de 600)</span></p>
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 mt-4 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-auto p-8 bg-transparent">
          <Outlet />
        </main>
      </div>

      {/* FOOTER STATUS BAR */}
      <footer className="relative z-10 flex h-10 shrink-0 w-full items-center justify-between border-t border-white/5 bg-[#0B0D12]/85 backdrop-blur-md px-6 text-[9px] font-semibold text-white/30 uppercase tracking-widest">
        <div className="flex gap-4">
          <span>DB: Supabase (Production)</span>
          <span>v1.0.5-beta</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[#D4AF37]/50 font-mono tracking-normal">https://n8n-n8n.oh2qeq.easypanel.host</span>
          <Link to="/privacy-policy" className="hover:underline hover:text-white">Políticas</Link>
          <Link to="/terms-of-service" className="hover:underline hover:text-white">Termos</Link>
          <span>© Instituto Rafael Dias</span>
        </div>
      </footer>
    </div>
  );
}
