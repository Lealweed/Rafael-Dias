import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal, Plus, GripVertical, LayoutDashboard, Sparkles, CircleDot } from "lucide-react";

type Lead = {
  id: string;
  name?: string;
  phone?: string;
  interest?: string;
  latestMessage?: string;
  origin?: string;
  temperature?: string;
  lastInteractionAt?: string;
  createdAt?: string;
};

type Stage = {
  id: string;
  title: string;
  color: string;
  accent: string;
  items: Array<{ id: string; name: string; interest: string; time: string; origin: string }>;
};

function bucketTemperature(temp?: string) {
  const value = String(temp || "cold").toLowerCase();
  if (value === "hot" || value === "quente") return "hot";
  if (value === "warm" || value === "morno") return "warm";
  return "cold";
}

function formatDate(value?: string) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const BASE_STAGES: Omit<Stage, "items">[] = [
  { id: "cold", title: "Novo lead", color: "bg-blue-500", accent: "text-blue-700" },
  { id: "warm", title: "Em contato", color: "bg-amber-500", accent: "text-amber-700" },
  { id: "hot", title: "Qualificados", color: "bg-orange-500", accent: "text-orange-700" },
  { id: "proposal", title: "Proposta", color: "bg-violet-500", accent: "text-violet-700" },
  { id: "won", title: "Ganhos", color: "bg-emerald-500", accent: "text-emerald-700" },
];

export default function Pipeline() {
  const [stages, setStages] = useState<Stage[]>(BASE_STAGES.map((stage) => ({ ...stage, items: [] })));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPipeline() {
      try {
        const res = await fetch("/api/crm/leads");
        const data = await res.json();
        if (res.ok && data.ok) {
          const nextStages: Stage[] = BASE_STAGES.map((stage) => ({ ...stage, items: [] }));
          (data.leads || []).forEach((lead: Lead) => {
            const temp = bucketTemperature(lead.temperature);
            const stageIndex = temp === "hot" ? 2 : temp === "warm" ? 1 : 0;
            nextStages[stageIndex].items.push({
              id: lead.id,
              name: lead.name || lead.phone || "Sem nome",
              interest: lead.interest || lead.latestMessage || "Aguardando contexto comercial",
              time: formatDate(lead.lastInteractionAt || lead.createdAt),
              origin: lead.origin || "Sistema",
            });
          });
          setStages(nextStages);
        } else {
          console.error("Erro ao buscar pipeline:", data?.error || res.statusText);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchPipeline();
  }, []);

  const totals = useMemo(() => ({
    total: stages.reduce((sum, stage) => sum + stage.items.length, 0),
    active: stages[1].items.length + stages[2].items.length,
    proposals: stages[3].items.length,
    won: stages[4].items.length,
  }), [stages]);

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Pipeline Comercial</h1>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Visão operacional alinhada ao CRM para acompanhar avanço do lead entre etapas
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50">
            Configurar etapas
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Adicionar lead
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Leads no pipeline</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totals.total}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Em contato</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{totals.active}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Propostas</p>
          <p className="mt-2 text-3xl font-bold text-violet-600">{totals.proposals}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Ganhos</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{totals.won}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
          <LayoutDashboard className="h-4 w-4" /> Fluxo operacional
        </div>
        <p className="mt-2 text-sm text-gray-500">Os estágios abaixo seguem o mesmo visual do painel operacional, facilitando leitura, priorização e continuidade do atendimento.</p>
      </div>

      <div className="flex min-h-[640px] gap-5 overflow-x-auto pb-4 snap-x">
        {loading ? (
          <div className="flex h-32 w-full items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 shadow-sm">
            Carregando pipeline...
          </div>
        ) : stages.map((stage) => (
          <section key={stage.id} className="flex w-80 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${stage.color}`} />
                    <h3 className="truncate text-sm font-bold text-gray-900">{stage.title}</h3>
                    <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                      {stage.items.length}
                    </span>
                  </div>
                  <p className={`mt-2 text-[11px] font-medium ${stage.accent}`}>Etapa operacional do funil comercial</p>
                </div>
                <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50/60 p-3">
              {stage.items.map((item) => (
                <article key={item.id} className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-bold text-gray-900">{item.name}</h4>
                      <p className="mt-1 line-clamp-2 text-xs text-gray-600">{item.interest}</p>
                    </div>
                    <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    <span className="inline-flex items-center gap-1"><CircleDot className="h-3.5 w-3.5" /> {item.origin}</span>
                    <span>{item.time}</span>
                  </div>
                </article>
              ))}

              {stage.items.length === 0 && (
                <div className="flex h-28 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-white text-center text-sm text-gray-400">
                  <Sparkles className="mb-2 h-5 w-5" />
                  Nenhum lead nesta etapa
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
