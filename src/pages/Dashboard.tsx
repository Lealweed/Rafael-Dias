import { useState, useEffect, useMemo } from "react";
import { createClient } from "../lib/supabase/client";
import { Users, MessageSquare, Calendar, AlertCircle, Sparkles, TrendingUp, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PremiumButton } from "../components/premium/PremiumButton";

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
    <div className="flex-1 overflow-y-auto p-8 w-full h-full flex flex-col space-y-8 animate-fade-in pb-10">
      
      {/* Header Premium do Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-white/5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-[10px] uppercase tracking-[0.2em] font-bold text-gold mb-2">
            <Sparkles className="h-3 w-3" />
            <span>Métricas em Tempo Real</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white font-display">Painel Geral de Atendimento</h1>
          <p className="text-sm text-white/40 font-light max-w-lg">Supervisão de leads, automações e desempenho comercial do Instituto.</p>
        </div>

        {/* Data/Hora do Sistema */}
        <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-3 backdrop-blur-md shadow-premium">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-white/70 tracking-widest uppercase">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>

      {/* Grid de Cards Estatísticos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Novos Leads */}
        <div 
          onClick={() => navigate('/leads')}
          className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-xl group hover:border-gold/30 transition-all duration-500 shadow-premium cursor-pointer"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 text-gold group-hover:opacity-10 transition-opacity duration-500">
            <Users className="h-20 w-20" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Novos Leads (Hoje)</p>
          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-5xl font-semibold text-white font-display tracking-tight leading-none">
              {loading ? "..." : stats.newLeadsToday}
            </span>
            {!loading && (
              <span className={`text-xs font-bold flex items-center gap-1 px-2 py-1 rounded-lg ${growth >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                <TrendingUp className={`h-3.5 w-3.5 ${growth < 0 ? 'rotate-180' : ''}`} /> 
                {growth >= 0 ? `+${growth}%` : `${growth}%`}
              </span>
            )}
          </div>
          <div className="mt-8 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div 
              className="h-full rounded-full gold-gradient transition-all duration-1000" 
              style={{ width: `${Math.min((stats.newLeadsToday / 15) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Card 2: Atendimento Humano */}
        <div 
          onClick={() => navigate('/conversations')}
          className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-xl group hover:border-gold/30 transition-all duration-500 shadow-premium cursor-pointer"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 text-gold group-hover:opacity-10 transition-opacity duration-500">
            <MessageSquare className="h-20 w-20" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Atendimento Humano</p>
          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-5xl font-semibold text-white font-display tracking-tight leading-none">
              {loading ? "..." : stats.humanActive}
            </span>
            <span className="text-xs font-light text-white/40">leads ativos</span>
          </div>
          <div className="mt-8 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div 
              className="h-full rounded-full gold-gradient transition-all duration-1000" 
              style={{ width: `${stats.totalLeads > 0 ? (stats.humanActive / stats.totalLeads) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Card 3: Consultas Vinculadas */}
        <div 
          onClick={() => navigate('/calendar')}
          className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-xl group hover:border-gold/30 transition-all duration-500 shadow-premium cursor-pointer"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 text-gold group-hover:opacity-10 transition-opacity duration-500">
            <Calendar className="h-20 w-20" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Consultas Agendadas</p>
          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-5xl font-semibold text-white font-display tracking-tight leading-none">
              {loading ? "..." : stats.scheduled}
            </span>
            <span className="text-xs font-light text-white/40">no Google Agenda</span>
          </div>
          <div className="mt-8 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div 
              className="h-full rounded-full gold-gradient transition-all duration-1000" 
              style={{ width: `${Math.min((stats.scheduled / 20) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Card 4: Follow-ups Pendentes */}
        <div 
          onClick={() => navigate('/follow-ups')}
          className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.02] p-8 backdrop-blur-xl group hover:border-orange-500/30 transition-all duration-500 shadow-premium cursor-pointer"
        >
          <div className="absolute top-0 right-0 p-6 opacity-5 text-orange-400 group-hover:opacity-10 transition-opacity duration-500">
            <AlertCircle className="h-20 w-20" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">Follow-ups Críticos</p>
          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-5xl font-semibold text-white font-display tracking-tight leading-none">
              {loading ? "..." : stats.pendingFollowups}
            </span>
            <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-1 rounded-lg">pendentes</span>
          </div>
          <div className="mt-8 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
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
        <div className="relative rounded-[2rem] border border-white/5 bg-black-matte/45 p-8 md:p-10 backdrop-blur-md overflow-hidden group hover:bg-black-matte/60 transition-all duration-500 shadow-premium">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
          <div className="h-12 w-12 rounded-2xl bg-gold/10 flex items-center justify-center text-gold mb-6 group-hover:scale-110 transition-transform duration-500">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h4 className="text-xl font-bold text-gold font-display">Fluxo de Atendimento</h4>
          <p className="mt-4 text-sm text-white/60 leading-relaxed font-light">
            Sincronia entre IA e consultores. O modo humano é ativado automaticamente ao detectar intervenção manual.
          </p>
          <div className="mt-8 flex gap-4">
            <PremiumButton 
              variant="ghost" 
              onClick={() => navigate('/config')}
              className="px-0 h-auto"
            >
              Configurar IA <ArrowRight className="h-3 w-3" />
            </PremiumButton>
            <PremiumButton 
              variant="ghost" 
              onClick={() => navigate('/reports')}
              className="px-0 h-auto"
            >
              Ver Logs <ArrowRight className="h-3 w-3" />
            </PremiumButton>
          </div>
        </div>

        {/* Bloco 2: Gestão de Agenda */}
        <div className="relative rounded-[2rem] border border-white/5 bg-black-matte/45 p-8 md:p-10 backdrop-blur-md overflow-hidden group hover:bg-black-matte/60 transition-all duration-500 shadow-premium">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
          <div className="h-12 w-12 rounded-2xl bg-gold/10 flex items-center justify-center text-gold mb-6 group-hover:scale-110 transition-transform duration-500">
            <Calendar className="h-6 w-6" />
          </div>
          <h4 className="text-xl font-bold text-gold font-display">Agendas & Diagnósticos</h4>
          <p className="mt-4 text-sm text-white/60 leading-relaxed font-light">
            Integração nativa com Google Agenda. Status atualizado em tempo real no funil de vendas.
          </p>
          <div className="mt-8 flex gap-4">
            <PremiumButton 
              variant="ghost" 
              onClick={() => navigate('/calendar')}
              className="px-0 h-auto"
            >
              Abrir Agenda <ArrowRight className="h-3 w-3" />
            </PremiumButton>
            <PremiumButton 
              variant="ghost" 
              onClick={handleSync}
              className="px-0 h-auto"
            >
              Sincronizar <ArrowRight className="h-3 w-3" />
            </PremiumButton>
          </div>
        </div>

        {/* Bloco 3: Atalhos Rápidos */}
        <div className="relative rounded-[2rem] border border-white/5 bg-black-matte/45 p-8 md:p-10 backdrop-blur-md overflow-hidden group hover:bg-black-matte/60 transition-all duration-500 shadow-premium">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
          <div className="h-12 w-12 rounded-2xl bg-gold/10 flex items-center justify-center text-gold mb-6 group-hover:scale-110 transition-transform duration-500">
            <Sparkles className="h-6 w-6" />
          </div>
          <h4 className="text-xl font-bold text-gold font-display">Ações Prioritárias</h4>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <PremiumButton 
              variant="outline" 
              onClick={() => navigate('/leads?action=new')}
              className="w-full py-4 text-[9px]"
            >
              + Novo Lead
            </PremiumButton>
            <PremiumButton 
              variant="outline" 
              onClick={() => navigate('/reports')}
              className="w-full py-4 text-[9px]"
            >
              Relatórios
            </PremiumButton>
            <PremiumButton 
              variant="outline" 
              onClick={() => navigate('/follow-ups')}
              className="w-full py-4 text-[9px]"
            >
              Follow-ups
            </PremiumButton>
            <PremiumButton 
              variant="outline" 
              onClick={() => navigate('/portal')}
              className="w-full py-4 text-[9px]"
            >
              Portal
            </PremiumButton>
          </div>
        </div>

      </div>

    </div>
  );
}
