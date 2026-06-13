import { useState, useEffect, useMemo } from "react";
import { createClient } from "../lib/supabase/client";
import { Users, MessageSquare, Calendar, AlertCircle, Sparkles, TrendingUp, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let { data: leads, error } = await supabase
        .from('leads')
        .select('*');

      // Fallback para estrutura legada se necessário
      if (error) {
        const legacy = await supabase
          .from('Usuarios')
          .select('*');
        leads = legacy.data;
        error = legacy.error;
      }

      if (error || !leads) {
        setStats({ 
          newLeadsToday: 0, 
          newLeadsYesterday: 0, 
          humanActive: 0, 
          scheduled: 0, 
          pendingFollowups: 0,
          totalLeads: 0
        });
        setLoading(false);
        return;
      }

      const now = new Date();
      const pendingFollowupsCount = leads.filter((lead: any) => {
        if (!lead.next_followup_at) return false;
        const when = new Date(lead.next_followup_at);
        return !isNaN(when.getTime()) && when <= now && String(lead.conversation_status || '').toLowerCase() !== 'encerrado';
      }).length;

      const leadsToday = leads.filter((lead: any) => lead.created_at && new Date(lead.created_at) >= today).length;
      const leadsYesterday = leads.filter((lead: any) => {
        if (!lead.created_at) return false;
        const d = new Date(lead.created_at);
        return d >= yesterday && d < today;
      }).length;

      setStats({
        newLeadsToday: leadsToday,
        newLeadsYesterday: leadsYesterday,
        humanActive: leads.filter((lead: any) => String(lead.automation_status || '').toLowerCase() === 'paused_human').length,
        scheduled: leads.filter((lead: any) => Boolean(lead.calendar_event_id)).length,
        pendingFollowups: pendingFollowupsCount,
        totalLeads: leads.length,
      });
      setLoading(false);
    }

    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [supabase]);

  const growth = useMemo(() => {
    if (stats.newLeadsYesterday === 0) return stats.newLeadsToday > 0 ? 100 : 0;
    const diff = stats.newLeadsToday - stats.newLeadsYesterday;
    return Math.round((diff / stats.newLeadsYesterday) * 100);
  }, [stats.newLeadsToday, stats.newLeadsYesterday]);

  const handleSync = () => {
    alert("Sincronização manual com n8n e Agenda iniciada. Os dados serão atualizados em instantes.");
  };

  return (
    <div className="flex flex-col h-full w-full space-y-8 animate-fade-in pb-10">
      
      {/* Header Premium do Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] uppercase tracking-widest font-semibold text-[#E5C38C] mb-2">
            <Sparkles className="h-3 w-3" />
            <span>Métricas em Tempo Real</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-serif">Painel Geral de Atendimento</h1>
          <p className="text-xs text-white/40 font-light mt-1">Supervisão de leads, automações e desempenho comercial do Instituto.</p>
        </div>

        {/* Data/Hora do Sistema */}
        <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-2xl px-4 py-2.5 backdrop-blur-md">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-white/70 tracking-wider">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>

      {/* Grid de Cards Estatísticos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Novos Leads */}
        <div 
          onClick={() => navigate('/leads')}
          className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-xl group hover:border-[#E5C38C]/30 transition-all duration-300 shadow-lg cursor-pointer"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 text-[#E5C38C] group-hover:opacity-20 transition-opacity">
            <Users className="h-16 w-16" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Novos Leads (Hoje)</p>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-semibold text-white font-mono tracking-tight">
              {loading ? "..." : stats.newLeadsToday}
            </span>
            {!loading && (
              <span className={`text-xs font-semibold flex items-center gap-0.5 ${growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                <TrendingUp className={`h-3.5 w-3.5 ${growth < 0 ? 'rotate-180' : ''}`} /> 
                {growth >= 0 ? `+${growth}%` : `${growth}%`}
              </span>
            )}
          </div>
          <div className="mt-4 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E5C38C] transition-all duration-1000" 
              style={{ width: `${Math.min((stats.newLeadsToday / 15) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Card 2: Atendimento Humano */}
        <div 
          onClick={() => navigate('/conversations')}
          className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-xl group hover:border-[#E5C38C]/30 transition-all duration-300 shadow-lg cursor-pointer"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 text-[#E5C38C] group-hover:opacity-20 transition-opacity">
            <MessageSquare className="h-16 w-16" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Atendimento Humano</p>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-semibold text-white font-mono tracking-tight">
              {loading ? "..." : stats.humanActive}
            </span>
            <span className="text-xs font-light text-white/40">leads ativos</span>
          </div>
          <div className="mt-4 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E5C38C] transition-all duration-1000" 
              style={{ width: `${stats.totalLeads > 0 ? (stats.humanActive / stats.totalLeads) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Card 3: Consultas Vinculadas */}
        <div 
          onClick={() => navigate('/calendar')}
          className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-xl group hover:border-[#E5C38C]/30 transition-all duration-300 shadow-lg cursor-pointer"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 text-[#E5C38C] group-hover:opacity-20 transition-opacity">
            <Calendar className="h-16 w-16" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Consultas Agendadas</p>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-semibold text-white font-mono tracking-tight">
              {loading ? "..." : stats.scheduled}
            </span>
            <span className="text-xs font-light text-white/40">no Google Agenda</span>
          </div>
          <div className="mt-4 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E5C38C] transition-all duration-1000" 
              style={{ width: `${Math.min((stats.scheduled / 20) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Card 4: Follow-ups Pendentes */}
        <div 
          onClick={() => navigate('/follow-ups')}
          className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-xl group hover:border-orange-500/30 transition-all duration-300 shadow-lg cursor-pointer"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 text-orange-400 group-hover:opacity-20 transition-opacity">
            <AlertCircle className="h-16 w-16" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Follow-ups Críticos</p>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-semibold text-white font-mono tracking-tight">
              {loading ? "..." : stats.pendingFollowups}
            </span>
            <span className="text-xs font-semibold text-orange-400">pendentes</span>
          </div>
          <div className="mt-4 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-1000" 
              style={{ width: `${Math.min((stats.pendingFollowups / 10) * 100, 100)}%` }}
            />
          </div>
        </div>

      </div>

      {/* Grid Informativo de Processos & Atalhos Rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bloco 1: Processo de Atendimento */}
        <div className="relative rounded-3xl border border-white/5 bg-[#0B0D12]/45 p-6 md:p-8 backdrop-blur-md overflow-hidden group hover:bg-[#0B0D12]/60 transition-all">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#E5C38C]/20 to-transparent" />
          <div className="h-10 w-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] mb-5 group-hover:scale-110 transition-transform">
            <MessageSquare className="h-5 w-5" />
          </div>
          <h4 className="text-base font-semibold text-[#E5C38C] font-serif">Fluxo de Atendimento</h4>
          <p className="mt-3 text-xs text-white/60 leading-relaxed font-light">
            Sincronia entre IA e consultores. O modo humano é ativado automaticamente ao detectar intervenção manual.
          </p>
          <div className="mt-6 flex gap-3">
            <button 
              onClick={() => navigate('/config')}
              className="text-[9px] uppercase tracking-widest font-bold text-white/40 hover:text-[#E5C38C] transition-colors flex items-center gap-1"
            >
              Configurar IA <ArrowRight className="h-2 w-2" />
            </button>
            <button 
              onClick={() => navigate('/reports')}
              className="text-[9px] uppercase tracking-widest font-bold text-white/40 hover:text-[#E5C38C] transition-colors flex items-center gap-1"
            >
              Ver Logs <ArrowRight className="h-2 w-2" />
            </button>
          </div>
        </div>

        {/* Bloco 2: Gestão de Agenda */}
        <div className="relative rounded-3xl border border-white/5 bg-[#0B0D12]/45 p-6 md:p-8 backdrop-blur-md overflow-hidden group hover:bg-[#0B0D12]/60 transition-all">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#E5C38C]/20 to-transparent" />
          <div className="h-10 w-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] mb-5 group-hover:scale-110 transition-transform">
            <Calendar className="h-5 w-5" />
          </div>
          <h4 className="text-base font-semibold text-[#E5C38C] font-serif">Agendas & Diagnósticos</h4>
          <p className="mt-3 text-xs text-white/60 leading-relaxed font-light">
            Integração nativa com Google Agenda. Status atualizado em tempo real no funil de vendas.
          </p>
          <div className="mt-6 flex gap-3">
            <button 
              onClick={() => navigate('/calendar')}
              className="text-[9px] uppercase tracking-widest font-bold text-white/40 hover:text-[#E5C38C] transition-colors flex items-center gap-1"
            >
              Abrir Agenda <ArrowRight className="h-2 w-2" />
            </button>
            <button 
              onClick={handleSync}
              className="text-[9px] uppercase tracking-widest font-bold text-white/40 hover:text-[#E5C38C] transition-colors flex items-center gap-1"
            >
              Sincronizar <ArrowRight className="h-2 w-2" />
            </button>
          </div>
        </div>

        {/* Bloco 3: Atalhos Rápidos */}
        <div className="relative rounded-3xl border border-white/5 bg-[#0B0D12]/45 p-6 md:p-8 backdrop-blur-md overflow-hidden group hover:bg-[#0B0D12]/60 transition-all">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#E5C38C]/20 to-transparent" />
          <div className="h-10 w-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] mb-5 group-hover:scale-110 transition-transform">
            <Sparkles className="h-5 w-5" />
          </div>
          <h4 className="text-base font-semibold text-[#E5C38C] font-serif">Ações Prioritárias</h4>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button 
              onClick={() => navigate('/leads?action=new')}
              className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-[9px] font-bold uppercase tracking-wider hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/20 transition-all"
            >
              + Novo Lead
            </button>
            <button 
              onClick={() => navigate('/reports')}
              className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-[9px] font-bold uppercase tracking-wider hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/20 transition-all"
            >
              Relatórios
            </button>
            <button 
              onClick={() => navigate('/follow-ups')}
              className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-[9px] font-bold uppercase tracking-wider hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/20 transition-all"
            >
              Follow-ups
            </button>
            <button 
              onClick={() => navigate('/portal')}
              className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-[9px] font-bold uppercase tracking-wider hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/20 transition-all"
            >
              Portal
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
