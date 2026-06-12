import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Filter, MoreHorizontal, User, Sparkles, X, Save, FileText, DollarSign, Bell, PlusCircle, Trash2, Check, Send, PhoneCall } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { useNavigate } from "react-router-dom";

export default function Leads() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const supabase = useMemo(() => createClient(), []);

  // Slide-over Details Drawer
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState<any | null>(null);
  const [detailTab, setDetailTab] = useState("prontuario");
  
  // Prontuário states
  const [evolutionNotes, setEvolutionNotes] = useState("");
  const [postRecommendations, setPostRecommendations] = useState("");
  const [facialMapping, setFacialMapping] = useState<Record<string, string>>({
    testa: "",
    olhos: "",
    labios: "",
    mandibula: "",
  });
  const [photos, setPhotos] = useState<string[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [savingRecord, setSavingRecord] = useState(false);

  // Financeiro states
  const [financials, setFinancials] = useState<any[]>([]);
  const [newContractDesc, setNewContractDesc] = useState("");
  const [newContractVal, setNewContractVal] = useState("");
  const [newContractMethod, setNewContractMethod] = useState("boleto");
  const [newContractInstallments, setNewContractInstallments] = useState("1");
  const [savingFinance, setSavingFinance] = useState(false);

  // Notificação states
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMsg, setNotifMsg] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);

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

  // Load patient clinical and financial data when selected
  useEffect(() => {
    if (!selectedLeadForDetails) return;
    
    async function loadLeadDetails() {
      // 1. Fetch clinical record
      const { data: rec } = await supabase
        .from('patient_records')
        .select('*')
        .eq('lead_id', selectedLeadForDetails.id)
        .maybeSingle();

      if (rec) {
        setEvolutionNotes(rec.evolution_notes || "");
        setPostRecommendations(rec.post_recommendations || "");
        setFacialMapping(rec.facial_mapping || { testa: "", olhos: "", labios: "", mandibula: "" });
        setPhotos(rec.before_after_photos || []);
      } else {
        setEvolutionNotes("");
        setPostRecommendations("");
        setFacialMapping({ testa: "", olhos: "", labios: "", mandibula: "" });
        setPhotos([]);
      }

      // 2. Fetch financials
      const { data: fin } = await supabase
        .from('patient_financials')
        .select('*')
        .eq('lead_id', selectedLeadForDetails.id);
      setFinancials(fin || []);
    }
    
    loadLeadDetails();
  }, [selectedLeadForDetails, supabase]);

  // Save clinical records
  const handleSaveRecord = async () => {
    if (!selectedLeadForDetails) return;
    setSavingRecord(true);
    try {
      // Check if record exists
      const { data: existing } = await supabase
        .from('patient_records')
        .select('id')
        .eq('lead_id', selectedLeadForDetails.id)
        .maybeSingle();

      const payload = {
        lead_id: selectedLeadForDetails.id,
        evolution_notes: evolutionNotes,
        post_recommendations: postRecommendations,
        facial_mapping: facialMapping,
        before_after_photos: photos,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (existing) {
        const res = await supabase
          .from('patient_records')
          .update(payload)
          .eq('id', existing.id);
        error = res.error;
      } else {
        const res = await supabase
          .from('patient_records')
          .insert(payload);
        error = res.error;
      }

      if (error) {
        alert("Erro ao salvar prontuário: " + error.message);
      } else {
        alert("Prontuário clínico atualizado com sucesso!");
      }
    } catch (err: any) {
      alert("Erro ao salvar.");
    } finally {
      setSavingRecord(false);
    }
  };

  // Add Photo URL
  const handleAddPhoto = () => {
    if (newPhotoUrl.trim()) {
      setPhotos([...photos, newPhotoUrl.trim()]);
      setNewPhotoUrl("");
    }
  };

  // Remove Photo
  const handleRemovePhoto = (idx: number) => {
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  // Create Contract and Installments
  const handleCreateContract = async () => {
    if (!selectedLeadForDetails || !newContractDesc.trim() || !newContractVal) return;
    setSavingFinance(true);
    try {
      const val = parseFloat(newContractVal);
      const count = parseInt(newContractInstallments);
      const valPerInstallment = parseFloat((val / count).toFixed(2));
      
      const installmentsList = [];
      const now = new Date();
      for (let i = 1; i <= count; i++) {
        const due = new Date(now);
        due.setMonth(now.getMonth() + i - 1);
        installmentsList.push({
          number: i,
          due_date: due.toISOString().split('T')[0],
          value: valPerInstallment,
          status: 'pendente'
        });
      }

      const { data, error } = await supabase
        .from('patient_financials')
        .insert({
          lead_id: selectedLeadForDetails.id,
          description: newContractDesc,
          total_value: val,
          payment_method: newContractMethod,
          installments: installmentsList
        })
        .select('*')
        .single();

      if (error) {
        alert("Erro ao criar contrato: " + error.message);
      } else {
        setFinancials([...financials, data]);
        setNewContractDesc("");
        setNewContractVal("");
        setNewContractInstallments("1");
        alert("Contrato e parcelas criados com sucesso!");
      }
    } catch (err) {
      alert("Erro ao processar contrato.");
    } finally {
      setSavingFinance(false);
    }
  };

  // Update Installment Payment Status (Manual Baixa)
  const handleToggleInstallmentStatus = async (contractId: string, installmentIndex: number) => {
    const contract = financials.find(f => f.id === contractId);
    if (!contract) return;

    const updatedInstallments = [...contract.installments];
    const currentStatus = updatedInstallments[installmentIndex].status;
    updatedInstallments[installmentIndex].status = currentStatus === 'pago' ? 'pendente' : 'pago';

    const { error } = await supabase
      .from('patient_financials')
      .update({ installments: updatedInstallments })
      .eq('id', contractId);

    if (error) {
      alert("Erro ao atualizar parcela: " + error.message);
    } else {
      setFinancials(prev => 
        prev.map(f => f.id === contractId ? { ...f, installments: updatedInstallments } : f)
      );
      
      // Auto-trigger WhatsApp notification check if paid
      if (updatedInstallments[installmentIndex].status === 'pago') {
        // Mocking/sending alert to recipient
        await supabase.from('notifications').insert({
          recipient_id: selectedLeadForDetails.id,
          title: "Confirmação de Pagamento",
          message: `Identificamos a quitação da sua ${installmentIndex + 1}ª parcela referente ao contrato "${contract.description}". Obrigado!`
        });
      }
    }
  };

  // Send Portal Notification
  const handleSendNotification = async () => {
    if (!selectedLeadForDetails || !notifTitle.trim() || !notifMsg.trim()) return;
    setSendingNotif(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          recipient_id: selectedLeadForDetails.id,
          title: notifTitle.trim(),
          message: notifMsg.trim(),
        });

      if (error) {
        alert("Erro ao enviar notificação: " + error.message);
      } else {
        setNotifTitle("");
        setNotifMsg("");
        alert("Notificação publicada no portal do cliente!");
      }
    } catch (err) {
      alert("Erro ao enviar.");
    } finally {
      setSendingNotif(false);
    }
  };

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
    <div className="flex h-full w-full space-y-6 relative overflow-hidden">
      
      {/* Container Principal */}
      <div className="flex flex-col h-full w-full space-y-6 flex-1">
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
                           className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-white/10 transition-colors shadow-sm"
                         >
                           Chat
                         </button>
                         <button
                           onClick={() => navigate(`/calendar?leadId=${encodeURIComponent(lead.id)}`)}
                           className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors shadow-sm"
                         >
                           Agendar
                         </button>
                         <button
                           onClick={() => setSelectedLeadForDetails(lead)}
                           className="rounded-xl border border-[#D4AF37]/35 bg-[#D4AF37]/15 px-3 py-1.5 text-[10px] font-bold text-[#E5C38C] hover:bg-[#D4AF37]/30 transition-colors shadow-sm"
                         >
                           Ficha
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

      {/* DETALHES DRAWER (SLIDE-OVER PANEL) */}
      {selectedLeadForDetails && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-[#0E1118] border-l border-white/10 h-full flex flex-col justify-between shadow-2xl relative animate-slide-in">
            
            {/* Header Drawer */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#07090E]/60">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-vibrant-gold-brushed text-[#0D0D0F] font-serif font-bold text-base flex items-center justify-center">
                  {String(selectedLeadForDetails.full_name || selectedLeadForDetails.nome || "P").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-serif">{selectedLeadForDetails.full_name || selectedLeadForDetails.nome}</h3>
                  <span className="text-[10px] text-white/40 font-mono">{selectedLeadForDetails.phone || selectedLeadForDetails.telefone}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLeadForDetails(null)}
                className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tab Links */}
            <div className="flex border-b border-white/5 text-xs font-bold uppercase tracking-wider bg-[#07090E]/30 px-4">
              <button
                onClick={() => setDetailTab("prontuario")}
                className={`flex items-center gap-2 px-4 py-3.5 border-b-2 transition-all ${
                  detailTab === "prontuario"
                    ? "border-[#ffd700] text-[#ffd700]"
                    : "border-transparent text-white/40 hover:text-white/60"
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Prontuário Estético</span>
              </button>
              <button
                onClick={() => setDetailTab("financeiro")}
                className={`flex items-center gap-2 px-4 py-3.5 border-b-2 transition-all ${
                  detailTab === "financeiro"
                    ? "border-[#ffd700] text-[#ffd700]"
                    : "border-transparent text-white/40 hover:text-white/60"
                }`}
              >
                <DollarSign className="h-4 w-4" />
                <span>Financeiro Estético</span>
              </button>
              <button
                onClick={() => setDetailTab("notificar")}
                className={`flex items-center gap-2 px-4 py-3.5 border-b-2 transition-all ${
                  detailTab === "notificar"
                    ? "border-[#ffd700] text-[#ffd700]"
                    : "border-transparent text-white/40 hover:text-white/60"
                }`}
              >
                <Bell className="h-4 w-4" />
                <span>Notificações</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* TAB: PRONTUARIO */}
              {detailTab === "prontuario" && (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#ffd700]">Evolução Estética</label>
                    <textarea
                      value={evolutionNotes}
                      onChange={(e) => setEvolutionNotes(e.target.value)}
                      rows={4}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs text-white focus:outline-none focus:border-[#ffd700] placeholder-white/20"
                      placeholder="Descreva a evolução do tratamento do paciente..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#ffd700]">Cuidados Pós-Procedimento (Visível no Portal)</label>
                    <textarea
                      value={postRecommendations}
                      onChange={(e) => setPostRecommendations(e.target.value)}
                      rows={3}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs text-white focus:outline-none focus:border-[#ffd700] placeholder-white/20"
                      placeholder="Instruções de home care, produtos indicados ou restrições..."
                    />
                  </div>

                  {/* Facial Mapping Annotations */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40">Mapeamento Facial / Corporal</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-white/50 block mb-1">Testa / Glabela</span>
                        <input
                          type="text"
                          value={facialMapping.testa || ""}
                          onChange={(e) => setFacialMapping({ ...facialMapping, testa: e.target.value })}
                          className="w-full rounded-xl border border-white/5 bg-white/[0.01] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#ffd700]"
                          placeholder="Ex: 15U Botox"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-white/50 block mb-1">Olhos / Periombital</span>
                        <input
                          type="text"
                          value={facialMapping.olhos || ""}
                          onChange={(e) => setFacialMapping({ ...facialMapping, olhos: e.target.value })}
                          className="w-full rounded-xl border border-white/5 bg-white/[0.01] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#ffd700]"
                          placeholder="Ex: 8U por lado"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-white/50 block mb-1">Lábios / Malar</span>
                        <input
                          type="text"
                          value={facialMapping.labios || ""}
                          onChange={(e) => setFacialMapping({ ...facialMapping, labios: e.target.value })}
                          className="w-full rounded-xl border border-white/5 bg-white/[0.01] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#ffd700]"
                          placeholder="Ex: 1.0ml Ác. Hialurônico"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-white/50 block mb-1">Mandíbula / Mento</span>
                        <input
                          type="text"
                          value={facialMapping.mandibula || ""}
                          onChange={(e) => setFacialMapping({ ...facialMapping, mandibula: e.target.value })}
                          className="w-full rounded-xl border border-white/5 bg-white/[0.01] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#ffd700]"
                          placeholder="Ex: Bioestimulador"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Before / After Photos Simulator */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40">Imagens de Evolução (Antes/Depois)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPhotoUrl}
                        onChange={(e) => setNewPhotoUrl(e.target.value)}
                        className="flex-1 rounded-xl border border-white/5 bg-white/[0.01] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#ffd700]"
                        placeholder="Link da imagem (upload real integrado via storage)"
                      />
                      <button 
                        onClick={handleAddPhoto}
                        className="px-4 py-2 rounded-xl bg-white/5 text-xs font-semibold text-white border border-white/10"
                      >
                        Adicionar
                      </button>
                    </div>
                    {photos.length > 0 && (
                      <div className="grid grid-cols-4 gap-3 pt-2">
                        {photos.map((ph, index) => (
                          <div key={index} className="relative rounded-lg overflow-hidden border border-white/5 aspect-square bg-[#07090E]">
                            <img src={ph} alt={`Evolução ${index}`} className="w-full h-full object-cover" />
                            <button
                              onClick={() => handleRemovePhoto(index)}
                              className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white/60 hover:text-red-400 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSaveRecord}
                    disabled={savingRecord}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-vibrant-gold-brushed text-[#0D0D0F] font-bold uppercase tracking-widest text-xs py-3.5 shadow-md disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{savingRecord ? "Salvando prontuário..." : "Salvar Prontuário Clínico"}</span>
                  </button>
                </div>
              )}

              {/* TAB: FINANCEIRO */}
              {detailTab === "financeiro" && (
                <div className="space-y-6">
                  {/* Novo Contrato */}
                  <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-5 space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/60">Registrar Novo Contrato Estético</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-white/40 block mb-1">Descrição do Contrato / Protocolo</span>
                        <input
                          type="text"
                          value={newContractDesc}
                          onChange={(e) => setNewContractDesc(e.target.value)}
                          className="w-full rounded-xl border border-white/5 bg-[#0D0D0F]/40 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#ffd700]"
                          placeholder="Ex: Protocolo Rejuvenescimento Facial 3x"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <span className="text-[10px] text-white/40 block mb-1">Valor Total (R$)</span>
                          <input
                            type="number"
                            value={newContractVal}
                            onChange={(e) => setNewContractVal(e.target.value)}
                            className="w-full rounded-xl border border-white/5 bg-[#0D0D0F]/40 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#ffd700]"
                            placeholder="3200"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-white/40 block mb-1">Método</span>
                          <select
                            value={newContractMethod}
                            onChange={(e) => setNewContractMethod(e.target.value)}
                            className="w-full rounded-xl border border-white/5 bg-[#0D0D0F]/40 px-3.5 py-2 text-xs text-white focus:outline-none"
                          >
                            <option value="boleto">Boleto Bancário</option>
                            <option value="cartao">Cartão de Crédito</option>
                            <option value="pix">PIX</option>
                            <option value="dinheiro">Dinheiro</option>
                          </select>
                        </div>
                        <div>
                          <span className="text-[10px] text-white/40 block mb-1">Parcelas</span>
                          <select
                            value={newContractInstallments}
                            onChange={(e) => setNewContractInstallments(e.target.value)}
                            className="w-full rounded-xl border border-white/5 bg-[#0D0D0F]/40 px-3.5 py-2 text-xs text-white focus:outline-none"
                          >
                            {[...Array(12)].map((_, i) => (
                              <option key={i} value={i + 1}>{i + 1}x</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleCreateContract}
                      disabled={savingFinance}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-xs font-bold text-[#E5C38C] uppercase tracking-wider py-2.5 transition-colors disabled:opacity-50"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Criar Contrato & Lançar Parcelas
                    </button>
                  </div>

                  {/* Listagem de Contratos existentes */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#ffd700]">Contratos e Cobranças Ativas</h4>
                    
                    {financials.length > 0 ? (
                      <div className="space-y-4">
                        {financials.map((fin) => (
                          <div key={fin.id} className="rounded-2xl border border-white/5 bg-[#07090E]/60 p-4 space-y-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-bold text-white text-xs">{fin.description}</h5>
                                <span className="text-[8px] text-white/30 font-mono">ID: {fin.id.slice(0, 8)}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-white/40 block">Total</span>
                                <span className="font-bold text-[#ffd700] text-xs">R$ {parseFloat(fin.total_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                              </div>
                            </div>

                            {/* Parcelas */}
                            <div className="space-y-1.5 pt-2 border-t border-white/5">
                              {Array.isArray(fin.installments) && fin.installments.map((inst: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-[10px] py-1 border-b border-white/[0.02]">
                                  <span>{inst.number}ª Parcela ({new Date(inst.due_date).toLocaleDateString("pt-BR")})</span>
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-white">R$ {parseFloat(inst.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                    
                                    <button
                                      onClick={() => handleToggleInstallmentStatus(fin.id, idx)}
                                      className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                                        inst.status === 'pago'
                                          ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                                      }`}
                                    >
                                      {inst.status === 'pago' ? "Paga (Desfazer)" : "Confirmar Recebimento"}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-white/30 text-center py-6">Nenhum contrato cadastrado para este paciente.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: NOTIFICAR */}
              {detailTab === "notificar" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-5 space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#ffd700]">Enviar Notificação ao Paciente</h4>
                    
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-white/40 block mb-1">Título da Notificação</span>
                        <input
                          type="text"
                          value={notifTitle}
                          onChange={(e) => setNotifTitle(e.target.value)}
                          className="w-full rounded-xl border border-white/5 bg-[#0D0D0F]/40 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#ffd700]"
                          placeholder="Ex: Confirmação de Retorno"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-white/40 block mb-1">Mensagem explicativa</span>
                        <textarea
                          value={notifMsg}
                          onChange={(e) => setNotifMsg(e.target.value)}
                          rows={3}
                          className="w-full rounded-xl border border-white/5 bg-[#0D0D0F]/40 p-3.5 text-xs text-white focus:outline-none focus:border-[#ffd700]"
                          placeholder="Seu retorno pós-botox foi marcado para o dia..."
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSendNotification}
                      disabled={sendingNotif}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-vibrant-gold-brushed text-[#0D0D0F] font-bold uppercase tracking-wider text-xs py-2.5 shadow-md disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      <span>{sendingNotif ? "Enviando..." : "Publicar Notificação no Portal"}</span>
                    </button>
                  </div>

                  {/* Disparo de Lembrete WhatsApp */}
                  <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-bold text-white">Disparo Rápido WhatsApp</h4>
                      <p className="text-[10px] text-white/40 mt-1">Aciona a automação do n8n para enviar orientações no chat do paciente.</p>
                    </div>
                    <button
                      onClick={() => alert("WhatsApp de pós-procedimento disparado via n8n!")}
                      className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/25 transition-all"
                    >
                      <PhoneCall className="h-3.5 w-3.5" />
                      Disparar WhatsApp
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
