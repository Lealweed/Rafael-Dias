import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Filter, MoreHorizontal, User, Sparkles } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { useNavigate } from "react-router-dom";

export default function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function fetchLeads() {
      let { data, error } = await supabase
        .from('leads')
        .select('*');

      if (error) {
        console.warn('Falha ao buscar leads em public.leads, tentando Usuarios:', error.message);
        const legacy = await supabase
          .from('Usuarios')
          .select('*');
        data = legacy.data;
        error = legacy.error;
      }

      if (error) {
        console.error('Erro ao buscar leads (leads/Usuarios):', error);
        setLeads([]);
      } else if (data) {
        const sorted = [...data].sort((a: any, b: any) => {
          const da = new Date(a.created_at || a.updated_at || 0).getTime();
          const db = new Date(b.created_at || b.updated_at || 0).getTime();
          return db - da;
        });
        setLeads(sorted);
      }
      setLoading(false);
    }
    fetchLeads();
  }, [supabase]);

  const filteredLeads = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter((lead: any) => {
      const name = String(lead.full_name || lead.nome || "").toLowerCase();
      const phone = String(lead.phone || lead.telefone || "").toLowerCase();
      const origin = String(lead.origin || lead.origem || "").toLowerCase();
      const interest = String(lead.interest || lead.interesse || "").toLowerCase();
      return name.includes(term) || phone.includes(term) || origin.includes(term) || interest.includes(term);
    });
  }, [leads, searchTerm]);

  const getTempBadge = (temp: string) => {
    switch(temp?.toLowerCase()) {
      case "hot":
      case "quente": 
        return <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[8px] font-bold text-orange-400 uppercase tracking-wide">Quente</span>;
      case "warm":
      case "morno":
        return <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[8px] font-bold text-white/60 uppercase tracking-wide">Morno</span>;
      default: 
        return <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[8px] font-bold text-blue-400 uppercase tracking-wide">Frio</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch ((status || "novo").toLowerCase()) {
      case "em_atendimento":
        return <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[8px] font-bold text-amber-400 uppercase tracking-wide">Em Atendimento</span>;
      case "aguardando_cliente":
        return <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[8px] font-bold text-sky-400 uppercase tracking-wide">Aguardando</span>;
      case "agendado":
        return <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold text-emerald-400 uppercase tracking-wide">Agendado</span>;
      case "em_followup":
        return <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[8px] font-bold text-violet-400 uppercase tracking-wide">Follow-up</span>;
      case "encerrado":
        return <span className="rounded-full border border-white/5 bg-white/5 px-2 py-0.5 text-[8px] font-bold text-white/30 uppercase tracking-wide">Encerrado</span>;
      default:
        return <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[8px] font-bold text-blue-400 uppercase tracking-wide">Novo</span>;
    }
  };

  const getAppointmentBadge = (status: string) => {
    switch ((status || "scheduled").toLowerCase()) {
      case "pending_confirmation":
        return <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[8px] font-bold text-amber-400 uppercase tracking-wide">Aguardando</span>;
      case "confirmed":
        return <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-2 py-0.5 text-[8px] font-bold text-teal-400 uppercase tracking-wide">Confirmada</span>;
      case "completed":
        return <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold text-emerald-400 uppercase tracking-wide">Realizada</span>;
      case "no_show":
        return <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[8px] font-bold text-red-400 uppercase tracking-wide">Faltou</span>;
      case "canceled":
        return <span className="rounded-full border border-white/5 bg-white/5 px-2 py-0.5 text-[8px] font-bold text-white/40 uppercase tracking-wide">Cancelada</span>;
      case "rescheduled":
        return <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[8px] font-bold text-orange-400 uppercase tracking-wide">Remarcado</span>;
      default:
        return <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold text-emerald-400 uppercase tracking-wide">Agendado</span>;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);
    
    if (diffDays > 0) return `${diffDays} dias`;
    if (diffHrs > 0) return `${diffHrs} horas`;
    return `${diffMins} min`;
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-full w-full space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-white/5 shrink-0">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] uppercase tracking-widest font-semibold text-[#E5C38C] mb-2">
            <Sparkles className="h-3 w-3" />
            <span>Base de Leads</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-serif">Gestão de Leads</h1>
          <p className="text-xs text-white/40 font-light mt-1">Base de contatos, qualificação e funil de atendimento.</p>
        </div>
        
        <button className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#E5C38C] text-xs font-semibold uppercase tracking-wider text-[#0B0D12] rounded-2xl hover:opacity-90 shadow-md transition-opacity">
          <Plus className="w-4 h-4" />
          Novo Lead
        </button>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-3xl border border-white/5 bg-[#0B0D12]/60 backdrop-blur-xl shadow-2xl">
        
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/5 px-6 py-4 gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 border border-white/5 rounded-2xl bg-[#07090E]/60 text-xs focus-within:border-[#D4AF37]/45 transition-colors w-80">
              <Search className="w-4 h-4 text-white/30" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar lead por nome, telefone ou interesse..." 
                className="bg-transparent outline-none w-full text-white placeholder:text-white/20" 
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-2xl text-xs font-semibold uppercase tracking-wider text-white/60 bg-white/5 hover:bg-white/10 transition-colors">
              <Filter className="w-4 h-4" /> Filtros
            </button>
          </div>
          <div className="text-xs font-medium text-white/40">
            Mostrando <span className="font-bold text-[#E5C38C] font-mono">{filteredLeads.length}</span> leads cadastrados
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0E1118]/80 text-[9px] uppercase tracking-widest text-white/40 sticky top-0 border-b border-white/5 z-10">
              <tr>
                <th className="px-6 py-4 font-bold">Contato / Origem</th>
                <th className="px-6 py-4 font-bold">Procedimento</th>
                <th className="px-6 py-4 font-bold">Etapa</th>
                <th className="px-6 py-4 font-bold">Temperatura</th>
                <th className="px-6 py-4 font-bold">Último Contato</th>
                <th className="px-6 py-4 font-bold">Responsável</th>
                <th className="px-6 py-4 font-bold">Consulta</th>
                <th className="px-6 py-4 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-white/70">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-white/30">Carregando dados dos leads...</td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-white/30">Nenhum lead encontrado com o termo buscado.</td>
                </tr>
              ) : filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white text-sm">{lead.full_name || lead.nome || lead.phone || lead.telefone}</div>
                    <div className="text-[10px] text-white/30 mt-0.5 font-mono">{lead.phone || lead.telefone} • {lead.origin || lead.origem || 'WhatsApp'}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-white/60">{lead.interest || lead.interesse || 'Pendente'}</td>
                  <td className="px-6 py-4">
                    {getStatusBadge(lead.conversation_status)}
                  </td>
                  <td className="px-6 py-4">
                    {getTempBadge(lead.temperature || lead.temperatura)}
                  </td>
                  <td className="px-6 py-4 text-white/40 font-mono text-xs">
                    há {formatTimeAgo(lead.last_interaction_at || lead.ultima_interacao_em || lead.updated_at || lead.created_at)}
                  </td>
                  <td className="px-6 py-4 text-white/50 text-xs">
                    <div className="font-semibold text-white/70">{lead.owner_name || lead.owner || lead.responsavel || 'Não Atribuído'}</div>
                    {lead.next_followup_at && (
                      <div className="mt-1 text-[9px] text-[#E5C38C] font-mono">Retorno: {formatDateTime(lead.next_followup_at)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {lead.calendar_event_id ? (
                      <div className="flex flex-col gap-1.5 items-start">
                        {getAppointmentBadge(lead.appointment_status)}
                        {lead.last_appointment_at && (
                          <span className="text-[9px] text-emerald-400 font-mono">{formatDateTime(lead.last_appointment_at)}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-white/20">Sem consulta</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                       <button
                         onClick={() => navigate(`/conversations?leadId=${encodeURIComponent(lead.id)}`)}
                         className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-[#E5C38C] hover:bg-white/10 transition-colors shadow-sm"
                       >
                         Chat
                       </button>
                       <button
                         onClick={() => navigate(`/calendar?leadId=${encodeURIComponent(lead.id)}`)}
                         className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors shadow-sm"
                       >
                         Agendar
                       </button>
                       <button className="p-1.5 text-white/30 hover:text-white transition-colors">
                         <MoreHorizontal className="w-4 h-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
