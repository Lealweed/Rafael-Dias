import { useState, useEffect } from "react";
export default function Dashboard() {
  const [stats, setStats] = useState({
    newLeadsToday: 0,
    totalLeads: 0,
    hotLeads: 0,
    totalMessages: 0,
    totalConversations: 0
  });

  useEffect(() => {
    async function fetchStats() {
      const res = await fetch('/api/crm/dashboard');
      const data = await res.json();

      if (!res.ok || !data.ok) return;

      setStats({
        newLeadsToday: data.newLeadsToday || 0,
        totalLeads: data.totalLeads || 0,
        hotLeads: data.hotLeads || 0,
        totalMessages: data.totalMessages || 0,
        totalConversations: data.totalConversations || 0
      });
    }

    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Dashboard Executivo</h1>
        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mt-1">Visão geral do pipeline e conversas (Tempo Real)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* KPI Cards */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">Novos Leads (Hoje)</p>
          <div className="flex items-baseline gap-2">
            <h3 className="mt-1 text-3xl font-bold text-[#111827]">{stats.newLeadsToday}</h3>
          </div>
        </div>
        
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">Total de Leads</p>
          <div className="flex items-baseline gap-2">
            <h3 className="mt-1 text-3xl font-bold text-[#111827]">{stats.totalLeads}</h3>
          </div>
          <div className="mt-2 h-1 w-full bg-gray-100 rounded-full"><div className="h-1 w-full bg-blue-500"></div></div>
        </div>
        
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">Leads Quentes</p>
          <div className="flex items-baseline gap-2">
            <h3 className="mt-1 text-3xl font-bold text-[#111827]">{stats.hotLeads}</h3>
          </div>
        </div>
        
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase">Conversas Ativas</p>
          <div className="flex items-baseline gap-2">
            <h3 className="mt-1 text-3xl font-bold text-[#111827]">{stats.totalConversations}</h3>
          </div>
          <p className="mt-2 text-xs text-gray-500">{stats.totalMessages} mensagens registradas</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center mt-4">
        <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-[#111827]">Painel Conectado</h3>
        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
          O dashboard agora está consumindo dados reais do Supabase (Leads, Mensagens e Conversas via n8n).
        </p>
      </div>
    </div>
  );
}
