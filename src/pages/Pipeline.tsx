import { useState, useEffect, useMemo } from "react";
import { MoreHorizontal, Plus, GripVertical } from "lucide-react";
import { createClient } from "../lib/supabase/client";

const STAGE_TEMPLATE = [
  { id: "novo", title: "Novos Leads", color: "bg-blue-500", bgCol: "bg-gray-50" },
  { id: "em_atendimento", title: "Em Atendimento", color: "bg-amber-500", bgCol: "bg-amber-50/40" },
  { id: "aguardando_cliente", title: "Aguardando Cliente", color: "bg-sky-500", bgCol: "bg-sky-50/40" },
  { id: "agendado", title: "Agendados", color: "bg-emerald-500", bgCol: "bg-emerald-50/40" },
  { id: "encerrado", title: "Encerrados", color: "bg-slate-500", bgCol: "bg-slate-50/50" },
];

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "Sem data";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleDateString("pt-BR");
}

export default function Pipeline() {
  const supabase = useMemo(() => createClient(), []);
  const [stages, setStages] = useState(
    STAGE_TEMPLATE.map((stage) => ({ ...stage, items: [] as any[] }))
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPipeline() {
      let { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        const legacy = await supabase
          .from('Usuarios')
          .select('*')
          .order('updated_at', { ascending: false });
        data = legacy.data;
      }

      const nextStages = STAGE_TEMPLATE.map((stage) => ({ ...stage, items: [] as any[] }));

      for (const lead of data || []) {
        const status = String(lead.conversation_status || 'novo').toLowerCase();
        const stage = nextStages.find((item) => item.id === status) || nextStages[0];

        stage.items.push({
          id: lead.id,
          name: lead.full_name || lead.nome || lead.phone || lead.telefone,
          interest: lead.interest || lead.interesse || "Pendente",
          owner: lead.owner_name || lead.owner || lead.responsavel || "Sem responsável",
          time: formatDate(lead.next_followup_at || lead.last_appointment_at || lead.updated_at || lead.created_at),
          origin: lead.origin || lead.origem || "Sistema",
        });
      }

      setStages(nextStages);
      setLoading(false);
    }

    fetchPipeline();
  }, [supabase]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Funil Comercial</h1>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mt-1">Organizado por etapa real do atendimento</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-sm font-bold text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm transition-colors">
            Configurar Estágios
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-sm font-bold text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors">
            <Plus className="w-4 h-4" />
            Adicionar Lead
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 snap-x min-h-[600px]">
        {loading ? (
          <div className="w-full h-32 flex items-center justify-center text-gray-500">Carregando pipeline...</div>
        ) : stages.map((stage) => (
          <div key={stage.id} className={`flex flex-col w-80 shrink-0 rounded-2xl border border-gray-200 ${stage.bgCol} snap-start`}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                <h3 className="font-bold text-gray-900">{stage.title}</h3>
                <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">{stage.items.length}</span>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {stage.items.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:border-blue-300 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-gray-900 text-sm group-hover:text-[#2563EB] transition-colors">{item.name}</h4>
                    <span className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-gray-600 font-medium bg-gray-50 px-2 py-1 rounded inline-block w-max">{item.interest}</span>
                    <span className="text-[11px] text-gray-500">{item.owner}</span>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                      <span className="text-[10px] uppercase font-bold text-gray-400">{item.origin}</span>
                      <span className="text-xs font-medium text-gray-500">{item.time}</span>
                    </div>
                  </div>
                </div>
              ))}
              {stage.items.length === 0 && (
                <div className="h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-400">Nenhum lead nesta etapa</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
