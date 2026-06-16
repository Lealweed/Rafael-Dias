import React, { useState, useEffect, useMemo } from "react";
import { Search, Plus, Filter, MoreHorizontal, User, Sparkles, X, Save, FileText, DollarSign, Bell, PlusCircle, Trash2, Check, Send, PhoneCall, ShieldAlert, CheckSquare, Square } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { useNavigate } from "react-router-dom";

export default function Patients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const supabase = useMemo(() => createClient(), []);

  // Slide-over Details Drawer
  const [selectedPatientForDetails, setSelectedPatientForDetails] = useState<any | null>(null);
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

  // Registration Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState("");
  const [newPatientPhone, setNewPatientPhone] = useState("");
  const [newPatientPassword, setNewPatientPassword] = useState("");
  const [newPatientInterest, setNewPatientInterest] = useState("");
  const [newPatientAllergies, setNewPatientAllergies] = useState("");
  const [newPatientActiveAccess, setNewPatientActiveAccess] = useState(true);
  const [newPatientCpf, setNewPatientCpf] = useState("");

  const handleCpfChange = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean.length <= 11) {
      let formatted = clean;
      if (clean.length > 3) {
        formatted = `${clean.slice(0, 3)}.${clean.slice(3)}`;
      }
      if (clean.length > 6) {
        formatted = `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
      }
      if (clean.length > 9) {
        formatted = `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
      }
      setNewPatientCpf(formatted);
    }
  };
  const [newPatientWhatsappReminders, setNewPatientWhatsappReminders] = useState(true);
  const [newPatientIsVip, setNewPatientIsVip] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);

  // Fetch only Patients (leads with portal password or active configs)
  const fetchPatients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .not('portal_password', 'is', null);

    if (error) {
      console.error('Erro ao buscar pacientes:', error);
      setPatients([]);
    } else if (data) {
      const sorted = [...data].sort((a: any, b: any) => {
        const da = new Date(a.created_at || a.updated_at || 0).getTime();
        const db = new Date(b.created_at || b.updated_at || 0).getTime();
        return db - da;
      });
      setPatients(sorted);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPatients();
  }, [supabase]);

  // Load patient clinical and financial data when selected
  useEffect(() => {
    if (!selectedPatientForDetails) return;
    
    async function loadPatientDetails() {
      // 1. Fetch clinical record
      const { data: rec } = await supabase
        .from('patient_records')
        .select('*')
        .eq('lead_id', selectedPatientForDetails.id)
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
        .eq('lead_id', selectedPatientForDetails.id);
      setFinancials(fin || []);
    }
    
    loadPatientDetails();
  }, [selectedPatientForDetails, supabase]);

  // Save clinical records
  const handleSaveRecord = async () => {
    if (!selectedPatientForDetails) return;
    setSavingRecord(true);
    try {
      const { data: existing } = await supabase
        .from('patient_records')
        .select('id')
        .eq('lead_id', selectedPatientForDetails.id)
        .maybeSingle();

      const payload = {
        lead_id: selectedPatientForDetails.id,
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

  const handleAddPhoto = () => {
    if (newPhotoUrl.trim()) {
      setPhotos([...photos, newPhotoUrl.trim()]);
      setNewPhotoUrl("");
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos(photos.filter((_, i) => i !== idx));
  };

  const handleCreateContract = async () => {
    if (!selectedPatientForDetails || !newContractDesc.trim() || !newContractVal) return;
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
          lead_id: selectedPatientForDetails.id,
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
      
      if (updatedInstallments[installmentIndex].status === 'pago') {
        await supabase.from('notifications').insert({
          recipient_id: selectedPatientForDetails.id,
          title: "Confirmação de Pagamento",
          message: `Identificamos a quitação da sua ${installmentIndex + 1}ª parcela referente ao contrato "${contract.description}". Obrigado!`
        });
      }
    }
  };

  const handleSendNotification = async () => {
    if (!selectedPatientForDetails || !notifTitle.trim() || !notifMsg.trim()) return;
    setSendingNotif(true);
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          recipient_id: selectedPatientForDetails.id,
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

  // Register New Patient with Password & Checklist options
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim() || !newPatientPhone.trim()) {
      alert("Por favor, preencha o nome e o telefone.");
      return;
    }
    if (newPatientPassword.length < 4 || newPatientPassword.length > 6) {
      alert("A senha de acesso ao portal deve ter entre 4 e 6 dígitos.");
      return;
    }

    setCreatingPatient(true);
    try {
      const cleanPhone = newPatientPhone.replace(/\D/g, "");
      const { data, error } = await supabase
        .from("leads")
        .insert({
          full_name: newPatientName.trim(),
          phone: cleanPhone,
          cpf: newPatientCpf.replace(/\D/g, "") || null,
          interest: newPatientInterest.trim() || "Tratamento Estético",
          portal_password: newPatientPassword,
          portal_access_active: newPatientActiveAccess,
          whatsapp_reminders: newPatientWhatsappReminders,
          is_vip: newPatientIsVip,
          allergies_restrictions: newPatientAllergies.trim() || null,
          origin: "Cadastro Manual",
          conversation_status: "agendado",
          last_interaction_at: new Date().toISOString()
        })
        .select("*")
        .single();

      if (error) {
        alert("Erro ao cadastrar paciente: " + error.message);
      } else {
        setPatients([data, ...patients]);
        setNewPatientName("");
        setNewPatientPhone("");
        setNewPatientCpf("");
        setNewPatientPassword("");
        setNewPatientInterest("");
        setNewPatientAllergies("");
        setNewPatientActiveAccess(true);
        setNewPatientWhatsappReminders(true);
        setNewPatientIsVip(false);
        setCreateModalOpen(false);
        alert("Paciente cadastrado com sucesso! Já pode acessar o portal com o telefone e a senha de 6 dígitos.");
      }
    } catch (err) {
      alert("Erro ao cadastrar.");
    } finally {
      setCreatingPatient(false);
    }
  };

  const filteredPatients = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter((patient: any) => {
      const name = String(patient.full_name || "").toLowerCase();
      const phone = String(patient.phone || "").toLowerCase();
      return name.includes(term) || phone.includes(term);
    });
  }, [patients, searchTerm]);

  return (
    <div className="flex-1 overflow-hidden p-8 h-full w-full space-y-6 relative flex flex-col">
      
      {/* Container Principal */}
      <div className="flex flex-col h-full w-full space-y-6 flex-1 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-white/5 shrink-0">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] uppercase tracking-widest font-semibold text-[#E5C38C] mb-2">
              <Sparkles className="h-3 w-3" />
              <span>Portal de Clientes</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white font-serif">Pacientes do Portal</h1>
            <p className="text-xs text-white/40 font-light mt-1">Gerenciamento de credenciais de acesso, prontuários e finanças dos clientes.</p>
          </div>
          
          <button 
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#E5C38C] text-xs font-semibold uppercase tracking-wider text-[#0B0D12] rounded-2xl hover:opacity-90 shadow-md transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Paciente
          </button>
        </div>

        {/* Main Table Area */}
        <div className="flex-1 flex flex-col overflow-hidden rounded-[32px] border border-white/5 bg-[#0B0D12]/60 backdrop-blur-3xl shadow-2xl">
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/5 px-8 py-6 gap-6 bg-white/[0.01]">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 px-4 py-2.5 border border-white/10 rounded-2xl bg-[#07090E]/60 text-xs focus-within:border-[#D4AF37]/45 transition-all w-96 shadow-inner">
                <Search className="w-4 h-4 text-[#D4AF37]/50" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar paciente por nome ou telefone..." 
                  className="bg-transparent outline-none w-full text-white placeholder:text-white/20 font-light tracking-wide" 
                />
              </div>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/20">
              Total: <span className="text-[#E5C38C] font-mono">{filteredPatients.length}</span> ativos
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#0E1118]/90 text-[9px] uppercase tracking-[0.3em] text-white/30 sticky top-0 border-b border-white/5 z-10 backdrop-blur-md">
                <tr>
                  <th className="px-8 py-5 font-bold">Paciente / Identidade</th>
                  <th className="px-8 py-5 font-bold">Credencial</th>
                  <th className="px-8 py-5 font-bold">Status Acesso</th>
                  <th className="px-8 py-5 font-bold">Lembretes WhatsApp</th>
                  <th className="px-8 py-5 font-bold">Categoria</th>
                  <th className="px-8 py-5 font-bold text-right">Ações de Controle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[11px] text-white/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-24 text-white/20 uppercase tracking-[0.4em] font-bold text-xs animate-pulse">Sincronizando Base de Pacientes...</td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-24 text-white/20 uppercase tracking-[0.4em] font-bold text-xs">Nenhum paciente cadastrado</td>
                  </tr>
                ) : filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-white/[0.02] transition-all group border-l-2 border-transparent hover:border-[#D4AF37]">
                    <td className="px-8 py-5">
                      <div className="font-serif font-bold text-white text-[15px] tracking-tight">{patient.full_name || patient.nome}</div>
                      <div className="text-[10px] text-white/20 mt-1 font-mono tracking-widest uppercase">{patient.phone || patient.telefone}</div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#E5C38C] font-bold font-mono tracking-widest">{patient.portal_password || "Sem senha"}</span>
                    </td>
                    <td className="px-8 py-5">
                      {patient.portal_access_active ? (
                        <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-3 py-1 text-[8px] font-bold text-teal-400 uppercase tracking-widest">Ativo</span>
                      ) : (
                        <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[8px] font-bold text-red-400 uppercase tracking-widest">Bloqueado</span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      {patient.whatsapp_reminders ? (
                        <span className="text-emerald-400 font-bold font-mono tracking-widest text-[10px]">ATIVO</span>
                      ) : (
                        <span className="text-white/20 font-bold font-mono tracking-widest text-[10px]">DESATIVADO</span>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      {patient.is_vip ? (
                        <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-[8px] font-bold text-[#E5C38C] uppercase tracking-widest shadow-gold">VIP</span>
                      ) : (
                        <span className="text-white/30 uppercase tracking-widest text-[9px] font-bold">Padrão</span>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                         <button
                           onClick={() => setSelectedPatientForDetails(patient)}
                           className="px-4 py-1.5 rounded-xl border border-[#D4AF37]/35 bg-[#D4AF37]/15 text-[9px] font-bold text-[#E5C38C] uppercase tracking-widest hover:bg-[#D4AF37]/30 transition-all shadow-gold"
                         >
                           Ficha Clínica & Finanças
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

      {/* DETALHES DRAWER */}
      {selectedPatientForDetails && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-2xl bg-[#0E1118] border-l border-white/10 h-full flex flex-col justify-between shadow-2xl relative animate-slide-in">
            
            {/* Header Drawer */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#07090E]/60">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-vibrant-gold-brushed text-[#0D0D0F] font-serif font-bold text-base flex items-center justify-center">
                  {String(selectedPatientForDetails.full_name || "P").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-serif">{selectedPatientForDetails.full_name}</h3>
                  <span className="text-[10px] text-white/40 font-mono">{selectedPatientForDetails.phone}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPatientForDetails(null)}
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

                  {/* Facial Mapping */}
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

                  {/* Before / After Photos */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40">Imagens de Evolução (Antes/Depois)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPhotoUrl}
                        onChange={(e) => setNewPhotoUrl(e.target.value)}
                        className="flex-1 rounded-xl border border-white/5 bg-white/[0.01] px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#ffd700]"
                        placeholder="Link da imagem"
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
                            className="w-full rounded-xl border border-white/5 bg-[#0D0D0F]/40 px-3.5 py-2 text-xs text-white focus:outline-none"
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
                                    <span className="font-bold text-white font-mono">R$ {parseFloat(inst.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                    
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

      {/* REGISTRATION MODAL */}
      {createModalOpen && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0E1118] border border-white/10 rounded-3xl p-6 md:p-8 space-y-5 shadow-2xl relative animate-fade-in text-white">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <h3 className="font-serif text-lg font-bold text-[#E5C38C]">Novo Paciente (Acesso ao Portal)</h3>
              <button 
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPatient} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#ffd700]">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0D0D0F]/50 px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd700]"
                    placeholder="Nome do paciente"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#ffd700]">Telefone (WhatsApp)</label>
                  <input
                    type="tel"
                    required
                    value={newPatientPhone}
                    onChange={(e) => setNewPatientPhone(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0D0D0F]/50 px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd700]"
                    placeholder="(94) 99999-9999"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#ffd700]">Senha do Portal (4 a 6 dígitos)</label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={newPatientPassword}
                    onChange={(e) => setNewPatientPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0D0D0F]/50 px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd700] font-mono tracking-widest"
                    placeholder="••••••"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#ffd700]">Procedimento Principal</label>
                  <input
                    type="text"
                    value={newPatientInterest}
                    onChange={(e) => setNewPatientInterest(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0D0D0F]/50 px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd700]"
                    placeholder="Ex: Harmonização Facial"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#ffd700]">CPF (Opcional)</label>
                  <input
                    type="text"
                    value={newPatientCpf}
                    onChange={(e) => handleCpfChange(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#0D0D0F]/50 px-4 py-2 text-xs text-white focus:outline-none focus:border-[#ffd700] font-mono"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-red-400">Alergias / Restrições Médicas</label>
                  <input
                    type="text"
                    value={newPatientAllergies}
                    onChange={(e) => setNewPatientAllergies(e.target.value)}
                    className="w-full rounded-xl border border-red-500/20 bg-[#0D0D0F]/50 px-4 py-2 text-xs text-white focus:outline-none focus:border-red-400"
                    placeholder="Ex: Alergia a anestésicos, grávida..."
                  />
                </div>
              </div>

              {/* Checklist Options */}
              <div className="space-y-2.5 pt-2 border-t border-white/5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40">Configurações de Acesso e Perfil</label>
                
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPatientActiveAccess(!newPatientActiveAccess)}
                    className="flex items-center gap-2.5 text-xs text-white/80 hover:text-white text-left self-start"
                  >
                    {newPatientActiveAccess ? <CheckSquare className="h-4 w-4 text-[#ffd700]" /> : <Square className="h-4 w-4 text-white/20" />}
                    <span>Acesso ao portal ativo para este paciente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPatientWhatsappReminders(!newPatientWhatsappReminders)}
                    className="flex items-center gap-2.5 text-xs text-white/80 hover:text-white text-left self-start"
                  >
                    {newPatientWhatsappReminders ? <CheckSquare className="h-4 w-4 text-[#ffd700]" /> : <Square className="h-4 w-4 text-white/20" />}
                    <span>Enviar lembretes e avisos automatizados via WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewPatientIsVip(!newPatientIsVip)}
                    className="flex items-center gap-2.5 text-xs text-white/80 hover:text-white text-left self-start"
                  >
                    {newPatientIsVip ? <CheckSquare className="h-4 w-4 text-[#ffd700]" /> : <Square className="h-4 w-4 text-white/20" />}
                    <span>Marcar paciente como categoria VIP</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={creatingPatient}
                className="w-full rounded-2xl bg-vibrant-gold-brushed text-[#0D0D0F] font-bold uppercase tracking-widest text-xs py-3.5 shadow-md disabled:opacity-50 mt-2"
              >
                {creatingPatient ? "Cadastrando Paciente..." : "Confirmar Cadastro e Gerar Acesso"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
