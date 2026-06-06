import { useState, useEffect, useMemo } from "react";
import { Clock, CheckSquare, AlertCircle, PlayCircle, MoreHorizontal } from "lucide-react";
import { createClient } from "../lib/supabase/client";

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Followups() {
  const supabase = useMemo(() => createClient(), []);
  const [atrasados, setAtrasados] = useState<any[]>([]);
  const [paraHoje, setParaHoje] = useState<any[]>([]);
  const [proximos, setProximos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFollowups() {
      let { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('next_followup_at', { ascending: true, nullsFirst: false });

      if (error) {
        console.warn('Falha ao buscar follow-ups em public.leads, tentando Usuarios:', error.message);
        const legacy = await supabase
          .from('Usuarios')
          .select('*')
          .order('updated_at', { ascending: true });
        data = legacy.data;
        error = legacy.error;
      }

      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const overdues: any[] = [];
      const todays: any[] = [];
      const upcoming: any[] = [];

      for (const lead of data || []) {
        const status = String(lead.conversation_status || '').toLowerCase();
        if (status === 'encerrado') continue;

        const nextFollowup = lead.next_followup_at ? new Date(lead.next_followup_at) : null;
        if (nextFollowup && !Number.isNaN(nextFollowup.getTime())) {
          if (nextFollowup < now) {
            overdues.push(lead);
            continue;
          }
          if (nextFollowup <= endOfDay) {
            todays.push(lead);
            continue;
          }
          upcoming.push(lead);
          continue;
        }

        const lastInt = new Date(lead.last_interaction_at || lead.ultima_interacao_em || lead.updated_at || lead.created_at);
        const diffHours = (now.getTime() - lastInt.getTime()) / (1000 * 60 * 60);
        if (diffHours > 48) {
          overdues.push(lead);
        } else if (diffHours > 6) {
          todays.push(lead);
        }
      }

      setAtrasados(overdues);
      setParaHoje(todays);
      setProximos(upcoming.slice(0, 8));
      setLoading(false);
    }

    fetchFollowups();
  }, [supabase]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Follow-ups</h1>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mt-1">Fila operacional baseada em retorno prometido e prioridade clínica</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-gray-900">Atrasados <span className="text-gray-400 font-normal">({atrasados.length})</span></h3>
          </div>

          {loading && <p className="text-sm text-gray-500">Carregando...</p>}
          {!loading && atrasados.length === 0 && <p className="text-sm text-gray-500">Nenhum follow-up atrasado.</p>}

          {atrasados.map((lead) => (
            <div key={lead.id} className="bg-red-50 border border-red-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <span className="bg-red-100 text-red-700 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                  {lead.next_followup_at ? "Retorno vencido" : "+48h sem contato"}
                </span>
                <button><MoreHorizontal className="w-4 h-4 text-red-300" /></button>
              </div>
              <h4 className="font-bold text-gray-900 text-sm">{lead.full_name || lead.nome || lead.phone || lead.telefone}</h4>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {lead.owner_name ? `Responsável: ${lead.owner_name}` : `Origem: ${lead.origin || lead.origem || 'Desconhecido'}`}
              </p>
              {lead.next_followup_at && (
                <p className="mt-2 text-[11px] font-medium text-red-700">Previsto para {formatDateTime(lead.next_followup_at)}</p>
              )}
              <div className="mt-4 pt-4 border-t border-red-200/50 flex gap-2">
                <button className="flex-1 bg-white border border-red-200 text-red-700 text-xs font-bold py-1.5 rounded-lg hover:bg-red-50 shadow-sm flex items-center justify-center gap-2">
                  <PlayCircle className="w-3.5 h-3.5" />
                  Retomar
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-gray-900">Para hoje <span className="text-gray-400 font-normal">({paraHoje.length})</span></h3>
          </div>

          {loading && <p className="text-sm text-gray-500">Carregando...</p>}
          {!loading && paraHoje.length === 0 && <p className="text-sm text-gray-500">Tudo em dia para hoje.</p>}

          {paraHoje.map((lead) => (
            <div key={lead.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold uppercase px-2 py-0.5 rounded">
                  {lead.next_followup_at ? "Retorno combinado" : "Atenção sugerida"}
                </span>
              </div>
              <h4 className="font-bold text-gray-900 text-sm">{lead.full_name || lead.nome || lead.phone || lead.telefone}</h4>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {lead.next_followup_at ? `Hoje às ${formatDateTime(lead.next_followup_at)}` : `Temperatura: ${lead.temperature || lead.temperatura || 'Frio'}`}
              </p>
              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                <button className="flex-1 bg-[#2563EB] text-white text-xs font-bold py-1.5 rounded-lg hover:bg-blue-700 shadow-sm">Atender Lead</button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare className="w-5 h-5 text-gray-400" />
            <h3 className="font-bold text-gray-900">Próximos retornos</h3>
          </div>

          {proximos.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center">
              <p className="text-xs font-bold text-gray-500 uppercase">Sem agenda futura</p>
              <p className="text-xs text-gray-400 mt-2">Os retornos salvos nas conversas aparecerão aqui.</p>
            </div>
          ) : (
            proximos.map((lead) => (
              <div key={lead.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 shadow-sm">
                <p className="text-sm font-bold text-gray-900">{lead.full_name || lead.nome || lead.phone || lead.telefone}</p>
                <p className="mt-1 text-xs text-gray-500">{formatDateTime(lead.next_followup_at)}</p>
                <p className="mt-2 text-[11px] text-gray-500">{lead.owner_name || 'Sem responsável'}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
