import { BarChart3, TrendingUp, Users, Clock, MessageSquare, Database } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function Reports() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalConversations: 0,
    totalMessages: 0,
    hotLeads: 0,
    totalEvents: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      const res = await fetch("/api/crm/dashboard");
      const data = await res.json();
      if (!res.ok || !data.ok) return;
      setStats({
        totalLeads: data.totalLeads || 0,
        totalConversations: data.totalConversations || 0,
        totalMessages: data.totalMessages || 0,
        hotLeads: data.hotLeads || 0,
        totalEvents: data.totalEvents || 0,
      });
    }

    fetchStats();
  }, []);

  const conversion = useMemo(() => (
    stats.totalLeads > 0 ? Math.round((stats.hotLeads / stats.totalLeads) * 1000) / 10 : 0
  ), [stats]);

  const cards = [
    { label: "Total leads", value: stats.totalLeads, accent: "text-blue-600", icon: Users },
    { label: "Conversão", value: `${conversion}%`, accent: "text-emerald-600", icon: TrendingUp },
    { label: "Mensagens", value: stats.totalMessages, accent: "text-orange-600", icon: MessageSquare },
    { label: "Eventos n8n", value: stats.totalEvents, accent: "text-violet-600", icon: Database },
  ];

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Relatórios</h1>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Métricas operacionais e cobertura de dados no mesmo padrão visual do painel
          </p>
        </div>
        <select className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-[#2563EB]">
          <option>Últimos 30 dias</option>
          <option>Este mês</option>
          <option>Últimos 7 dias</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 text-gray-500">
                <Icon className={`h-5 w-5 ${card.accent}`} />
                <p className="text-[10px] font-bold uppercase tracking-wider">{card.label}</p>
              </div>
              <p className={`mt-3 text-3xl font-bold ${card.accent}`}>{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900">Taxa de conversão por etapa</h3>
          <p className="mt-1 text-xs text-gray-500">Leitura rápida do funil real alimentado pelos dados operacionais.</p>
          <div className="mt-6 space-y-5">
            <div>
              <div className="mb-1 flex justify-between text-xs font-bold text-gray-600"><span>Novo lead ({stats.totalLeads})</span><span>100%</span></div>
              <div className="h-3 w-full rounded-full bg-gray-100"><div className="h-3 w-full rounded-full bg-blue-500"></div></div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs font-bold text-gray-600"><span>Qualificado ({stats.hotLeads})</span><span>{conversion}%</span></div>
              <div className="h-3 w-full rounded-full bg-gray-100"><div className="h-3 rounded-full bg-orange-500" style={{ width: `${conversion}%` }}></div></div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs font-bold text-gray-600"><span>Conversas ({stats.totalConversations})</span><span>real</span></div>
              <div className="h-3 w-full rounded-full bg-gray-100"><div className="h-3 w-full rounded-full bg-violet-500"></div></div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs font-bold text-emerald-600"><span>Mensagens ({stats.totalMessages})</span><span>atividade</span></div>
              <div className="h-3 w-full rounded-full bg-gray-100"><div className="h-3 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(8, stats.totalMessages / 8))}%` }}></div></div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900">Cobertura dos dados</h3>
          <p className="mt-1 text-xs text-gray-500">Quais bases já estão refletidas com consistência no CRM.</p>
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Contatos</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalLeads}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Conversas</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalConversations}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Mensagens</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalMessages}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Eventos n8n</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            Origem, interesse, responsável e temperatura dependem dos campos estruturados enviados pelo fluxo. Hoje a base real já sustenta leitura operacional, mas ainda há espaço para enriquecer relatórios com agenda e follow-up estruturado.
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
          <Clock className="h-4 w-4" /> Leitura executiva
        </div>
        <p className="mt-3 text-sm text-gray-600">O módulo foi alinhado visualmente ao restante do painel operacional para leitura rápida, sem quebrar a fonte de dados atual.</p>
      </section>
    </div>
  );
}
