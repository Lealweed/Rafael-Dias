import { useEffect, useMemo, useState } from "react";
import { Clock, CheckSquare, AlertCircle, PlayCircle, MoreHorizontal, CalendarClock, ArrowUpRight } from "lucide-react";

type Lead = {
  id: string;
  name?: string;
  phone?: string;
  origin?: string;
  temperature?: string;
  lastInteractionAt?: string;
  createdAt?: string;
};

function hoursSince(dateValue?: string) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60);
}

function timeAgo(dateValue?: string) {
  const hours = hoursSince(dateValue);
  if (hours == null) return "Sem registro";
  const rounded = Math.floor(hours);
  if (rounded >= 48) return `${Math.floor(rounded / 24)}d`;
  if (rounded >= 1) return `${rounded}h`;
  return "agora";
}

export default function Followups() {
  const [atrasados, setAtrasados] = useState<Lead[]>([]);
  const [paraHoje, setParaHoje] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFollowups() {
      try {
        const res = await fetch("/api/crm/leads");
        const data = await res.json();
        if (res.ok && data.ok) {
          const overdues: Lead[] = [];
          const todays: Lead[] = [];
          for (const lead of data.leads || []) {
            const baseDate = lead.lastInteractionAt || lead.createdAt;
            const diffHours = hoursSince(baseDate);
            if (diffHours == null) continue;
            if (diffHours > 48) overdues.push(lead);
            else if (diffHours > 6) todays.push(lead);
          }
          setAtrasados(overdues);
          setParaHoje(todays);
        } else {
          console.error("Erro ao buscar follow-ups:", data?.error || res.statusText);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchFollowups();
  }, []);

  const summary = useMemo(() => ({
    overdue: atrasados.length,
    suggested: paraHoje.length,
    total: atrasados.length + paraHoje.length,
  }), [atrasados, paraHoje]);

  const renderLeadCard = (lead: Lead, variant: "danger" | "neutral") => {
    const isDanger = variant === "danger";
    return (
      <article
        key={lead.id}
        className={`rounded-2xl border p-5 shadow-sm ${isDanger ? "border-red-200 bg-red-50" : "border-gray-200 bg-white hover:border-blue-300"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${isDanger ? "border border-red-200 bg-white text-red-700" : "border border-blue-200 bg-blue-50 text-blue-700"}`}>
              {isDanger ? "+48h sem contato" : "+6h sem contato"}
            </span>
            <h4 className="mt-3 text-sm font-bold text-gray-900">{lead.name || lead.phone || "Sem nome"}</h4>
            <p className="mt-1 text-xs text-gray-600">Origem: {lead.origin || "Desconhecida"}</p>
            <p className="mt-1 text-xs text-gray-500">Última interação: {timeAgo(lead.lastInteractionAt || lead.createdAt)}</p>
          </div>
          <button className="rounded-lg p-2 text-gray-400 hover:bg-white/70 hover:text-gray-600">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
        <div className={`mt-4 flex gap-2 border-t pt-4 ${isDanger ? "border-red-200/60" : "border-gray-100"}`}>
          <button className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold shadow-sm ${isDanger ? "border border-red-200 bg-white text-red-700 hover:bg-red-50" : "bg-[#2563EB] text-white hover:bg-blue-700"}`}>
            <PlayCircle className="h-3.5 w-3.5" />
            {isDanger ? "Retomar agora" : "Atender lead"}
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Follow-ups</h1>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Fila operacional priorizada com base em inatividade real e ritmo do atendimento
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Fila total</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Atrasados</p>
          <p className="mt-2 text-3xl font-bold text-rose-600">{summary.overdue}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Atenção sugerida</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{summary.suggested}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Operação</p>
          <p className="mt-2 text-sm font-bold text-emerald-700">Painel alinhado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-600">
              <AlertCircle className="h-4 w-4" /> Atrasados
            </div>
            <p className="mt-2 text-sm text-gray-500">Leads com mais de 48h sem interação.</p>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto bg-red-50/30 p-4">
            {loading && <p className="text-sm text-gray-500">Carregando...</p>}
            {!loading && atrasados.length === 0 && <p className="text-sm text-gray-500">Nenhum follow-up atrasado.</p>}
            {atrasados.map((lead) => renderLeadCard(lead, "danger"))}
          </div>
        </section>

        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
              <Clock className="h-4 w-4" /> Atenção sugerida
            </div>
            <p className="mt-2 text-sm text-gray-500">Leads com mais de 6h sem resposta.</p>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/50 p-4">
            {loading && <p className="text-sm text-gray-500">Carregando...</p>}
            {!loading && paraHoje.length === 0 && <p className="text-sm text-gray-500">Tudo em dia para hoje.</p>}
            {paraHoje.map((lead) => renderLeadCard(lead, "neutral"))}
          </div>
        </section>

        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              <CheckSquare className="h-4 w-4" /> Orientação operacional
            </div>
            <p className="mt-2 text-sm text-gray-500">Como interpretar e executar a fila.</p>
          </div>
          <div className="space-y-4 p-4">
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-700">
                <CalendarClock className="h-4 w-4" /> Ritmo esperado
              </div>
              <p className="mt-2 text-sm text-violet-900">Priorize atrasados, depois atenção sugerida, e use a Central de Conversas para responder com contexto.</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <ArrowUpRight className="h-4 w-4" /> Próximo passo
              </div>
              <p className="mt-2 text-sm text-emerald-900">Quando houver follow-ups estruturados no banco, este módulo pode evoluir de inferência para agenda operacional real.</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              Leads recentes e histórico detalhado continuam visíveis na Central de Conversas.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
