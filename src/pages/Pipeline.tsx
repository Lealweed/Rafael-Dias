import { useState, useEffect } from "react";
import { MoreHorizontal, Plus, GripVertical } from "lucide-react";

export default function Pipeline() {
  const [stages, setStages] = useState([
    { id: "cold", title: "Novo Lead (Frios)", color: "bg-blue-500", bgCol: "bg-gray-50", items: [] as any[] },
    { id: "warm", title: "Em Contato (Mornos)", color: "bg-yellow-500", bgCol: "bg-gray-50", items: [] as any[] },
    { id: "hot", title: "Qualificados (Quentes)", color: "bg-orange-500", bgCol: "bg-gray-50", items: [] as any[] },
    { id: "proposal", title: "Proposta", color: "bg-purple-500", bgCol: "bg-gray-50", items: [] as any[] },
    { id: "won", title: "Ganhos", color: "bg-green-500", bgCol: "bg-green-50/50", items: [] as any[] }
  ]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPipeline() {
      const res = await fetch('/api/crm/leads');
      const data = await res.json();

      if (res.ok && data.ok) {
        setStages(prev => prev.map(stage => ({ ...stage, items: [] }))); // Reset items
        
        const newStages = [
          { id: "cold", title: "Novo Lead (Frios)", color: "bg-blue-500", bgCol: "bg-gray-50", items: [] as any[] },
          { id: "warm", title: "Em Contato (Mornos)", color: "bg-yellow-500", bgCol: "bg-gray-50", items: [] as any[] },
          { id: "hot", title: "Qualificados (Quentes)", color: "bg-orange-500", bgCol: "bg-gray-50", items: [] as any[] },
          { id: "proposal", title: "Proposta", color: "bg-purple-500", bgCol: "bg-gray-50", items: [] as any[] },
          { id: "won", title: "Ganhos", color: "bg-green-500", bgCol: "bg-green-50/50", items: [] as any[] }
        ];

        (data.leads || []).forEach((lead: any) => {
          const temp = lead.temperature?.toLowerCase() || 'cold';
          let stageIndex = 0; // Default down to cold
          if (temp === 'hot' || temp === 'quente') stageIndex = 2;
          else if (temp === 'warm' || temp === 'morno') stageIndex = 1;

          // Format lead item
          newStages[stageIndex].items.push({
            id: lead.id,
            name: lead.name || lead.phone || 'Sem nome',
            interest: lead.interest || lead.latestMessage || "Pendente",
            time: new Date(lead.lastInteractionAt || lead.createdAt).toLocaleDateString(),
            origin: lead.origin || "Sistema"
          });
        });

        setStages(newStages);
      } else {
        console.error('Erro ao buscar pipeline:', data?.error || res.statusText);
      }
      setLoading(false);
    }
    
    fetchPipeline();
  }, []);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Pipeline Comercial</h1>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mt-1">Sincronizado com Supabase</p>
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
            {/* Header Column */}
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

            {/* Column Cards Container */}
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
