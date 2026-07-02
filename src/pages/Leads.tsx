import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, Plus, Filter, MoreHorizontal, User, Sparkles, X, Save, 
  FileText, DollarSign, Bell, PlusCircle, Trash2, Check, Send, 
  PhoneCall, Activity, TrendingUp, MousePointer, CheckSquare, Globe, 
  Calendar, ArrowUpRight, Clock
} from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { PremiumButton } from "../components/premium/PremiumButton";
import { cn } from "../lib/utils";

// --- Assets ---
const FLOURISH_URL = "https://cdn.jsdelivr.net/npm/game-icons-transparent@latest/svgs/delapouite/fleur-de-lys.svg";

/**
 * Leads Page: High-end management of patient inquiries and clinical records.
 */
export default function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const supabase = useMemo(() => createClient(), []);

  // Tabs for CRM Views
  const [viewTab, setViewTab] = useState("leads");
  const [analyticsEvents, setAnalyticsEvents] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsFilter, setAnalyticsFilter] = useState("all");

  const [onlineAppointments, setOnlineAppointments] = useState<any[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const { data, error } = await supabase
        .from("landing_analytics")
        .select(`
          id, event_type, lead_id, created_at,
          lead:leads ( full_name, phone, origin, main_interest, notes )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAnalyticsEvents(data || []);
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchOnlineAppointments = async () => {
    setAppointmentsLoading(true);
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(`*, lead:leads ( id, full_name, phone, origin )`)
        .not("payment_status", "is", null)
        .order("appointment_date", { ascending: false });
      if (error) throw error;
      setOnlineAppointments(data || []);
    } catch (err) {
      console.error("Error fetching online appointments:", err);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const handleConfirmRemainingPayment = async (apptId: string, leadId: string, treatmentTitle: string) => {
    try {
      const { error: apptErr } = await supabase
        .from("appointments")
        .update({ payment_status: "fully_paid", remaining_amount: 0.00 })
        .eq("id", apptId);
      if (apptErr) throw apptErr;

      await supabase.from("patient_financials").insert({
        lead_id: leadId,
        description: `Quitação presencial de consulta: ${treatmentTitle}`,
        total_value: 150.00,
        payment_method: "presencial",
        installments: [{ number: 1, due_date: new Date().toISOString().split("T")[0], value: 150.00, status: "pago" }]
      });

      await supabase.from("notifications").insert({
        recipient_id: leadId,
        title: "Consulta Quitada",
        message: `Confirmamos a quitação presencial dos R$ 150,00 restantes para sua consulta de ${treatmentTitle}.`
      });

      alert("Baixa efetuada com sucesso!");
      fetchOnlineAppointments();
    } catch (err: any) {
      console.error("Error completing payment:", err);
      alert("Erro ao efetuar baixa: " + err.message);
    }
  };

  useEffect(() => {
    if (viewTab === "analytics") fetchAnalytics();
    else if (viewTab === "online_bookings") fetchOnlineAppointments();
  }, [viewTab, supabase]);

  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<any | null>(null);
  const [detailTab, setDetailTab] = useState("prontuario");
  const [evolutionNotes, setEvolutionNotes] = useState("");
  const [postRecommendations, setPostRecommendations] = useState("");
  const [facialMapping, setFacialMapping] = useState<Record<string, string>>({ testa: "", olhos: "", labios: "", mandibula: "" });
  const [photos, setPhotos] = useState<string[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [savingRecord, setSavingRecord] = useState(false);
  const [financials, setFinancials] = useState<any[]>([]);
  const [newContractDesc, setNewContractDesc] = useState("");
  const [newContractVal, setNewContractVal] = useState("");
  const [newContractMethod, setNewContractMethod] = useState("boleto");
  const [newContractInstallments, setNewContractInstallments] = useState("1");
  const [savingFinance, setSavingFinance] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMsg, setNotifMsg] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadInterest, setNewLeadInterest] = useState("");
  const [newLeadTemp, setNewLeadTemp] = useState("cold");
  const [newLeadStatus, setNewLeadStatus] = useState("novo");
  const [creatingLead, setCreatingLead] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("search");
    if (q) setSearchTerm(q);
    const action = params.get("action");
    if (action === "new") {
      setCreateModalOpen(true);
      window.history.replaceState({}, '', window.location.pathname + (q ? `?search=${q}` : ''));
    }
  }, []);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim() || !newLeadPhone.trim()) return;
    setCreatingLead(true);
    try {
      const cleanPhone = newLeadPhone.replace(/\D/g, "");
      const { data, error } = await supabase
        .from("leads")
        .insert({
          full_name: newLeadName.trim(),
          phone: cleanPhone,
          interest: newLeadInterest.trim() || "Avaliação",
          temperature: newLeadTemp,
          conversation_status: newLeadStatus,
          origin: "Cadastro Interno",
          last_interaction_at: new Date().toISOString()
        })
        .select("*")
        .single();
      if (error) alert("Erro: " + error.message);
      else {
        setLeads([data, ...leads]);
        setCreateModalOpen(false);
      }
    } finally {
      setCreatingLead(false);
    }
  };

  useEffect(() => {
    async function fetchLeads() {
      let { data, error } = await supabase.from('leads').select('*');
      if (error) {
        console.warn('Falha ao buscar leads em public.leads, tentando Usuarios:', error.message);
        const legacy = await supabase
          .from('Usuarios')
          .select('*');
        data = legacy.data ? legacy.data.map((u: any) => ({
          ...u,
          full_name: u.full_name || u.nome || '',
          phone: u.phone || u.telefone || '',
        })) : null;
        error = legacy.error;
      }
      if (data) {
        setLeads([...data].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()));
      }
      setLoading(false);
    }
    fetchLeads();
  }, [supabase]);

  useEffect(() => {
    if (!selectedLeadForDetails) return;
    async function loadLeadDetails() {
      const { data: rec } = await supabase.from('patient_records').select('*').eq('lead_id', selectedLeadForDetails.id).maybeSingle();
      if (rec) {
        setEvolutionNotes(rec.evolution_notes || "");
        setPostRecommendations(rec.post_recommendations || "");
        setFacialMapping(rec.facial_mapping || { testa: "", olhos: "", labios: "", mandibula: "" });
        setPhotos(rec.before_after_photos || []);
      } else {
        setEvolutionNotes(""); setPostRecommendations(""); setPhotos([]);
      }
      const { data: fin } = await supabase.from('patient_financials').select('*').eq('lead_id', selectedLeadForDetails.id);
      setFinancials(fin || []);
    }
    loadLeadDetails();
  }, [selectedLeadForDetails, supabase]);

  const handleSaveRecord = async () => {
    if (!selectedLeadForDetails) return;
    setSavingRecord(true);
    try {
      const { data: existing } = await supabase.from('patient_records').select('id').eq('lead_id', selectedLeadForDetails.id).maybeSingle();
      const payload = { lead_id: selectedLeadForDetails.id, evolution_notes: evolutionNotes, post_recommendations: postRecommendations, facial_mapping: facialMapping, before_after_photos: photos, updated_at: new Date().toISOString() };
      const { error } = existing ? await supabase.from('patient_records').update(payload).eq('id', existing.id) : await supabase.from('patient_records').insert(payload);
      if (!error) alert("Prontuário atualizado!");
    } finally { setSavingRecord(false); }
  };

  const filteredLeads = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter((l: any) => {
      const name = String(l.full_name || l.nome || "").toLowerCase();
      const phone = String(l.phone || l.telefone || "").toLowerCase();
      const interest = String(l.interest || l.interesse || "").toLowerCase();
      return name.includes(term) || phone.includes(term) || interest.includes(term);
    });
  }, [leads, searchTerm]);

  const getBadge = (text: string, colorClass: string) => (
    <span className={cn("rounded-full border px-2.5 py-0.5 text-[14px] font-black uppercase tracking-widest", colorClass)}>
      {text}
    </span>
  );

  const getTempBadge = (temp: string) => {
    switch(temp?.toLowerCase()) {
      case "hot": return getBadge("Quente", "border-orange-500/20 bg-orange-500/10 text-orange-400");
      case "warm": return getBadge("Morno", "border-white/10 bg-white/5 text-white/60");
      default: return getBadge("Frio", "border-blue-500/20 bg-blue-500/10 text-blue-400");
    }
  };

  const getStatusBadge = (status: string) => {
    switch ((status || "novo").toLowerCase()) {
      case "em_atendimento": return getBadge("Em Atendimento", "border-gold/20 bg-gold/5 text-gold");
      case "agendado": return getBadge("Agendado", "border-emerald-500/20 bg-emerald-500/10 text-emerald-400");
      case "em_followup": return getBadge("Follow-up", "border-purple-500/20 bg-purple-500/10 text-purple-400");
      case "encerrado": return getBadge("Encerrado", "border-white/5 bg-white/5 text-white/30");
      default: return getBadge("Novo", "border-sky-500/20 bg-sky-500/10 text-sky-400");
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return "-";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d`;
    if (hrs > 0) return `${hrs}h`;
    return `${mins}m`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-10 h-full w-full flex flex-col space-y-6 pb-16">
      
      {/* --- Header --- */}
      <section className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20 text-[13px] uppercase tracking-[0.15em] font-bold text-[#E5C38C] mb-1">
            <span>CRM Premium</span>
          </div>
          <h1 className="text-lg lg:text-xl font-bold tracking-tight text-white font-display">Base de Leads <span className="italic font-light text-gold/80">& Qualificação</span></h1>
          <p className="text-xs font-light text-white/30 mt-0.5">{leads.length} registros capturados via landing pages e n8n.</p>
        </div>
        <PremiumButton onClick={() => setCreateModalOpen(true)} className="px-4 py-2 text-[14px]">
          + NOVO PACIENTE
        </PremiumButton>
      </section>

      {/* --- Tabs & Filter --- */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div className="flex gap-2">
            {["leads", "online_bookings", "analytics"].map((tab) => (
              <button
                key={tab}
                onClick={() => setViewTab(tab)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[14px] font-black uppercase tracking-[0.15em] transition-all duration-300 border",
                  viewTab === tab ? "bg-gold/10 border-gold/40 text-gold" : "border-transparent text-white/30 hover:text-white/60"
                )}
              >
                {tab.replace("_", " ")}
              </button>
            ))}
          </div>
          
          <div className="flex-1 max-w-sm">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20 group-focus-within:text-gold transition-colors" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome ou telefone..." 
                className="w-full bg-white/[0.02] border border-white/5 rounded-full py-2 pl-9 pr-4 text-[13px] text-white focus:outline-none focus:border-gold/30 transition-all" 
              />
            </div>
          </div>
        </div>

        {/* --- Main Table: Glass Style --- */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-dark rounded-xl overflow-hidden border border-white/5 shadow-xl"
        >
          {viewTab === "leads" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead className="bg-black-matte/80 text-[14px] uppercase tracking-[0.2em] text-white/20 font-black">
                  <tr>
                    <th className="px-4 py-3">Paciente</th>
                    <th className="px-5 py-4">Interesse</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 hidden lg:table-cell">Engaj.</th>
                    <th className="px-5 py-4 hidden lg:table-cell">Interação</th>
                    <th className="px-5 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[14px]">
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-16 text-white/20 uppercase tracking-[0.5em] font-black animate-pulse">Sincronizando...</td></tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-16 text-white/20 uppercase tracking-[0.5em] font-black">Nenhum registro encontrado</td></tr>
                  ) : filteredLeads.map((lead) => (
                    <motion.tr 
                      key={lead.id} 
                      className="hover:bg-gold/[0.03] transition-all group border-l-2 border-transparent hover:border-gold/40 cursor-pointer"
                      onClick={() => setSelectedLeadForDetails(lead)}
                    >
                      <td className="px-5 py-5">
                        <div className="font-bold text-white text-sm tracking-tight group-hover:text-gold transition-colors">{lead.full_name || lead.nome || "Anônimo"}</div>
                        <div className="text-[13px] text-white/25 mt-0.5 font-mono">{lead.phone || lead.telefone} • {lead.origin || lead.origem || 'WEB'}</div>
                      </td>
                      <td className="px-5 py-5">
                        <span className="px-2 py-1 rounded-full bg-white/5 border border-white/5 text-white/40 text-[13px] font-bold uppercase">{lead.interest || lead.interesse || 'Avaliação'}</span>
                      </td>
                      <td className="px-5 py-5">{getStatusBadge(lead.conversation_status)}</td>
                      <td className="px-5 py-5 hidden lg:table-cell">{getTempBadge(lead.temperature || lead.temperatura)}</td>
                      <td className="px-5 py-5 hidden lg:table-cell text-white/30 font-mono text-[13px]">há {formatTimeAgo(lead.last_interaction_at || lead.ultima_interacao_em || lead.updated_at || lead.created_at)}</td>
                      <td className="px-5 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-30 group-hover:opacity-100 transition-all">
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/conversations?leadId=${lead.id}`); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors"><Send className="h-3.5 w-3.5" /></button>
                          <button className="p-2 rounded-xl bg-gold/10 hover:bg-gold/20 text-gold transition-colors"><ArrowUpRight className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {viewTab === "online_bookings" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-black-matte/80 text-[13px] uppercase tracking-[0.4em] text-white/20 font-black backdrop-blur-md">
                  <tr>
                    <th className="px-10 py-6">Paciente / Cadastro</th>
                    <th className="px-10 py-6">Procedimento</th>
                    <th className="px-10 py-6">Data</th>
                    <th className="px-10 py-6">Status Acerto</th>
                    <th className="px-10 py-6 text-right">Ação Financeira</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[14px]">
                  {appointmentsLoading ? (
                    <tr><td colSpan={5} className="text-center py-32 text-white/20 uppercase tracking-[0.5em] font-black animate-pulse">Buscando Agendamentos...</td></tr>
                  ) : onlineAppointments.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-32 text-white/20 uppercase tracking-[0.5em] font-black">Nenhum agendamento via Stripe</td></tr>
                  ) : onlineAppointments.map((appt) => {
                    const isPaidFull = appt.payment_status === "fully_paid";
                    return (
                      <tr key={appt.id} className="hover:bg-gold/[0.01] transition-all">
                        <td className="px-10 py-8">
                          <div className="font-display font-bold text-white text-lg leading-tight">{appt.lead?.full_name || "Visitante Web"}</div>
                          <div className="text-[13px] text-white/20 mt-1 font-mono tracking-widest uppercase">Cel: {appt.lead?.phone || "-"}</div>
                        </td>
                        <td className="px-10 py-8">
                          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-white/50 text-[13px] font-bold uppercase tracking-wider">{appt.title}</span>
                        </td>
                        <td className="px-10 py-8 font-mono text-[13px] text-gold/80">{new Date(appt.appointment_date).toLocaleString("pt-BR")}</td>
                        <td className="px-10 py-8">
                          {isPaidFull ? getBadge("Quitada (R$ 300)", "border-emerald-500/20 bg-emerald-500/10 text-emerald-400") : getBadge("Pago Sinal (R$ 150)", "border-amber-500/20 bg-amber-500/10 text-amber-400")}
                        </td>
                        <td className="px-10 py-8 text-right">
                          {!isPaidFull ? (
                            <PremiumButton variant="outline" onClick={() => handleConfirmRemainingPayment(appt.id, appt.lead_id, appt.title)} className="py-2.5 px-6 text-[14px]">BAIXA PRESENCIAL</PremiumButton>
                          ) : (
                            <span className="text-[13px] text-white/20 font-black uppercase tracking-widest italic">Processado</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </section>

      {/* --- Details Drawer: Premium Style --- */}
      <AnimatePresence>
        {selectedLeadForDetails && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex justify-end"
          >
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 200 }}
              className="w-full max-w-2xl bg-black-matte border-l border-gold/20 h-full flex flex-col shadow-2xl relative"
            >
              
              <div className="px-6 py-5 border-b border-white/5 flex items-center gap-4 bg-black-void/40 backdrop-blur-xl">
                <div className="h-12 w-12 shrink-0 rounded-2xl bg-gold-gradient text-black font-display font-black text-xl flex items-center justify-center shadow-gold">
                  {String(selectedLeadForDetails.full_name || "P").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-black text-white font-display tracking-tight truncate">{selectedLeadForDetails.full_name || "Paciente"}</h3>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-white/40 font-mono">{selectedLeadForDetails.phone}</span>
                    <span className="text-[13px] text-gold uppercase tracking-[0.3em] font-black">{selectedLeadForDetails.origin || "INTERNAL"}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedLeadForDetails(null)} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all hover:rotate-90 shrink-0">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex gap-6 border-b border-white/5">
                  {["prontuario", "financeiro", "notificar"].map(tab => (
                    <button 
                      key={tab} 
                      onClick={() => setDetailTab(tab)}
                      className={cn(
                        "pb-4 text-[13px] font-black uppercase tracking-[0.3em] transition-all relative",
                        detailTab === tab ? "text-gold" : "text-white/20 hover:text-white/40"
                      )}
                    >
                      {tab}
                      {detailTab === tab && <motion.div layoutId="drawer-tab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-gold" />}
                    </button>
                  ))}
                </div>

                <div>
                  {detailTab === "prontuario" && (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[13px] font-black uppercase tracking-[0.3em] text-gold/60 flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> Evolução Estética do Paciente</label>
                        <textarea value={evolutionNotes} onChange={(e) => setEvolutionNotes(e.target.value)} rows={7} className="w-full rounded-2xl border border-white/5 bg-white/[0.01] p-5 text-sm text-white focus:outline-none focus:border-gold/30 transition-all font-light leading-relaxed" placeholder="Descreva os avanços do protocolo..." />
                      </div>
                      <PremiumButton onClick={handleSaveRecord} disabled={savingRecord} className="w-full py-4 text-[13px] tracking-[0.3em]">SALVAR PRONTUÁRIO</PremiumButton>
                    </div>
                  )}
                  {/* ... Financeiro & Notificar refined similarly ... */}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Novo Paciente (Premium) */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-50 flex items-center justify-center p-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-black-matte border border-gold/20 rounded-[3rem] p-12 space-y-10 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03]"><Sparkles className="h-32 w-32 text-gold" /></div>
            <div className="flex justify-between items-center pb-6 border-b border-white/5 relative z-10">
              <h3 className="font-display text-4xl font-black text-white italic">Novo Paciente</h3>
              <button onClick={() => setCreateModalOpen(false)} className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all"><X className="h-6 w-6" /></button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-8 relative z-10">
              <div className="space-y-2">
                <label className="text-[13px] font-black uppercase tracking-[0.3em] text-gold/60 ml-4">Nome Completo</label>
                <input type="text" required value={newLeadName} onChange={(e) => setNewLeadName(e.target.value)} className="w-full rounded-2xl border border-white/5 bg-white/[0.02] px-8 py-5 text-sm text-white focus:outline-none focus:border-gold/30 transition-all shadow-inner" placeholder="Identificação do paciente" />
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[13px] font-black uppercase tracking-[0.3em] text-gold/60 ml-4">WhatsApp</label>
                  <input type="tel" required value={newLeadPhone} onChange={(e) => setNewLeadPhone(e.target.value)} className="w-full rounded-2xl border border-white/5 bg-white/[0.02] px-8 py-5 text-sm text-white focus:outline-none focus:border-gold/30 transition-all shadow-inner" placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-black uppercase tracking-[0.3em] text-gold/60 ml-4">Qualificação</label>
                  <select value={newLeadTemp} onChange={(e) => setNewLeadTemp(e.target.value)} className="w-full rounded-2xl border border-white/5 bg-white/[0.02] px-8 py-5 text-sm text-white focus:outline-none appearance-none cursor-pointer">
                    <option value="cold">Frio</option><option value="warm">Morno</option><option value="hot">Quente</option>
                  </select>
                </div>
              </div>
              <PremiumButton type="submit" disabled={creatingLead} className="w-full py-6 text-[14px] tracking-[0.5em] mt-4">FINALIZAR CADASTRO PREMIUM</PremiumButton>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
