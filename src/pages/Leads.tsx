import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Filter, MoreHorizontal, Flame, UserRound, MessageSquare, Clock3 } from "lucide-react";

type Lead = {
  id: string;
  name?: string;
  phone?: string;
  origin?: string;
  interest?: string;
  latestMessage?: string;
  temperature?: string;
  lastInteractionAt?: string;
  createdAt?: string;
  owner?: string;
};

function normalizeTemperature(temp?: string) {
  const value = String(temp || "cold").toLowerCase();
  if (value === "hot" || value === "quente") return "hot";
  if (value === "warm" || value === "morno") return "warm";
  return "cold";
}

function temperatureBadge(temp?: string) {
  const normalized = normalizeTemperature(temp);
  if (normalized === "hot") return "border-orange-200 bg-orange-50 text-orange-700";
  if (normalized === "warm") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function temperatureLabel(temp?: string) {
  const normalized = normalizeTemperature(temp);
  if (normalized === "hot") return "Quente";
  if (normalized === "warm") return "Morno";
  return "Frio";
}

function formatTimeAgo(dateStr?: string) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "-";
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.max(0, Math.floor(diffMs / 60000));
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays > 0) return `${diffDays}d`;
  if (diffHrs > 0) return `${diffHrs}h`;
  return `${diffMins}m`;
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchLeads() {
      try {
        const res = await fetch("/api/crm/leads");
        const data = await res.json();
        if (res.ok && data.ok) setLeads(data.leads || []);
        else console.error("Erro ao buscar leads:", data?.error || res.statusText);
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
  }, []);

  const filteredLeads = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter((lead) =>
      [lead.name, lead.phone, lead.origin, lead.interest, lead.latestMessage, lead.owner]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [leads, search]);

  const stats = useMemo(() => ({
    total: leads.length,
    hot: leads.filter((lead) => normalizeTemperature(lead.temperature) === "hot").length,
    unattended: leads.filter((lead) => !lead.owner).length,
    stale: leads.filter((lead) => {
      const base = new Date(lead.lastInteractionAt || lead.createdAt || 0).getTime();
      return Date.now() - base > 1000 * 60 * 60 * 24;
    }).length,
  }), [leads]);

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Leads CRM</h1>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Base operacional padronizada para triagem, contexto e acompanhamento comercial
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Novo Lead
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total de leads</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Quentes</p>
          <p className="mt-2 text-3xl font-bold text-orange-600">{stats.hot}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sem responsável</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{stats.unattended}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">+24h sem contato</p>
          <p className="mt-2 text-3xl font-bold text-rose-600">{stats.stale}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 lg:w-96">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, telefone, origem ou responsável..."
                className="w-full bg-transparent text-gray-900 outline-none placeholder:text-gray-400"
              />
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50">
              <Filter className="h-4 w-4" />
              Filtros rápidos
            </button>
          </div>
          <div className="text-xs font-medium text-gray-500">
            Exibindo <span className="font-bold text-gray-900">{filteredLeads.length}</span> de {leads.length} leads
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-6 py-3">Lead</th>
                <th className="px-6 py-3">Interesse / contexto</th>
                <th className="px-6 py-3">Temperatura</th>
                <th className="px-6 py-3">Último contato</th>
                <th className="px-6 py-3">Responsável</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">Carregando leads...</td>
                </tr>
              ) : filteredLeads.map((lead) => (
                <tr key={lead.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                        {(lead.name || lead.phone || "LD").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{lead.name || lead.phone || "Sem nome"}</div>
                        <div className="mt-0.5 text-[11px] text-gray-400">{lead.phone || "Sem telefone"} • {lead.origin || "Origem não informada"}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="max-w-sm">
                      <p className="font-medium text-gray-700">{lead.interest || lead.latestMessage || "Aguardando qualificação"}</p>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Contexto comercial do lead
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${temperatureBadge(lead.temperature)}`}>
                      {temperatureLabel(lead.temperature)}
                    </span>
                  </td>
                  <td className="px-6 py-4 align-top">
                    <div className="inline-flex items-center gap-2 text-xs font-medium text-gray-600">
                      <Clock3 className="h-3.5 w-3.5 text-gray-400" />
                      {formatTimeAgo(lead.lastInteractionAt || lead.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 align-top">
                    {lead.owner ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700">
                        <UserRound className="h-3.5 w-3.5" />
                        {lead.owner}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase text-amber-700">
                        <Flame className="h-3.5 w-3.5" />
                        Não atribuído
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right align-top">
                    <div className="flex items-center justify-end gap-2">
                      <button className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-[#2563EB] shadow-sm hover:bg-gray-50">
                        Abrir lead
                      </button>
                      <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Nenhum lead encontrado para o filtro atual.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
