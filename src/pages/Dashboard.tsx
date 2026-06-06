import { useState, useEffect, useMemo } from "react";
import { createClient } from "../lib/supabase/client";

export default function Dashboard() {
  const supabase = useMemo(() => createClient(), []);
  const [stats, setStats] = useState({
    newLeadsToday: 0,
    humanActive: 0,
    scheduled: 0,
    pendingFollowups: 0,
  });

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
        return;
      }

      const now = new Date();
      const pendingFollowups = leads.filter((lead: any) => {
        if (!lead.next_followup_at) return false;
        const when = new Date(lead.next_followup_at);
        return !Number.isNaN(when.getTime()) && when <= now && String(lead.conversation_status || '').toLowerCase() !== 'encerrado';
      }).length;

      setStats({
        newLeadsToday: leads.filter((lead: any) => lead.created_at && new Date(lead.created_at) >= today).length,
        humanActive: leads.filter((lead: any) => String(lead.automation_status || '').toLowerCase() === 'paused_human').length,
        scheduled: leads.filter((lead: any) => Boolean(lead.calendar_event_id)).length,
        pendingFollowups,
      });
    }

    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, [supabase]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Dashboard Executivo</h1>
        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mt-1">Visão operacional do atendimento, agenda e follow-ups</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">Novos Leads (Hoje)</p>
          <h3 className="mt-1 text-3xl font-bold text-[#111827]">{stats.newLeadsToday}</h3>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">Atendimento Humano</p>
          <h3 className="mt-1 text-3xl font-bold text-[#111827]">{stats.humanActive}</h3>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">Consultas Vinculadas</p>
          <h3 className="mt-1 text-3xl font-bold text-[#111827]">{stats.scheduled}</h3>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">Follow-ups Pendentes</p>
          <h3 className="mt-1 text-3xl font-bold text-[#111827]">{stats.pendingFollowups}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Atendimento</p>
          <p className="mt-3 text-sm text-blue-900">
            O agente e o humano agora compartilham o mesmo estado da conversa, com pausa real da automação e responsável visível no CRM.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Agenda</p>
          <p className="mt-3 text-sm text-emerald-900">
            Agendamentos passam a impedir conflito de horário e podem ser vinculados ao lead para dar continuidade comercial sem perder contexto.
          </p>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50 p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Gestão</p>
          <p className="mt-3 text-sm text-amber-900">
            Próximo retorno, etapa da conversa e dono do atendimento ficam centralizados, o que ajuda a clínica a responder com mais consistência.
          </p>
        </div>
      </div>
    </div>
  );
}
