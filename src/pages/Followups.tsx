import { useState, useEffect } from "react";
import { Clock, CheckSquare, AlertCircle, PlayCircle, MoreHorizontal } from "lucide-react";
import { createClient } from "../lib/supabase/client";

export default function Followups() {
  const [atrasados, setAtrasados] = useState<any[]>([]);
  const [paraHoje, setParaHoje] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFollowups() {
      const supabase = createClient();
      
      // Since we don't have a formal followups table yet, 
      // we generate virtual follow-ups based on leads.
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('last_interaction_at', { ascending: true }); // Oldest interactions first

      if (data) {
        const now = new Date();
        const overdues = [];
        const todays = [];

        for (const lead of data) {
          const lastInt = new Date(lead.last_interaction_at || lead.created_at);
          const diffHours = (now.getTime() - lastInt.getTime()) / (1000 * 60 * 60);

          if (diffHours > 48) {
            overdues.push(lead);
          } else if (diffHours > 6) {
            todays.push(lead);
          }
        }

        setAtrasados(overdues);
        setParaHoje(todays);
      }

      setLoading(false);
    }
    fetchFollowups();
  }, []);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Follow-ups</h1>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mt-1">Fila Prioritária (Gerada a partir de inatividade real)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Column 1: Atrasados / Urgentes */}
        <div className="flex flex-col gap-4">
           <div className="flex items-center gap-2 mb-2">
             <AlertCircle className="w-5 h-5 text-red-500" />
             <h3 className="font-bold text-gray-900">Atrasados <span className="text-gray-400 font-normal"> ({atrasados.length})</span></h3>
           </div>

           {loading && <p className="text-sm text-gray-500">Carregando...</p>}
           {!loading && atrasados.length === 0 && <p className="text-sm text-gray-500">Nenhum follow-up atrasado.</p>}

           {atrasados.map(lead => (
             <div key={lead.id} className="bg-red-50 border border-red-100 rounded-2xl p-5 shadow-sm">
               <div className="flex items-start justify-between mb-2">
                 <span className="bg-red-100 text-red-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded">+48h Sem Contato</span>
                 <button><MoreHorizontal className="w-4 h-4 text-red-300" /></button>
               </div>
               <h4 className="font-bold text-gray-900 text-sm">{lead.full_name || lead.phone}</h4>
               <p className="text-xs text-gray-600 mt-1 line-clamp-2">Origem: {lead.origin || 'Desconhecido'}</p>
               <div className="mt-4 pt-4 border-t border-red-200/50 flex gap-2">
                 <button className="flex-1 bg-white border border-red-200 text-red-700 text-xs font-bold py-1.5 rounded-lg hover:bg-red-50 shadow-sm flex items-center justify-center gap-2">
                   <PlayCircle className="w-3.5 h-3.5" />
                   Retomar
                 </button>
               </div>
             </div>
           ))}
        </div>

        {/* Column 2: Para Hoje */}
        <div className="flex flex-col gap-4">
           <div className="flex items-center gap-2 mb-2">
             <Clock className="w-5 h-5 text-blue-500" />
             <h3 className="font-bold text-gray-900">Atenção Sugerida <span className="text-gray-400 font-normal"> ({paraHoje.length})</span></h3>
           </div>

           {loading && <p className="text-sm text-gray-500">Carregando...</p>}
           {!loading && paraHoje.length === 0 && <p className="text-sm text-gray-500">Tudo em dia para hoje.</p>}

           {paraHoje.map(lead => (
             <div key={lead.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 transition-colors">
               <div className="flex items-start justify-between mb-2">
                 <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold uppercase px-2 py-0.5 rounded">+6h Sem Contato</span>
               </div>
               <h4 className="font-bold text-gray-900 text-sm">{lead.full_name || lead.phone}</h4>
               <p className="text-xs text-gray-600 mt-1 line-clamp-2">Temperatura: {lead.temperature || 'Frio'}</p>
               <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                 <button className="flex-1 bg-[#2563EB] text-white text-xs font-bold py-1.5 rounded-lg hover:bg-blue-700 shadow-sm">Atender Lead</button>
               </div>
             </div>
           ))}
        </div>

        {/* Column 3: Próximos */}
        <div className="flex flex-col gap-4">
           <div className="flex items-center gap-2 mb-2">
             <CheckSquare className="w-5 h-5 text-gray-400" />
             <h3 className="font-bold text-gray-900">Em Dia</h3>
           </div>

           <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center">
             <p className="text-xs font-bold text-gray-500 uppercase">Dados Reais</p>
             <p className="text-xs text-gray-400 mt-2">Leads recentes aparecem apenas na aba Central de Conversas.</p>
           </div>
        </div>

      </div>
    </div>
  );
}
