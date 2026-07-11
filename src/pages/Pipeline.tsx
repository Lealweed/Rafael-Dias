import React, { useState, useEffect, useMemo } from "react";
import { MoreHorizontal, Plus, GripVertical, Sparkles, ArrowRight, X, Trash2, Save } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { motion, AnimatePresence } from "motion/react";
import { PremiumButton } from "../components/premium/PremiumButton";
import { cn } from "../lib/utils";

const STAGE_TEMPLATE = [
  { id: "novo", title: "Novos Leads", color: "bg-sky-500", bgCol: "bg-black-void/40" },
  { id: "em_atendimento", title: "Em Atendimento", color: "bg-gold", bgCol: "bg-black-void/40" },
  { id: "aguardando_cliente", title: "Aguardando", color: "bg-amber-500", bgCol: "bg-black-void/40" },
  { id: "agendado", title: "Agendados", color: "bg-emerald-500", bgCol: "bg-black-void/40" },
  { id: "encerrado", title: "Encerrados", color: "bg-white/10", bgCol: "bg-black-void/40" },
];

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR", { day: '2-digit', month: 'short' });
}

/**
 * Pipeline Page: Visual sales funnel with high-fidelity Kanban stages.
 */
export default function Pipeline() {
  const supabase = useMemo(() => createClient(), []);
  const [stages, setStages] = useState(STAGE_TEMPLATE.map((s) => ({ ...s, items: [] as any[] })));
  const [loading, setLoading] = useState(true);

  // --- Create Modal States ---
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newInterest, setNewInterest] = useState("");
  const [newTemp, setNewTemp] = useState("cold");
  const [newStatus, setNewStatus] = useState("novo");
  const [newOwner, setNewOwner] = useState("Dr. Rafael");
  const [creatingLead, setCreatingLead] = useState(false);

  // --- Edit/Delete Modal States ---
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editInterest, setEditInterest] = useState("");
  const [editTemp, setEditTemp] = useState("cold");
  const [editStatus, setEditStatus] = useState("novo");
  const [editOwner, setEditOwner] = useState("Dr. Rafael");
  const [savingLead, setSavingLead] = useState(false);
  const [deletingLead, setDeletingLead] = useState(false);

  // Fetch Pipeline Data
  async function fetchPipeline() {
    let { data, error } = await supabase.from('leads').select('*');
    if (error) {
      console.warn("Fallback to Usuarios table:", error.message);
      const legacy = await supabase.from('Usuarios').select('*');
      data = legacy.data ? legacy.data.map((u: any) => ({
        ...u,
        full_name: u.full_name || u.nome || '',
        phone: u.phone || u.telefone || '',
        interest: u.interest || u.interesse || '',
        temperature: u.temperature || u.temperatura || '',
        conversation_status: u.conversation_status || u.status || 'novo',
        owner_name: u.owner_name || 'Dr. Rafael',
        origin: u.origin || u.origem || 'WEB'
      })) : null;
    }

    const nextStages = STAGE_TEMPLATE.map((s) => ({ ...s, items: [] as any[] }));
    for (const lead of data || []) {
      const status = String(lead.conversation_status || 'novo').toLowerCase();
      const stage = nextStages.find((s) => s.id === status) || nextStages[0];
      stage.items.push({
        id: lead.id,
        name: lead.full_name || lead.nome || lead.phone || "Paciente",
        phone: lead.phone || lead.telefone || "",
        interest: lead.interest || lead.interesse || "Avaliação",
        temperature: lead.temperature || lead.temperatura || "cold",
        owner: lead.owner_name || "Dr. Rafael",
        time: formatDate(lead.next_followup_at || lead.updated_at || lead.created_at),
        origin: lead.origin || "DIRECT",
        leadData: lead
      });
    }
    setStages(nextStages);
    setLoading(false);
  }

  useEffect(() => {
    fetchPipeline();
  }, [supabase]);

  // --- HTML5 Native Drag & Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("text/plain", leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain");
    if (!leadId) return;

    // Locally update stages to give immediate UI response
    let movedItem: any = null;
    const nextStages = stages.map((stage) => {
      const exists = stage.items.some((item) => item.id === leadId);
      if (exists) {
        movedItem = stage.items.find((item) => item.id === leadId);
        return {
          ...stage,
          items: stage.items.filter((item) => item.id !== leadId)
        };
      }
      return stage;
    });

    if (!movedItem) return;

    // Move to target stage
    movedItem.conversation_status = targetStatus;
    const finalStages = nextStages.map((stage) => {
      if (stage.id === targetStatus) {
        return {
          ...stage,
          items: [...stage.items, movedItem]
        };
      }
      return stage;
    });

    setStages(finalStages);

    // Save in DB
    try {
      const { error } = await supabase
        .from('leads')
        .update({ conversation_status: targetStatus, updated_at: new Date().toISOString() })
        .eq('id', leadId);

      if (error) {
        console.warn("leads update failed, trying legacy:", error.message);
        await supabase
          .from('Usuarios')
          .update({ conversation_status: targetStatus })
          .eq('id', leadId);
      }
    } catch (err) {
      console.error("Failed to update status on drag drop:", err);
    }
  };

  // --- CRUD: Create Lead ---
  const handleOpenCreateModal = (stageId?: string) => {
    setNewName("");
    setNewPhone("");
    setNewInterest("Avaliação");
    setNewTemp("cold");
    setNewStatus(stageId || "novo");
    setNewOwner("Dr. Rafael");
    setCreateModalOpen(true);
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;
    setCreatingLead(true);
    try {
      const cleanPhone = newPhone.replace(/\D/g, "");
      const payload = {
        full_name: newName.trim(),
        phone: cleanPhone,
        interest: newInterest.trim() || "Avaliação",
        temperature: newTemp,
        conversation_status: newStatus,
        owner_name: newOwner || "Dr. Rafael",
        origin: "Cadastro Interno",
        last_interaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("leads")
        .insert(payload);

      if (error) {
        console.warn("Error inserting in leads, attempting legacy Usuarios:", error.message);
        const legacyPayload = {
          nome: newName.trim(),
          telefone: cleanPhone,
          interesse: newInterest.trim() || "Avaliação",
          temperatura: newTemp,
          status: newStatus,
          owner_name: newOwner || "Dr. Rafael",
          origem: "Cadastro Interno",
          created_at: new Date().toISOString()
        };
        const { error: legacyError } = await supabase
          .from("Usuarios")
          .insert(legacyPayload);

        if (legacyError) {
          alert("Erro ao cadastrar: " + legacyError.message);
        } else {
          fetchPipeline();
          setCreateModalOpen(false);
        }
      } else {
        fetchPipeline();
        setCreateModalOpen(false);
      }
    } catch (err: any) {
      alert("Erro inesperado: " + err.message);
    } finally {
      setCreatingLead(false);
    }
  };

  // --- CRUD: Edit / Update Lead ---
  const handleOpenEditModal = (item: any) => {
    setSelectedLead(item);
    setEditName(item.name || "");
    setEditPhone(item.phone || "");
    setEditInterest(item.interest || "");
    setEditTemp(item.temperature || "cold");
    setEditStatus(item.leadData?.conversation_status || "novo");
    setEditOwner(item.owner || "Dr. Rafael");
    setEditModalOpen(true);
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !editName.trim() || !editPhone.trim()) return;
    setSavingLead(true);
    try {
      const cleanPhone = editPhone.replace(/\D/g, "");
      const payload = {
        full_name: editName.trim(),
        phone: cleanPhone,
        interest: editInterest.trim() || "Avaliação",
        temperature: editTemp,
        conversation_status: editStatus,
        owner_name: editOwner || "Dr. Rafael",
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("leads")
        .update(payload)
        .eq("id", selectedLead.id);

      if (error) {
        console.warn("Error updating in leads, attempting legacy Usuarios:", error.message);
        const legacyPayload = {
          nome: editName.trim(),
          telefone: cleanPhone,
          interesse: editInterest.trim() || "Avaliação",
          temperatura: editTemp,
          status: editStatus,
          owner_name: editOwner || "Dr. Rafael"
        };
        const { error: legacyError } = await supabase
          .from("Usuarios")
          .update(legacyPayload)
          .eq("id", selectedLead.id);

        if (legacyError) {
          alert("Erro ao atualizar: " + legacyError.message);
        } else {
          fetchPipeline();
          setEditModalOpen(false);
        }
      } else {
        fetchPipeline();
        setEditModalOpen(false);
      }
    } catch (err: any) {
      alert("Erro inesperado: " + err.message);
    } finally {
      setSavingLead(false);
    }
  };

  // --- CRUD: Delete Lead ---
  const handleDeleteLead = async () => {
    if (!selectedLead) return;
    if (!window.confirm("Deseja realmente remover este lead permanentemente?")) return;
    setDeletingLead(true);
    try {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", selectedLead.id);

      if (error) {
        console.warn("Error deleting in leads, attempting legacy:", error.message);
        const { error: legacyError } = await supabase
          .from("Usuarios")
          .delete()
          .eq("id", selectedLead.id);

        if (legacyError) {
          alert("Erro ao excluir: " + legacyError.message);
        } else {
          fetchPipeline();
          setEditModalOpen(false);
        }
      } else {
        fetchPipeline();
        setEditModalOpen(false);
      }
    } catch (err: any) {
      alert("Erro inesperado: " + err.message);
    } finally {
      setDeletingLead(false);
    }
  };

  return (
    <div className="flex-1 overflow-hidden p-4 lg:p-6 h-full w-full space-y-6 flex flex-col top-spotlight pb-16">
      
      {/* --- Header: Editorial Style (Compact) --- */}
      <section className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 pb-4 border-b border-white/5">
        <div className="max-w-xl space-y-2">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg font-body font-bold text-white tracking-tight"
          >
            Funil Comercial <span className="italic font-light text-gold/80">&amp; Performance</span>
          </motion.h1>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 bg-gold/5 px-2.5 py-0.5 rounded-full border border-gold/20">
              <Sparkles className="h-2.5 w-2.5 text-gold" />
              <span className="text-[11px] uppercase tracking-wider font-semibold text-gold font-body">Pipeline de Alta Fidelidade</span>
            </div>
            {/* Mini stats */}
            {!loading && (() => {
              const totalLeads = stages.reduce((a, s) => a + s.items.length, 0);
              const hotLeads = stages.reduce((a, s) => a + s.items.filter(it => it.temperature === 'hot').length, 0);
              const scheduled = stages.find(s => s.id === 'agendado')?.items.length ?? 0;
              return (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-white/20 font-body">Total</span>
                    <span className="text-[11px] font-bold text-white font-mono">{totalLeads}</span>
                  </div>
                  <div className="w-px h-3 bg-white/10" />
                  <div className="flex items-center gap-1">
                    <span className="text-[11px]">🔥</span>
                    <span className="text-[11px] font-bold text-orange-400 font-mono">{hotLeads}</span>
                  </div>
                  <div className="w-px h-3 bg-white/10" />
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-white/20 font-body">Agend.</span>
                    <span className="text-[11px] font-bold text-emerald-400 font-mono">{scheduled}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        <div className="flex gap-2">
          <PremiumButton variant="outline" className="px-3 py-1.5 text-[11px] tracking-wider">CONFIGURAR</PremiumButton>
          <PremiumButton onClick={() => handleOpenCreateModal()} className="px-4 py-1.5 text-[11px] tracking-wider">+ NOVO LEAD</PremiumButton>
        </div>
      </section>

      {/* --- Kanban Stage Grid (Compact) --- */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 snap-x min-h-[400px] h-full scrollbar-hide">
        {loading ? (
          <div className="w-full flex items-center justify-center text-[11px] font-semibold uppercase tracking-wider text-white/20 animate-pulse font-body">Sincronizando Funil...</div>
        ) : stages.map((stage, i) => {
          const totalLeads = stages.reduce((a, s) => a + s.items.length, 0);
          const pct = totalLeads > 0 ? Math.round((stage.items.length / totalLeads) * 100) : 0;
          return (
          <div 
            key={stage.id} 
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
            className="flex flex-col w-64 shrink-0 rounded-2xl border border-white/5 bg-black-matte/30 snap-start backdrop-blur-2xl shadow-2xl overflow-hidden"
          >
            {/* Stage Header (Compact) */}
            <div className="p-3 border-b border-white/5 flex items-center justify-between bg-black-void/40 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", stage.color)} />
                <h3 className="font-body font-semibold text-white text-[11px] tracking-wider uppercase">{stage.title}</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono text-white/20">{pct}%</span>
                <span className="text-[11px] font-mono text-gold/50 font-bold">{stage.items.length}</span>
              </div>
            </div>

            {/* Draggable List (Compact) */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 scrollbar-hide">
              {stage.items.map((item) => (
                <motion.div 
                  key={item.id} 
                  whileHover={{ scale: 1.02, y: -2 }}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onClick={() => handleOpenEditModal(item)}
                  className="bg-white/[0.02] border border-white/5 p-3 rounded-xl shadow-xl hover:border-gold/20 transition-all cursor-pointer group overflow-hidden"
                >
                  {/* Color accent by temperature */}
                  <div className={cn(
                    "absolute top-0 left-0 right-0 h-0.5 opacity-60",
                    item.temperature === 'hot' ? 'bg-orange-400' :
                    item.temperature === 'warm' ? 'bg-amber-400' :
                    'bg-blue-400/30'
                  )} />
                  
                  <div className="flex items-start gap-2 mb-2.5">
                    {/* Avatar */}
                    <div className="h-7 w-7 rounded-lg bg-gold/10 border border-gold/20 text-gold flex items-center justify-center text-[11px] font-bold shrink-0 font-body">
                      {String(item.name || 'P').replace(/[^a-zA-ZÀ-ÿ]/g, '').charAt(0).toUpperCase() || 'P'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-body font-semibold text-white text-xs group-hover:text-gold transition-colors leading-tight line-clamp-2">{item.name}</h4>
                      <p className="text-[10px] text-white/30 font-mono mt-0.5 truncate">{item.phone || '—'}</p>
                    </div>
                    <GripVertical className="w-2.5 h-2.5 text-white/10 group-hover:text-gold/40 transition-colors shrink-0 mt-0.5" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-gold/70 uppercase tracking-wider bg-gold/10 border border-gold/15 px-1.5 py-0.5 rounded-full font-body truncate max-w-[120px]">{item.interest}</span>
                      <span className="shrink-0">
                        {item.temperature === 'hot' && <span title="Quente">🔥</span>}
                        {item.temperature === 'warm' && <span title="Morno">🌡️</span>}
                        {item.temperature === 'cold' && <span title="Frio">❄️</span>}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-1.5 border-t border-white/5">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-white/15 font-body block">Resp.</span>
                        <span className="text-[11px] text-white/40 font-semibold font-body">{item.owner?.split(' ')[0] || 'Dr. Rafael'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-white/15 font-body block">Int.</span>
                        <span className="text-[11px] text-gold/50 font-mono font-bold">{item.time}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {stage.items.length === 0 && (
                <div className="h-24 border border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center bg-white/[0.01] opacity-20 space-y-1.5">
                  <span className="text-lg">✦</span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-white/60 font-body">Estágio Vazio</span>
                </div>
              )}
            </div>
            
            {/* Stage Footer Action */}
            <div className="p-2 bg-black-void/20 border-t border-white/5">
              <button 
                onClick={() => handleOpenCreateModal(stage.id)}
                className="w-full py-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-[10px] font-semibold uppercase tracking-wider text-white/20 hover:text-white transition-all cursor-pointer font-body"
              >
                + Adicionar a {stage.title}
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {/* --- CRUD Modals --- */}
      <AnimatePresence>
        {/* CREATE LEAD MODAL */}
        {createModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-black-matte border border-gold/20 rounded-2xl p-6 space-y-4 shadow-2xl relative overflow-hidden"
            >
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <h3 className="font-display text-xl font-black text-white italic">Novo Lead</h3>
                <button onClick={() => setCreateModalOpen(false)} className="p-1 rounded bg-white/5 hover:bg-white/10 text-white transition-all"><X className="h-4 w-4" /></button>
              </div>

              <form onSubmit={handleCreateLead} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[13px] font-black uppercase tracking-[0.2em] text-gold/60 ml-2">Nome Completo</label>
                  <input 
                    type="text" 
                    required 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)} 
                    className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold/30 transition-all" 
                    placeholder="Identificação do paciente" 
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[13px] font-black uppercase tracking-[0.2em] text-gold/60 ml-2">WhatsApp</label>
                  <input 
                    type="tel" 
                    required 
                    value={newPhone} 
                    onChange={(e) => setNewPhone(e.target.value)} 
                    className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold/30 transition-all" 
                    placeholder="(00) 00000-0000" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[13px] font-black uppercase tracking-[0.2em] text-gold/60 ml-2">Procedimento de Interesse</label>
                  <input 
                    type="text" 
                    value={newInterest} 
                    onChange={(e) => setNewInterest(e.target.value)} 
                    className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold/30 transition-all" 
                    placeholder="Botox, Preenchimento, Avaliação..." 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[13px] font-black uppercase tracking-[0.2em] text-gold/60 ml-2">Qualificação</label>
                    <select 
                      value={newTemp} 
                      onChange={(e) => setNewTemp(e.target.value)} 
                      className="w-full rounded-xl border border-white/5 bg-black-matte px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold/30 cursor-pointer"
                    >
                      <option value="cold">Frio</option>
                      <option value="warm">Morno</option>
                      <option value="hot">Quente</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[13px] font-black uppercase tracking-[0.2em] text-gold/60 ml-2">Estágio Inicial</label>
                    <select 
                      value={newStatus} 
                      onChange={(e) => setNewStatus(e.target.value)} 
                      className="w-full rounded-xl border border-white/5 bg-black-matte px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold/30 cursor-pointer"
                    >
                      {STAGE_TEMPLATE.map(s => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[13px] font-black uppercase tracking-[0.2em] text-gold/60 ml-2">Responsável</label>
                  <input 
                    type="text" 
                    value={newOwner} 
                    onChange={(e) => setNewOwner(e.target.value)} 
                    className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold/30 transition-all" 
                    placeholder="Nome do consultor ou médico" 
                  />
                </div>

                <PremiumButton type="submit" disabled={creatingLead} className="w-full py-2.5 text-[14px] font-black uppercase tracking-widest mt-2">
                  {creatingLead ? "CADASTRANDO..." : "CADASTRAR LEAD"}
                </PremiumButton>
              </form>
            </motion.div>
          </div>
        )}

        {/* EDIT / DELETE LEAD MODAL */}
        {editModalOpen && selectedLead && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-black-matte border border-gold/20 rounded-2xl p-6 space-y-4 shadow-2xl relative overflow-hidden"
            >
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <h3 className="font-display text-xl font-black text-white italic">Editar Lead</h3>
                <button onClick={() => setEditModalOpen(false)} className="p-1 rounded bg-white/5 hover:bg-white/10 text-white transition-all"><X className="h-4 w-4" /></button>
              </div>

              <form onSubmit={handleUpdateLead} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[13px] font-black uppercase tracking-[0.2em] text-gold/60 ml-2">Nome Completo</label>
                  <input 
                    type="text" 
                    required 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)} 
                    className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold/30 transition-all" 
                    placeholder="Identificação do paciente" 
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[13px] font-black uppercase tracking-[0.2em] text-gold/60 ml-2">WhatsApp</label>
                  <input 
                    type="tel" 
                    required 
                    value={editPhone} 
                    onChange={(e) => setEditPhone(e.target.value)} 
                    className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold/30 transition-all" 
                    placeholder="(00) 00000-0000" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[13px] font-black uppercase tracking-[0.2em] text-gold/60 ml-2">Procedimento de Interesse</label>
                  <input 
                    type="text" 
                    value={editInterest} 
                    onChange={(e) => setEditInterest(e.target.value)} 
                    className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold/30 transition-all" 
                    placeholder="Botox, Preenchimento, Avaliação..." 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[13px] font-black uppercase tracking-[0.2em] text-gold/60 ml-2">Qualificação</label>
                    <select 
                      value={editTemp} 
                      onChange={(e) => setEditTemp(e.target.value)} 
                      className="w-full rounded-xl border border-white/5 bg-black-matte px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold/30 cursor-pointer"
                    >
                      <option value="cold">Frio</option>
                      <option value="warm">Morno</option>
                      <option value="hot">Quente</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[13px] font-black uppercase tracking-[0.2em] text-gold/60 ml-2">Estágio Atual</label>
                    <select 
                      value={editStatus} 
                      onChange={(e) => setEditStatus(e.target.value)} 
                      className="w-full rounded-xl border border-white/5 bg-black-matte px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold/30 cursor-pointer"
                    >
                      {STAGE_TEMPLATE.map(s => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[13px] font-black uppercase tracking-[0.2em] text-gold/60 ml-2">Responsável</label>
                  <input 
                    type="text" 
                    value={editOwner} 
                    onChange={(e) => setEditOwner(e.target.value)} 
                    className="w-full rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold/30 transition-all" 
                    placeholder="Nome do consultor ou médico" 
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={handleDeleteLead}
                    disabled={deletingLead || savingLead}
                    className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs flex items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Excluir</span>
                  </button>
                  <PremiumButton type="submit" disabled={savingLead || deletingLead} className="flex-1 py-2.5 text-[14px] font-black uppercase tracking-widest">
                    {savingLead ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
                  </PremiumButton>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
