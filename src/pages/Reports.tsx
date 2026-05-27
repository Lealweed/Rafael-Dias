import { BarChart3, TrendingUp, Users, Clock } from "lucide-react";
import { useEffect, useState } from "react";

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
      const res = await fetch('/api/crm/dashboard');
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

  const conversion = stats.totalLeads > 0 ? Math.round((stats.hotLeads / stats.totalLeads) * 1000) / 10 : 0;

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Relatórios</h1>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mt-1">Métricas de Vendas e SLA</p>
        </div>
        <select className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-bold text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-[#2563EB]">
          <option>Últimos 30 Dias</option>
          <option>Este Mês</option>
          <option>Últimos 7 Dias</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-gray-500">
            <Users className="w-5 h-5 text-blue-500" />
            <h3 className="text-xs font-bold uppercase">Total Leads</h3>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-gray-900">{stats.totalLeads}</span>
            <span className="text-xs font-bold text-gray-500">real</span>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-gray-500">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h3 className="text-xs font-bold uppercase">Conversão</h3>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-gray-900">{conversion}%</span>
            <span className="text-xs font-bold text-gray-500">quentes</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-gray-500">
            <Clock className="w-5 h-5 text-orange-500" />
            <h3 className="text-xs font-bold uppercase">SLA Resposta (Med)</h3>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-gray-900">{stats.totalMessages}</span>
            <span className="text-xs font-bold text-gray-500">msgs</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-gray-500">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            <h3 className="text-xs font-bold uppercase">Follow-ups Feitos</h3>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-gray-900">{stats.totalEvents}</span>
            <span className="text-xs font-bold text-gray-500">eventos</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 min-h-[300px] flex flex-col">
          <h3 className="font-bold text-gray-900 mb-6">Taxa de Conversão por Etapa (Funil)</h3>
          <div className="flex-1 flex flex-col gap-4">
             <div className="relative">
                <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                  <span>Novo Lead ({stats.totalLeads})</span> <span>100%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full"><div className="h-3 bg-blue-500 rounded-full w-full"></div></div>
             </div>
             <div className="relative">
                <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                  <span>Qualificado ({stats.hotLeads})</span> <span>{conversion}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full"><div className="h-3 bg-blue-500 rounded-full" style={{ width: `${conversion}%` }}></div></div>
             </div>
             <div className="relative">
                <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                  <span>Conversas ({stats.totalConversations})</span> <span>real</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full"><div className="h-3 bg-blue-500 rounded-full w-full"></div></div>
             </div>
             <div className="relative">
                <div className="flex justify-between text-xs font-bold text-green-600 mb-1">
                  <span>Mensagens registradas ({stats.totalMessages})</span> <span>real</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full"><div className="h-3 bg-green-500 rounded-full" style={{ width: `${Math.min(100, stats.totalMessages * 10)}%` }}></div></div>
             </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 min-h-[300px] flex flex-col">
          <h3 className="font-bold text-gray-900 mb-6">Cobertura dos Dados</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] font-bold uppercase text-gray-400">Contatos</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalLeads}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] font-bold uppercase text-gray-400">Conversas</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalConversations}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] font-bold uppercase text-gray-400">Mensagens</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalMessages}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] font-bold uppercase text-gray-400">Eventos n8n</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
            </div>
          </div>
          <p className="mt-6 text-xs leading-5 text-gray-500">
            Origem, interesse, responsável e temperatura dependem de campos estruturados enviados pelo n8n. Hoje a base real traz principalmente nome, telefone e eventos.
          </p>
        </div>
      </div>
    </div>
  );
}
