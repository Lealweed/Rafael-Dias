import { useState, useEffect, useMemo } from "react";
import { Clock, AlertCircle, Send } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { PremiumButton } from "../components/premium/PremiumButton";

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
    <div className="flex-1 overflow-y-auto p-4 lg:p-5 h-full w-full space-y-3 flex flex-col pb-8">
      {/* Header */}
      <section className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[8px] uppercase tracking-[0.16em] font-bold text-red-400 mb-1">
            <AlertCircle className="h-2.5 w-2.5 animate-pulse" />
            <span>{atrasados.length} vencidos</span>
          </div>
          <h1 className="text-lg lg:text-xl font-bold tracking-tight text-white font-display">Fila de <span className="italic font-light text-gold/80">Retornos</span></h1>
          <p className="text-[10px] font-light text-white/30 mt-0.5">Priorização automática por tempo de inatividade.</p>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">Críticos</h3>
            <span className="text-[10px] font-mono text-red-400 font-black bg-red-500/10 px-1.5 py-0.5 rounded-full">{atrasados.length}</span>
          </div>

          <div className="space-y-2">
            {atrasados.map((lead) => (
              <motion.div key={lead.id} whileHover={{ y: -1 }} className="bg-black-matte border border-red-500/20 p-3 rounded-lg shadow-md relative overflow-hidden group">
                <h4 className="text-xs font-bold text-white mb-0.5 leading-tight group-hover:text-red-400 transition-colors">{lead.full_name || "Paciente"}</h4>
                <p className="text-[8px] uppercase tracking-[0.16em] text-white/30 font-black mb-2">{lead.phone}</p>

                <div className="space-y-2">
                  <div className="bg-red-500/5 border border-red-500/10 p-2 rounded-lg">
                    <p className="text-[7px] uppercase tracking-[0.16em] font-black text-red-400/60 mb-0.5">Atraso</p>
                    <p className="text-[10px] font-mono text-red-400 font-bold">{lead.next_followup_at ? `Devia: ${formatDateTime(lead.next_followup_at)}` : "+48h sem resposta"}</p>
                  </div>
                  <PremiumButton onClick={() => navigate(`/conversations?leadId=${lead.id}`)} className="w-full py-2 text-[8px] bg-red-500/10 border-red-500/20 text-red-400 gold-gradient-none shadow-none hover:bg-red-500/20">Retomar</PremiumButton>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-2.5 animate-reveal-active" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">Hoje</h3>
            <span className="text-[10px] font-mono text-gold font-black bg-gold/10 px-1.5 py-0.5 rounded-full">{paraHoje.length}</span>
          </div>

          <div className="space-y-2">
            {paraHoje.map((lead) => (
              <motion.div key={lead.id} whileHover={{ y: -2 }} className="bg-black-matte border border-gold/20 p-3 rounded-lg shadow-md relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-10 transition-opacity"><Clock className="h-8 w-8 text-gold" /></div>
                <h4 className="text-xs font-display font-bold text-white mb-0.5 leading-tight group-hover:text-gold transition-colors">{lead.full_name || "Paciente"}</h4>
                <p className="text-[8px] uppercase tracking-[0.16em] text-white/30 font-black mb-2">{lead.phone}</p>

                <div className="space-y-2">
                  <div className="bg-gold/5 border border-gold/10 p-2 rounded-lg">
                    <p className="text-[7px] uppercase tracking-[0.16em] font-black text-gold/60 mb-0.5">Horário</p>
                    <p className="text-[10px] font-mono text-gold font-bold">{lead.next_followup_at ? new Date(lead.next_followup_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Intervenção manual"}</p>
                  </div>
                  <PremiumButton onClick={() => navigate(`/conversations?leadId=${lead.id}`)} className="w-full py-2 text-[8px]">Atender</PremiumButton>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-2.5 animate-reveal-active" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-[8px] font-black uppercase tracking-[0.2em] text-white/20">Planejados</h3>
          </div>

          <div className="space-y-2">
            {proximos.map((lead) => (
              <motion.div
                key={lead.id}
                whileHover={{ y: -1 }}
                onClick={() => navigate(`/conversations?leadId=${lead.id}`)}
                className="bg-white/[0.01] border border-white/5 p-3 rounded-lg hover:border-gold/20 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="min-w-0">
                  <h5 className="font-display font-bold text-white text-xs truncate group-hover:text-gold transition-colors">{lead.full_name || "Paciente"}</h5>
                  <p className="text-[8px] text-gold/60 font-mono font-bold uppercase tracking-wider mt-0.5">Dia {formatDateTime(lead.next_followup_at).split(' ')[0]}</p>
                </div>
                <Send className="h-3 w-3 text-white/10 group-hover:text-gold transition-all shrink-0" />
              </motion.div>
            ))}
            {proximos.length === 0 && <p className="text-center py-8 text-[8px] font-black uppercase tracking-[0.3em] text-white/10">Sem retornos futuros</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
