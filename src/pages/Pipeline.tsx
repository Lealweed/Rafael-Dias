import { MoreHorizontal, Plus, GripVertical } from "lucide-react";

export default function Pipeline() {
  const stages = [
    {
      id: "new",
      title: "Novo Lead",
      color: "bg-blue-500",
      bgCol: "bg-gray-50",
      items: [
        { id: 1, name: "Fernanda Costa", interest: "Avaliação", time: "2h", origin: "WhatsApp" },
        { id: 2, name: "Roberto Alves", interest: "Dúvida", time: "4h", origin: "Site" },
      ]
    },
    {
      id: "contact",
      title: "Em Contato",
      color: "bg-yellow-500",
      bgCol: "bg-gray-50",
      items: [
        { id: 3, name: "Júlia Lima", interest: "Retorno", time: "1d", origin: "n8n" },
      ]
    },
    {
      id: "qualified",
      title: "Qualificado",
      color: "bg-orange-500",
      bgCol: "bg-gray-50",
      items: [
        { id: 4, name: "Mariana Oliveira", interest: "Transplante Capilar", time: "3h", origin: "WhatsApp" },
      ]
    },
    {
      id: "proposal",
      title: "Proposta / Negociação",
      color: "bg-purple-500",
      bgCol: "bg-gray-50",
      items: []
    },
    {
      id: "scheduled",
      title: "Agendado / Ganho",
      color: "bg-green-500",
      bgCol: "bg-green-50/50",
      items: [
        { id: 5, name: "Carlos Magno", interest: "Implante", time: "5d", origin: "Indicação" },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Pipeline Comercial</h1>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mt-1">Gestão de Estágios e Conversão (Fase 3)</p>
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
        {stages.map((stage) => (
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
