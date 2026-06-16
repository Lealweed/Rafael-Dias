import { useState, useEffect, useMemo } from "react";
import { MoreHorizontal, Plus, GripVertical, Sparkles } from "lucide-react";
import { createClient } from "../lib/supabase/client";

const STAGE_TEMPLATE = [
  { id: "novo", title: "Novos Leads", color: "bg-blue-500", bgCol: "bg-[#0B0D12]/40" },
  { id: "em_atendimento", title: "Em Atendimento", color: "bg-amber-500", bgCol: "bg-[#0B0D12]/40" },
  { id: "aguardando_cliente", title: "Aguardando", color: "bg-sky-500", bgCol: "bg-[#0B0D12]/40" },
  { id: "agendado", title: "Agendados", color: "bg-emerald-500", bgCol: "bg-[#0B0D12]/40" },
  { id: "encerrado", title: "Encerrados", color: "bg-white/30", bgCol: "bg-[#0B0D12]/40" },
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
          origin: lead.origin || lead.origem || "WhatsApp",
        });
      }

      setStages(nextStages);
      setLoading(false);
    }

    fetchPipeline();
  }, [supabase]);

  return (
    <div className="flex-1 overflow-hidden p-8 h-full w-full space-y-6 flex flex-col bg-transparent">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-white/5 shrink-0">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] uppercase tracking-widest font-semibold text-[#E5C38C] mb-2">
            <Sparkles className="h-3 w-3" />
            <span>Funil de Vendas</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-serif">Funil Comercial</h1>
          <p className="text-xs text-white/40 font-light mt-1">Organizado por etapa real do atendimento e qualificação.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 border border-white/10 rounded-2xl text-xs font-semibold uppercase tracking-wider text-white/60 bg-white/5 hover:bg-white/10 transition-colors">
            Configurar Estágios
          </button>
          <button className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#E5C38C] text-xs font-semibold uppercase tracking-wider text-[#0B0D12] rounded-2xl hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" />
            Adicionar Lead
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 snap-x min-h-[500px] h-full scrollbar-thin">
        {loading ? (
          <div className="w-full flex items-center justify-center text-xs text-white/35">Carregando funil comercial...</div>
        ) : stages.map((stage) => (
          <div key={stage.id} className={`flex flex-col w-80 shrink-0 rounded-3xl border border-white/5 ${stage.bgCol} snap-start backdrop-blur-xl shadow-xl overflow-hidden`}>
            
            {/* Stage Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#0E1118]/90">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${stage.color}`}></div>
                <h3 className="font-semibold text-white text-xs tracking-wide">{stage.title}</h3>
                <span className="bg-white/5 border border-white/10 text-white/50 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">{stage.items.length}</span>
              </div>
              <button className="text-white/40 hover:text-white transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Stage Cards List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {stage.items.map((item) => (
                <div key={item.id} className="bg-[#0E1118]/70 border border-white/5 p-4 rounded-2xl shadow-md hover:border-[#E5C38C]/35 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white text-xs group-hover:text-[#E5C38C] transition-colors line-clamp-1">{item.name}</h4>
                    <span className="text-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-bold text-[#E5C38C] uppercase tracking-wider bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-2 py-0.5 rounded-full w-max">
                      {item.interest}
                    </span>
                    <span className="text-[10px] text-white/50">{item.owner}</span>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                      <span className="text-[8px] uppercase tracking-widest font-bold text-white/30">{item.origin}</span>
                      <span className="text-[10px] text-white/40 font-mono font-medium">{item.time}</span>
                    </div>
                  </div>
                </div>
              ))}
              {stage.items.length === 0 && (
                <div className="h-24 border border-dashed border-white/5 rounded-2xl flex items-center justify-center bg-white/[0.01]">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-white/20">Sem leads</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
