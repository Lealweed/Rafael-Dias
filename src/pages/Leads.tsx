import { useState, useEffect } from "react";
import { Search, Plus, Filter, MoreHorizontal } from "lucide-react";

export default function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeads() {
      const res = await fetch('/api/crm/leads');
      const data = await res.json();

      if (res.ok && data.ok) setLeads(data.leads || []);
      else console.error('Erro ao buscar leads:', data?.error || res.statusText);

      setLoading(false);
    }
    fetchLeads();
  }, []);

  const getTempBadge = (temp: string) => {
    switch(temp?.toLowerCase()) {
      case "hot":
      case "quente": 
        return <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[9px] font-bold text-orange-600 uppercase">Quente</span>;
      case "warm":
      case "morno":
        return <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[9px] font-bold text-gray-600 uppercase">Morno</span>;
      default: 
        return <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600 uppercase">Frio</span>;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);
    
    if (diffDays > 0) return `${diffDays}d`;
    if (diffHrs > 0) return `${diffHrs}h`;
    return `${diffMins}m`;
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Gestão de Leads</h1>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mt-1">Base de Contatos e Qualificação</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-sm font-bold text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors">
          <Plus className="w-4 h-4" />
          Novo Lead
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 w-80">
              <Search className="w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Buscar lead..." className="bg-transparent outline-none w-full text-gray-900 placeholder:text-gray-400" />
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
              <Filter className="w-4 h-4" /> Filtros
            </button>
          </div>
          <div className="text-xs font-medium text-gray-500">
            Mostrando <span className="font-bold text-gray-900">{leads.length}</span> leads
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] uppercase text-gray-500 sticky top-0 border-b border-gray-100 z-10">
              <tr>
                <th className="px-6 py-3 font-bold">Contato / Origem</th>
                <th className="px-6 py-3 font-bold">Interesse</th>
                <th className="px-6 py-3 font-bold">Temperatura</th>
                <th className="px-6 py-3 font-bold">S/ Contato Há</th>
                <th className="px-6 py-3 font-bold">Responsável</th>
                <th className="px-6 py-3 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Carregando leads...</td></tr>
              ) : leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{lead.name || lead.phone || 'Sem nome'}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{lead.phone || 'Sem telefone'} • {lead.origin || 'Desconhecido'}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-700">{lead.interest || lead.latestMessage || 'Pendente'}</td>
                  <td className="px-6 py-4">
                    {getTempBadge(lead.temperature)}
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-xs font-medium">
                    {formatTimeAgo(lead.lastInteractionAt || lead.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-xs font-medium">{lead.owner || 'Não atribuído'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button className="rounded border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-[#2563EB] shadow-sm hover:bg-gray-50">Abrir</button>
                       <button className="p-1 text-gray-400 hover:text-gray-600"><MoreHorizontal className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && leads.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Nenhum lead encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
