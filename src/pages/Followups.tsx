import { useState, useEffect, useMemo } from "react";
import { Clock, CheckSquare, AlertCircle, PlayCircle, MoreHorizontal, Sparkles, Send } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { PremiumButton } from "../components/premium/PremiumButton";
import { cn } from "../lib/utils";

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/**
 * Followups Page: Operational queue for patient re-engagement and overdue tasks.
 */
export default function Followups() {
  const supabase = useMemo(() => createClient(), []);
  const [atrasados, setAtrasados] = useState<any[]>([]);
  const [paraHoje, setParaHoje] = useState<any[]>([]);
  const [proximos, setProximos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchFollowups() {
      let { data, error } = await supabase.from('leads').select('*').order('next_followup_at', { ascending: true, nullsFirst: false });
      if (error) {
        const legacy = await supabase.from('Usuarios').select('*').order('created_at', { ascending: true });
        data = legacy.data ? legacy.data.map((u: any) => ({
          ...u,
          full_name: u.full_name || u.nome || '',
          phone: u.phone || u.telefone || '',
        })) : null;
      }

      const now = new Date();
      const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
      const overdues: any[] = []; const todays: any[] = []; const upcoming: any[] = [];

      for (const lead of data || []) {
        if (String(lead.conversation_status || '').toLowerCase() === 'encerrado') continue;
        const nextFollowup = lead.next_followup_at ? new Date(lead.next_followup_at) : null;
        if (nextFollowup && !Number.isNaN(nextFollowup.getTime())) {
          if (nextFollowup < now) overdues.push(lead);
          else if (nextFollowup <= endOfDay) todays.push(lead);
          else upcoming.push(lead);
          continue;
        }
        const lastInt = new Date(lead.last_human_interaction_at || lead.last_interaction_at || lead.created_at);
        const diffHours = (now.getTime() - lastInt.getTime()) / (1000 * 60 * 60);
        if (diffHours > 48) overdues.push(lead);
        else if (diffHours > 6) todays.push(lead);
      }
      setAtrasados(overdues); setParaHoje(todays); setProximos(upcoming.slice(0, 8));
      setLoading(false);
    }
    fetchFollowups();
  }, [supabase]);

  return (
    <div className="flex-1 overflow-y-auto p-5 lg:p-6 h-full w-full space-y-3 flex flex-col pb-10">
      
      {/* --- Compact Header --- */}
      <section className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div>
          <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] uppercase tracking-[0.2em] font-bold text-red-400 mb-1">
            <AlertCircle className="h-3 w-3 animate-pulse" />
            <span>{atrasados.length} Vencidos</span>
          </div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white font-display">Fila de <span className="italic font-light text-gold/80">Retornos</span> & Fidelização</h1>
          <p className="text-xs font-light text-white/30 mt-1">Priorização automática por tempo de inatividade.</p>
        </div>
      </section>

      {/* --- Priority Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        
        {/* Column 1: Overdue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">CRÍTICOS / VENCIDOS</h3>
            <span className="text-xs font-mono text-red-400 font-black bg-red-500/10 px-2 py-0.5 rounded-full">{atrasados.length}</span>
          </div>

          <div className="space-y-3">
            {atrasados.map((lead) => (
              <motion.div key={lead.id} whileHover={{ y: -2 }} className="bg-black-matte border border-red-500/20 p-4 rounded-xl shadow-lg relative overflow-hidden group">
                <h4 className="text-sm font-bold text-white mb-1 leading-tight group-hover:text-red-400 transition-colors">{lead.full_name || "Paciente"}</h4>
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-black mb-3">{lead.phone}</p>
                
                <div className="space-y-3">
                  <div className="bg-red-500/5 border border-red-500/10 p-3 rounded-xl">
                    <p className="text-[9px] uppercase tracking-[0.2em] font-black text-red-400/60 mb-1">Atraso Identificado</p>
                    <p className="text-xs font-mono text-red-400 font-bold">{lead.next_followup_at ? `Devia: ${formatDateTime(lead.next_followup_at)}` : "+48h sem resposta"}</p>
                  </div>
                  <PremiumButton onClick={() => navigate(`/conversations?leadId=${lead.id}`)} className="w-full py-3 text-[9px] bg-red-500/10 border-red-500/20 text-red-400 gold-gradient-none shadow-none hover:bg-red-500/20">RETOMAR AGORA</PremiumButton>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Column 2: Today */}
        <div className="space-y-3 animate-reveal-active" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.28em] text-white/20">PARA HOJE</h3>
            <span className="text-xs font-mono text-gold font-black bg-gold/10 px-2 py-0.5 rounded-full">{paraHoje.length}</span>
          </div>

          <div className="space-y-3">
            {paraHoje.map((lead) => (
              <motion.div key={lead.id} whileHover={{ y: -5 }} className="bg-black-matte border border-gold/20 p-4 rounded-xl shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity"><Clock className="h-10 w-10 text-gold" /></div>
                <h4 className="text-base font-display font-bold text-white mb-1 leading-tight group-hover:text-gold transition-colors">{lead.full_name || "Paciente"}</h4>
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-black mb-3">{lead.phone}</p>
                
                <div className="space-y-3">
                  <div className="bg-gold/5 border border-gold/10 p-3 rounded-xl">
                    <p className="text-[9px] uppercase tracking-[0.2em] font-black text-gold/60 mb-1">Horário Sugerido</p>
                    <p className="text-xs font-mono text-gold font-bold">{lead.next_followup_at ? new Date(lead.next_followup_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Intervenção Manual"}</p>
                  </div>
                  <PremiumButton onClick={() => navigate(`/conversations?leadId=${lead.id}`)} className="w-full py-3 text-[9px]">ATENDER PACIENTE</PremiumButton>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Column 3: Upcoming */}
        <div className="space-y-3 animate-reveal-active" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.28em] text-white/20">PLANEJADOS</h3>
          </div>

          <div className="space-y-3">
            {proximos.map((lead) => (
              <motion.div 
                key={lead.id} 
                onClick={() => navigate(`/conversations?leadId=${lead.id}`)}
                className="bg-white/[0.01] border border-white/5 p-4 rounded-xl hover:border-gold/20 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div>
                  <h5 className="font-display font-bold text-white text-sm group-hover:text-gold transition-colors">{lead.full_name || "Paciente"}</h5>
                  <p className="text-[9px] text-gold/60 font-mono font-bold uppercase tracking-widest mt-1">Dia {formatDateTime(lead.next_followup_at).split(' ')[0]}</p>
                </div>
                <Send className="h-4 w-4 text-white/10 group-hover:text-gold transition-all" />
              </motion.div>
            ))}
            {proximos.length === 0 && <p className="text-center py-10 text-[9px] font-black uppercase tracking-[0.4em] text-white/10">Sem retornos futuros</p>}
          </div>
        </div>

      </div>
    </div>
  );
}
