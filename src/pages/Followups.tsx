import { useState, useEffect, useMemo } from "react";
import { Clock, CheckSquare, AlertCircle, PlayCircle, MoreHorizontal, Sparkles } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

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
    <div className="flex flex-col h-full w-full space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-white/5 shrink-0">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] uppercase tracking-widest font-semibold text-[#E5C38C] mb-2">
            <Sparkles className="h-3 w-3" />
            <span>Fila Operacional</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-serif">Retornos & Follow-ups</h1>
          <p className="text-xs text-white/40 font-light mt-1">Contatos sugeridos com base em tempo sem contato e prioridade da agenda.</p>
        </div>
      </div>

      {/* Grid Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 items-start">
        
        {/* Coluna 1: Atrasados (Críticos) */}
        <div className="flex flex-col gap-4 bg-[#0B0D12]/60 border border-white/5 rounded-3xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-1">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <h3 className="font-semibold text-white text-xs tracking-wider uppercase">Vencidos</h3>
            </div>
            <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">{atrasados.length}</span>
          </div>

          {loading && <p className="text-xs text-white/30 text-center py-4">Carregando...</p>}
          {!loading && atrasados.length === 0 && (
            <p className="text-xs text-white/30 text-center py-8">Nenhum lead pendente de retorno atrasado.</p>
          )}

          {atrasados.map((lead) => (
            <div key={lead.id} className="bg-[#0E1118]/70 border border-red-500/20 p-4 rounded-2xl shadow-md space-y-3">
              <div className="flex items-start justify-between">
                <span className="bg-red-500/10 border border-red-500/10 text-red-400 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  {lead.next_followup_at ? "Atrasado" : "+48h Inativo"}
                </span>
                <button className="text-white/20 hover:text-white"><MoreHorizontal className="w-4 h-4" /></button>
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">{lead.full_name || lead.nome || lead.phone || lead.telefone}</h4>
                <p className="text-[10px] text-white/50 mt-1">
                  {lead.owner_name ? `Resp: ${lead.owner_name}` : `Origem: ${lead.origin || lead.origem || 'WhatsApp'}`}
                </p>
                {lead.next_followup_at && (
                  <p className="mt-2 text-[10px] font-semibold text-red-400 font-mono">Deveria retornar em {formatDateTime(lead.next_followup_at)}</p>
                )}
              </div>
              <button 
                onClick={() => navigate(`/conversations?leadId=${encodeURIComponent(lead.id)}`)}
                className="w-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold py-2 rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-1.5"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Retomar Atendimento
              </button>
            </div>
          ))}
        </div>

        {/* Coluna 2: Para Hoje */}
        <div className="flex flex-col gap-4 bg-[#0B0D12]/60 border border-white/5 rounded-3xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-1">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <h3 className="font-semibold text-white text-xs tracking-wider uppercase">Para Hoje</h3>
            </div>
            <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">{paraHoje.length}</span>
          </div>

          {loading && <p className="text-xs text-white/30 text-center py-4">Carregando...</p>}
          {!loading && paraHoje.length === 0 && (
            <p className="text-xs text-white/30 text-center py-8">Tudo em dia para o dia de hoje.</p>
          )}

          {paraHoje.map((lead) => (
            <div key={lead.id} className="bg-[#0E1118]/70 border border-white/5 p-4 rounded-2xl shadow-md space-y-3 hover:border-[#D4AF37]/30 transition-colors">
              <div className="flex items-start justify-between">
                <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  {lead.next_followup_at ? "Retorno Agendado" : "Atenção Sugerida"}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">{lead.full_name || lead.nome || lead.phone || lead.telefone}</h4>
                <p className="text-[10px] text-white/50 mt-1">
                  {lead.next_followup_at ? `Hoje às ${new Date(lead.next_followup_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : `Temperatura: ${lead.temperature || lead.temperatura || 'Quente'}`}
                </p>
              </div>
              <button 
                onClick={() => navigate(`/conversations?leadId=${encodeURIComponent(lead.id)}`)}
                className="w-full bg-[#D4AF37] text-[#0B0D12] text-[10px] font-bold py-2 rounded-xl hover:opacity-90 transition-opacity"
              >
                Atender Lead
              </button>
            </div>
          ))}
        </div>

        {/* Coluna 3: Próximos */}
        <div className="flex flex-col gap-4 bg-[#0B0D12]/60 border border-white/5 rounded-3xl p-5 backdrop-blur-xl">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-1">
            <CheckSquare className="w-4 h-4 text-white/40" />
            <h3 className="font-semibold text-white text-xs tracking-wider uppercase">Planejados</h3>
          </div>

          {proximos.length === 0 ? (
            <div className="border border-dashed border-white/5 rounded-2xl p-6 text-center bg-white/[0.01]">
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Sem agenda futura</p>
              <p className="text-[10px] text-white/40 mt-1 font-light">Os retornos futuros salvos aparecerão aqui.</p>
            </div>
          ) : (
            proximos.map((lead) => (
              <div 
                key={lead.id} 
                onClick={() => navigate(`/conversations?leadId=${encodeURIComponent(lead.id)}`)}
                className="bg-[#0E1118]/70 border border-white/5 p-4 rounded-2xl shadow-md cursor-pointer hover:border-white/10 transition-colors"
              >
                <p className="font-semibold text-white text-xs">{lead.full_name || lead.nome || lead.phone || lead.telefone}</p>
                <p className="mt-1.5 text-[10px] text-[#E5C38C] font-mono font-medium">Retorno: {formatDateTime(lead.next_followup_at)}</p>
                <p className="mt-1 text-[9px] uppercase tracking-wider font-semibold text-white/35">Resp: {lead.owner_name || 'Sem responsável'}</p>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
