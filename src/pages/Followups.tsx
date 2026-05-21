import { Clock, CheckSquare, AlertCircle, PlayCircle, MoreHorizontal } from "lucide-react";

export default function Followups() {
  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Follow-ups</h1>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mt-1">Fila Prioritária de Relacionamento</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Column 1: Atrasados / Urgentes */}
        <div className="flex flex-col gap-4">
           <div className="flex items-center gap-2 mb-2">
             <AlertCircle className="w-5 h-5 text-red-500" />
             <h3 className="font-bold text-gray-900">Atrasados <span className="text-gray-400 font-normal"> (2)</span></h3>
           </div>

           <div className="bg-red-50 border border-red-100 rounded-2xl p-5 shadow-sm">
             <div className="flex items-start justify-between mb-2">
               <span className="bg-red-100 text-red-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded">Venceu Ontem</span>
               <button><MoreHorizontal className="w-4 h-4 text-red-300" /></button>
             </div>
             <h4 className="font-bold text-gray-900 text-sm">Pedro Gonçalves</h4>
             <p className="text-xs text-gray-600 mt-1 line-clamp-2">Enviar proposta revisada com os 10% de desconto informados pela gestão.</p>
             <div className="mt-4 pt-4 border-t border-red-200/50 flex gap-2">
               <button className="flex-1 bg-white border border-red-200 text-red-700 text-xs font-bold py-1.5 rounded-lg hover:bg-red-50 shadow-sm flex items-center justify-center gap-2">
                 <PlayCircle className="w-3.5 h-3.5" />
                 Iniciar
               </button>
               <button className="bg-white border border-gray-200 text-gray-600 px-3 rounded-lg hover:bg-gray-50 flex items-center justify-center shadow-sm">
                 <CheckSquare className="w-4 h-4" />
               </button>
             </div>
           </div>
        </div>

        {/* Column 2: Para Hoje */}
        <div className="flex flex-col gap-4">
           <div className="flex items-center gap-2 mb-2">
             <Clock className="w-5 h-5 text-blue-500" />
             <h3 className="font-bold text-gray-900">Para Hoje <span className="text-gray-400 font-normal"> (4)</span></h3>
           </div>

           <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 transition-colors">
             <div className="flex items-start justify-between mb-2">
               <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold uppercase px-2 py-0.5 rounded">Hoje às 14:00</span>
             </div>
             <h4 className="font-bold text-gray-900 text-sm">Mariana Oliveira</h4>
             <p className="text-xs text-gray-600 mt-1 line-clamp-2">Confirmar o link de pagamento enviado via n8n.</p>
             <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
               <button className="flex-1 bg-[#2563EB] text-white text-xs font-bold py-1.5 rounded-lg hover:bg-blue-700 shadow-sm">Atender Lead</button>
             </div>
           </div>

           <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 transition-colors">
             <div className="flex items-start justify-between mb-2">
               <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold uppercase px-2 py-0.5 rounded">Hoje às 16:30</span>
             </div>
             <h4 className="font-bold text-gray-900 text-sm">João Cardoso</h4>
             <p className="text-xs text-gray-600 mt-1 line-clamp-2">Reativar contato parado há 30 dias.</p>
             <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
               <button className="flex-1 bg-white border border-gray-200 text-gray-700 text-xs font-bold py-1.5 rounded-lg hover:bg-gray-50 shadow-sm">Atender Lead</button>
             </div>
           </div>

        </div>

        {/* Column 3: Próximos */}
        <div className="flex flex-col gap-4">
           <div className="flex items-center gap-2 mb-2">
             <CheckSquare className="w-5 h-5 text-gray-400" />
             <h3 className="font-bold text-gray-900">Em Breve <span className="text-gray-400 font-normal"> (12)</span></h3>
           </div>

           <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 opacity-75">
             <div className="flex items-center justify-between mb-1">
               <h4 className="font-bold text-gray-700 text-sm">Amanda Torres</h4>
               <span className="text-[10px] font-bold text-gray-500 uppercase">Amanhã</span>
             </div>
             <p className="text-xs text-gray-500 truncate">Ligar para alinhar procedimento...</p>
           </div>
           
           <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 opacity-75">
             <div className="flex items-center justify-between mb-1">
               <h4 className="font-bold text-gray-700 text-sm">Roberto Silveira</h4>
               <span className="text-[10px] font-bold text-gray-500 uppercase">Segunda</span>
             </div>
             <p className="text-xs text-gray-500 truncate">Verificar resultado dos exames...</p>
           </div>

        </div>

      </div>
    </div>
  );
}
