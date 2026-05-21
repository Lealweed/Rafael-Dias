import { useEffect, useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, MessageSquare, Settings, LogOut, CheckSquare, AlertCircle, BarChart3, Search, Calendar as CalendarIcon } from "lucide-react";
import { createClient } from "../lib/supabase/client";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const supabase = createClient();

  const [counters, setCounters] = useState({
    conversations: 0,
    followUps: 0
  });

  useEffect(() => {
    async function fetchCounters() {
      // Get conversations count
      const { count: convCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true });

      // Get follow-ups count (leads without interaction in the last 48 hours)
      const now = new Date();
      const fortyEightHoursAgo = new Date(now.getTime() - (48 * 60 * 60 * 1000));
      
      const { count: followUpCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .lt('last_interaction_at', fortyEightHoursAgo.toISOString());

      setCounters({
        conversations: convCount || 0,
        followUps: followUpCount || 0
      });
    }

    fetchCounters();
    
    // Optional: set interval or subscribe to realtime events in the future
    const interval = setInterval(fetchCounters, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    localStorage.removeItem("mock_session");
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const navLinkClass = (path: string) =>
    `flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium ${
      location.pathname === path
        ? "bg-gray-100 font-bold text-[#2563EB]"
        : "text-gray-600 hover:bg-gray-50"
    }`;

  const navIconClass = (path: string) => `h-5 w-5 ${location.pathname === path ? "text-[#2563EB]" : "text-gray-400"}`;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#F9FAFB] text-[#111827] font-sans">
      {/* TOP NAVIGATION BAR */}
      <header className="flex h-16 w-full shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB] text-white font-bold italic shadow-sm">
            RD
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight text-[#111827]">Instituto Rafael Dias</h1>
            <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
              Sistema Comercial Integrado
            </span>
          </div>
        </div>
        <div className="flex h-10 w-full max-w-[400px] items-center gap-3 rounded-full border border-gray-200 bg-gray-50 px-4">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Busca global por nome, telefone, tag ou status..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs font-medium text-gray-500">n8n: Conectado</span>
          </div>
          <div className="h-8 w-px bg-gray-200"></div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-gray-900 uppercase">Rafael Dias</p>
              <p className="text-[10px] text-gray-400">Administrador</p>
            </div>
            <div 
              className="h-9 w-9 border-2 border-white flex items-center justify-center rounded-full bg-gray-200 font-bold text-gray-500 shadow-sm cursor-pointer hover:bg-gray-300" 
              onClick={handleLogout} 
              title="Sair"
            >
              RD
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR NAV */}
        <aside className="w-64 border-r border-gray-200 bg-white p-4 flex flex-col shrink-0">
          <nav className="space-y-1">
            <Link to="/" className={navLinkClass("/")}>
              <div className="flex items-center gap-3">
                <LayoutDashboard className={navIconClass("/")} />
                Dashboard
              </div>
            </Link>
            <Link to="/leads" className={navLinkClass("/leads")}>
              <div className="flex items-center gap-3">
                <Users className={navIconClass("/leads")} />
                Leads CRM
              </div>
            </Link>
            <Link to="/conversations" className={navLinkClass("/conversations")}>
              <div className="flex items-center gap-3">
                <MessageSquare className={navIconClass("/conversations")} />
                Conversas
              </div>
              {counters.conversations > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">{counters.conversations}</span>
              )}
            </Link>
            <Link to="/pipeline" className={navLinkClass("/pipeline")}>
              <div className="flex items-center gap-3">
                <LayoutDashboard className={navIconClass("/pipeline")} />
                Pipeline
              </div>
            </Link>
            <Link to="/calendar" className={navLinkClass("/calendar")}>
              <div className="flex items-center gap-3">
                <CalendarIcon className={navIconClass("/calendar")} />
                Agenda
              </div>
            </Link>
            <Link to="/follow-ups" className={navLinkClass("/follow-ups")}>
               <div className="flex items-center gap-3">
                 <AlertCircle className={navIconClass("/follow-ups")} />
                 Follow-ups
               </div>
               {counters.followUps > 0 && (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600 font-mono">Critical ({counters.followUps})</span>
               )}
            </Link>
            <Link to="/reports" className={navLinkClass("/reports")}>
              <div className="flex items-center gap-3">
                <BarChart3 className={navIconClass("/reports")} />
                Relatórios
              </div>
            </Link>
            <Link to="/config" className={navLinkClass("/config")}>
              <div className="flex items-center gap-3">
                <Settings className={navIconClass("/config")} />
                Configurações
              </div>
            </Link>
          </nav>

          <div className="mt-auto">
            <div className="rounded-xl bg-blue-50 p-4">
              <h4 className="text-xs font-bold text-blue-800 uppercase tracking-tighter">Meta Mensal</h4>
              <div className="mt-2 h-2 w-full rounded-full bg-blue-100">
                <div className="h-full w-3/4 rounded-full bg-blue-600"></div>
              </div>
              <p className="mt-2 text-xs text-blue-700">75% - 450/600 Agendados</p>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      {/* FOOTER STATUS BAR */}
      <footer className="flex h-8 shrink-0 w-full items-center justify-between border-t border-gray-200 bg-white px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
        <div className="flex gap-4">
          <span>DB: Supabase (Production)</span>
          <span>v1.0.4-beta</span>
        </div>
        <div className="flex gap-4">
          <span className="text-blue-500">https://n8n.rd.com/webhook/incoming/7281...</span>
          <span>© 2024 Instituto Rafael Dias</span>
        </div>
      </footer>
    </div>
  );
}
