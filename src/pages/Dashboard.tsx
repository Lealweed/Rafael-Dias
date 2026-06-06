import { useState, useEffect, useMemo } from "react";
import { createClient } from "../lib/supabase/client";
import { Users, MessageSquare, Calendar, AlertCircle, Sparkles, TrendingUp, ShieldCheck, Heart } from "lucide-react";

export default function Dashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState({
    newLeadsToday: 0,
    humanActive: 0,
    scheduled: 0,
    pendingFollowups: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

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
        setStats({ newLeadsToday: 0, humanActive: 0, scheduled: 0, pendingFollowups: 0 });
        setLoading(false);
        return;
      }

      const now = new Date();
      const pendingFollowups = leads.filter((lead: any) => {
        if (!lead.next_followup_at) return false;
        const when = new Date(lead.next_followup_at);
        return !isNaN(when.getTime()) && when <= now && String(lead.conversation_status || '').toLowerCase() !== 'encerrado';
      }).length;

      setStats({
        newLeadsToday: leads.filter((lead: any) => lead.created_at && new Date(lead.created_at) >= today).length,
        humanActive: leads.filter((lead: any) => String(lead.automation_status || '').toLowerCase() === 'paused_human').length,
        scheduled: leads.filter((lead: any) => Boolean(lead.calendar_event_id)).length,
        pendingFollowups,
      });
      setLoading(false);
    }

    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [supabase]);

  return (
    <div className="flex flex-col h-full w-full space-y-8 animate-fade-in">
      
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
        <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-xl group hover:border-[#E5C38C]/30 transition-all duration-300 shadow-lg">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-[#E5C38C] group-hover:opacity-20 transition-opacity">
            <Users className="h-16 w-16" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">Novos Leads (Hoje)</p>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-semibold text-white font-mono tracking-tight">
              {loading ? "..." : stats.newLeadsToday}
            </span>
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="h-3.5 w-3.5" /> +12%
            </span>
          </div>
          <div className="mt-4 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E5C38C]" />
          </div>
        </div>

        {/* Card 2: Atendimento Humano */}
        <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-xl group hover:border-[#E5C38C]/30 transition-all duration-300 shadow-lg">
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
            <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E5C38C]" />
          </div>
        </div>

        {/* Card 3: Consultas Vinculadas */}
        <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-xl group hover:border-[#E5C38C]/30 transition-all duration-300 shadow-lg">
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
            <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#E5C38C]" />
          </div>
        </div>

        {/* Card 4: Follow-ups Pendentes */}
        <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-xl group hover:border-orange-500/30 transition-all duration-300 shadow-lg">
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
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500" />
          </div>
        </div>

      </div>

      {/* Grid Informativo de Processos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bloco 1: Processo de Atendimento */}
        <div className="relative rounded-3xl border border-white/5 bg-[#0B0D12]/45 p-6 md:p-8 backdrop-blur-md overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#E5C38C]/20 to-transparent" />
          <div className="h-10 w-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] mb-5">
            <MessageSquare className="h-5 w-5" />
          </div>
          <h4 className="text-base font-semibold text-[#E5C38C] font-serif">Fluxo de Atendimento Inteligente</h4>
          <p className="mt-3 text-sm text-white/60 leading-relaxed font-light">
            O robô e o atendente comercial operam em sincronia completa. Qualquer envio manual no WhatsApp desativa instantaneamente as respostas da IA por 6 horas para garantir a continuidade humana sem atrito.
          </p>
        </div>

        {/* Bloco 2: Gestão de Agenda */}
        <div className="relative rounded-3xl border border-white/5 bg-[#0B0D12]/45 p-6 md:p-8 backdrop-blur-md overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#E5C38C]/20 to-transparent" />
          <div className="h-10 w-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] mb-5">
            <Calendar className="h-5 w-5" />
          </div>
          <h4 className="text-base font-semibold text-[#E5C38C] font-serif">Agendas & Diagnósticos</h4>
          <p className="mt-3 text-sm text-white/60 leading-relaxed font-light">
            Agendamentos criados de forma conversacional pela IA alimentam o Google Agenda da clínica e atualizam automaticamente o status do lead no Supabase para <span className="text-[#E5C38C]">scheduled</span>, organizando o fluxo pré-consulta.
          </p>
        </div>

        {/* Bloco 3: Diretrizes da Equipe */}
        <div className="relative rounded-3xl border border-white/5 bg-[#0B0D12]/45 p-6 md:p-8 backdrop-blur-md overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#E5C38C]/20 to-transparent" />
          <div className="h-10 w-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] mb-5">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h4 className="text-base font-semibold text-[#E5C38C] font-serif">Padrões Operacionais</h4>
          <p className="mt-3 text-sm text-white/60 leading-relaxed font-light">
            Acompanhe prazos de follow-ups críticos na barra lateral. Utilize o funil de vendas para arrastar leads entre as etapas comerciais de avaliação até o pós-procedimento com facilidade.
          </p>
        </div>

      </div>

    </div>
  );
}
