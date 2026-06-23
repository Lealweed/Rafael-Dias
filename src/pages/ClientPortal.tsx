import React, { useState, useEffect, useMemo } from "react";
import { Sparkles, Calendar, DollarSign, FileText, Bell, Phone, LogOut, Star, User, Heart, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "../lib/supabase/client";

export default function ClientPortal() {
  const [patientPhone, setPatientPhone] = useState("");
  const [patientPassword, setPatientPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);
  const [record, setRecord] = useState<any>(null);
  const [financials, setFinancials] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("agenda");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Handle Login using Phone number & Password via secure serverless API
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanPhone = patientPhone.replace(/\D/g, "");
    if (!cleanPhone) {
      setError("Por favor, insira um número de telefone válido.");
      setLoading(false);
      return;
    }
    if (!patientPassword.trim()) {
      setError("Por favor, insira a sua senha de 6 dígitos.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/portal/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleanPhone, password: patientPassword.trim() }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Falha ao autenticar.");
      }

      setPatientData(data.patient);
      setRecord(data.record);
      setFinancials(data.financials || []);
      setNotifications(data.notifications || []);
      setIsLoggedIn(true);
    } catch (err: any) {
      setError(err?.message || "Erro ao autenticar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientData = async (leadId: string) => {
    try {
      const response = await fetch("/api/portal/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: patientPhone, password: patientPassword }),
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        setRecord(data.record);
        setFinancials(data.financials || []);
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error("Erro ao recarregar dados:", err);
    }
  };

  const handleMarkAsRead = async (notifId: string) => {
    try {
      const response = await fetch("/api/portal/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read-notification", notifId }),
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notifId ? { ...n, read: true } : n)
        );
      }
    } catch (err) {
      console.error("Erro ao marcar como lida:", err);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPatientData(null);
    setRecord(null);
    setFinancials([]);
    setNotifications([]);
    setPatientPhone("");
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!isLoggedIn) {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 md:p-8 font-sans bg-[#0D0D0F] overflow-hidden">
        {/* Decorative lights */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#E5C38C]/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#D4AF37]/5 blur-[150px] pointer-events-none" />

        <div className="relative w-full max-w-md bg-[#0D0D0F]/70 backdrop-blur-2xl border border-white/5 p-8 md:p-10 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.8)]">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-vibrant-gold-brushed text-[#0D0D0F] font-serif font-bold text-xl shadow-[0_0_20px_rgba(212,175,55,0.4)] mb-5 overflow-hidden">
              <img src="/assets/logo.jpg" alt="Logo" className="h-full w-full object-cover" />
            </div>
            <h1 className="text-2xl font-light tracking-[0.3em] font-serif text-white uppercase">Área do Paciente</h1>
            <p className="text-[9px] text-[#D4AF37] tracking-[0.5em] uppercase font-bold mt-2">Exclusividade & Cuidado</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs leading-relaxed font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#E3D5C1]/70 uppercase tracking-widest">
                Telefone cadastrado
              </label>
              <input
                type="tel"
                required
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                className="block w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-white placeholder-white/20 focus:border-[#ffd700] focus:outline-none focus:ring-1 focus:ring-[#ffd700] transition-all"
                placeholder="(94) 99999-9999"
              />
              <p className="text-[10px] text-white/30">Use o número de WhatsApp informado em seu atendimento.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#E3D5C1]/70 uppercase tracking-widest">
                Senha de Acesso (até 6 dígitos)
              </label>
              <input
                type="password"
                maxLength={6}
                required
                value={patientPassword}
                onChange={(e) => setPatientPassword(e.target.value)}
                className="block w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-white placeholder-white/20 focus:border-[#ffd700] focus:outline-none focus:ring-1 focus:ring-[#ffd700] transition-all font-mono tracking-widest"
                placeholder="••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden rounded-2xl bg-vibrant-gold-brushed py-3.5 text-xs font-bold uppercase tracking-widest text-[#0D0D0F] shadow-[0_0_15px_rgba(244,180,26,0.25)] hover:shadow-[0_0_25px_rgba(244,180,26,0.4)] transition-all duration-300 disabled:opacity-50"
            >
              {loading ? "Verificando..." : "Entrar no Portal"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D0F] text-[#E3D5C1] font-sans flex flex-col justify-between selection:bg-[#ffd700]/20 selection:text-[#ffd700]">
      {/* Scroll Progress / Glow */}
      <div className="absolute top-0 left-0 w-full h-[300px] top-aura-glow pointer-events-none z-[1]" />

      {/* HEADER */}
      <header className="relative z-10 w-full border-b border-white/5 bg-[#0D0D0F]/90 backdrop-blur-2xl py-4">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] text-[#0B0D12] font-semibold italic text-lg shadow-[0_4px_15px_rgba(212,175,55,0.35)] overflow-hidden flex items-center justify-center">
              <img src="/assets/logo.jpg" alt="Logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-xs font-bold tracking-widest font-serif text-[#ffd700]">Portal do Paciente</h1>
              <p className="text-[8px] text-white/30 tracking-widest uppercase font-mono">Instituto Rafael Dias</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-white/40 block">Olá, bem-vindo(a)</span>
              <span className="text-xs font-bold text-white">{patientData.full_name || patientData.nome}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2.5 rounded-full border border-white/5 bg-white/5 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Sair do Portal"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="relative z-10 flex-1 mx-auto w-full max-w-6xl px-6 py-10 grid md:grid-cols-4 gap-8">
        
        {/* Left Navigation Card */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <div className="rounded-3xl border border-white/5 bg-[#0E1118]/60 p-8 flex flex-col gap-6 backdrop-blur-3xl shadow-2xl">
            <div className="flex flex-col items-center text-center pb-6 border-b border-white/5">
              <div className="h-20 w-20 rounded-full bg-vibrant-gold-brushed text-[#0D0D0F] text-2xl font-bold flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.2)] mb-4">
                {String(patientData.full_name || patientData.nome || "P").charAt(0).toUpperCase()}
              </div>
              <h3 className="font-serif text-lg font-bold text-white leading-tight tracking-wide">{patientData.full_name || patientData.nome}</h3>
              <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-[0.2em] mt-2">Paciente VIP</span>
              <span className="text-[9px] text-white/20 font-mono mt-1 tracking-widest">{patientData.phone || patientData.telefone}</span>
            </div>

            <nav className="flex flex-col gap-2">
              {[
                { id: "agenda", label: "Minha Agenda", icon: Calendar },
                { id: "financeiro", label: "Meus Pagamentos", icon: DollarSign },
                { id: "prontuario", label: "Evolução Clínica", icon: FileText },
                { id: "notificacoes", label: "Central de Avisos", icon: Bell, count: unreadCount },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-between px-5 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 group ${
                    activeTab === tab.id
                      ? "bg-vibrant-gold-brushed text-[#0D0D0F] shadow-lg scale-[1.02]"
                      : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <tab.icon className={`h-4 w-4 transition-colors ${activeTab === tab.id ? "text-[#0D0D0F]" : "text-[#D4AF37]/50 group-hover:text-[#D4AF37]"}`} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold shadow-sm ${
                      activeTab === tab.id ? "bg-[#0D0D0F] text-[#ffd700]" : "bg-[#ffd700] text-[#0D0D0F]"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Ficha Médica / Cadastral do Cliente */}
          <div className="rounded-3xl border border-white/5 bg-[#0E1118]/60 p-6 flex flex-col gap-4 backdrop-blur-3xl shadow-2xl text-left">
            <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#E5C38C]">Ficha do Paciente</h4>
            
            <div className="space-y-3">
              <div>
                <p className="text-[9px] text-white/30 uppercase font-mono">Procedimento de Interesse</p>
                <p className="text-xs font-semibold text-white/70">{patientData.interest || "Harmonização Facial"}</p>
              </div>

              <div>
                <p className="text-[9px] text-white/30 uppercase font-mono">Restrições & Alergias</p>
                <p className={`text-xs font-semibold ${patientData.allergies_restrictions ? "text-amber-400" : "text-white/70"}`}>
                  {patientData.allergies_restrictions || "Nenhuma restrição informada"}
                </p>
              </div>

              <div>
                <p className="text-[9px] text-white/30 uppercase font-mono">Tipo de Cadastro</p>
                <span className="inline-block px-2.5 py-0.5 rounded bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[8px] font-bold text-[#E5C38C] uppercase tracking-widest mt-1">
                  {patientData.is_vip ? "Paciente VIP" : "Paciente Standard"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Panels */}
        <div className="md:col-span-3">
          <div className="rounded-[40px] border border-white/5 bg-[#0E1118]/40 backdrop-blur-3xl p-8 md:p-12 min-h-[600px] shadow-3xl">
            
            {/* PANEL: AGENDA */}
            {activeTab === "agenda" && (
              <div className="space-y-10 animate-fade-in">
                <div className="border-b border-white/5 pb-6">
                  <h2 className="text-3xl font-serif font-light text-white tracking-wide">Próximos <span className="italic text-[#D4AF37]">Agendamentos</span></h2>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] mt-2">Suas consultas marcadas no Instituto Rafael Dias.</p>
                </div>

                {patientData.last_appointment_at ? (
                  <div className="rounded-[32px] border border-[#D4AF37]/20 bg-gradient-to-br from-[#D4AF37]/10 via-[#D4AF37]/5 to-transparent p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 shadow-gold">
                    <div className="space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[9px] font-bold text-[#E5C38C] uppercase tracking-[0.2em]">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Sessão Confirmada</span>
                      </div>
                      <h4 className="font-serif font-bold text-white text-2xl tracking-tight">Procedimento Estético</h4>
                      <div className="flex flex-col gap-1 text-sm text-white/60 font-light">
                        <p className="flex items-center gap-2"><Calendar className="h-4 w-4 text-[#D4AF37]" /> {new Date(patientData.last_appointment_at).toLocaleString("pt-BR", {
                          day: "2-digit", month: "long", year: "numeric"
                        })}</p>
                        <p className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#D4AF37]" /> Horário: {new Date(patientData.last_appointment_at).toLocaleString("pt-BR", {
                          hour: "2-digit", minute: "2-digit"
                        })}</p>
                      </div>
                    </div>
                    <a
                      href={`https://wa.me/5594999999999?text=Olá,%20gostaria%20de%20reconfirmar%20ou%20ajustar%20meu%20agendamento%20do%20dia%20${encodeURIComponent(new Date(patientData.last_appointment_at).toLocaleDateString())}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-vibrant-gold-brushed text-[#0D0D0F] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] px-8 py-4 text-[10px] font-bold uppercase tracking-[0.3em] transition-all duration-700"
                    >
                      Ajustar via Concierge
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-32 border border-dashed border-white/10 rounded-[32px] bg-white/[0.01]">
                    <Calendar className="h-16 w-16 text-[#D4AF37]/20 mx-auto mb-6" />
                    <p className="text-xs text-white/40 uppercase tracking-[0.4em]">Nenhum agendamento futuro</p>
                    <a
                      href="https://wa.me/5594999999999?text=Olá,%20gostaria%20de%20agendar%20uma%20avaliação%20de%20Harmonização%20Estética"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-full bg-white/5 border border-white/10 text-white/80 hover:bg-[#D4AF37] hover:text-[#0D0D0F] px-10 py-4 text-[10px] font-bold uppercase tracking-[0.3em] transition-all duration-700 mt-8"
                    >
                      Solicitar Disponibilidade
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* PANEL: FINANCEIRO */}
            {activeTab === "financeiro" && (
              <div className="space-y-10 animate-fade-in">
                <div className="border-b border-white/5 pb-6">
                  <h2 className="text-3xl font-serif font-light text-white tracking-wide">Gestão <span className="italic text-[#D4AF37]">Financeira</span></h2>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] mt-2">Acompanhe seus contratos, boletos e parcelamento.</p>
                </div>

                {financials.length > 0 ? (
                  <div className="grid gap-8">
                    {financials.map((fin) => (
                      <div key={fin.id} className="rounded-[32px] border border-white/10 bg-white/[0.02] p-8 space-y-8 group hover:bg-white/[0.04] transition-all duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-white/5">
                          <div className="space-y-2">
                            <h4 className="font-serif font-bold text-white text-xl tracking-tight">{fin.description}</h4>
                            <div className="flex items-center gap-3">
                              <span className="text-[9px] px-2 py-0.5 rounded-md bg-[#D4AF37]/10 text-[#E5C38C] font-bold uppercase tracking-widest">{fin.payment_method}</span>
                              <span className="text-[9px] text-white/20 font-mono">Contrato ID: {fin.id.slice(0, 8)}</span>
                            </div>
                          </div>
                          <div className="text-left md:text-right">
                            <span className="text-[10px] text-[#D4AF37] uppercase tracking-[0.3em] block mb-1">Valor do Protocolo</span>
                            <span className="font-serif font-bold text-white text-3xl tracking-tight">R$ {parseFloat(fin.total_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h5 className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/30">Cronograma de Parcelamento</h5>
                          <div className="grid gap-3">
                            {Array.isArray(fin.installments) && fin.installments.map((inst: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center p-5 rounded-2xl bg-black/40 border border-white/5 hover:border-[#D4AF37]/30 transition-all group/inst">
                                <div className="flex items-center gap-6">
                                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                                    inst.status === "pago" ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" : "bg-white/5 text-white/40 border border-white/10"
                                  }`}>
                                    {inst.number}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-white uppercase tracking-wider">Parcela {inst.number}</p>
                                    <p className="text-[10px] text-white/30 font-light mt-0.5">Vencimento: {new Date(inst.due_date).toLocaleDateString("pt-BR")}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-6">
                                  <span className="font-bold text-white font-mono tracking-tight">R$ {parseFloat(inst.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                  {inst.status === "pago" ? (
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[8px] font-bold uppercase tracking-widest">
                                      <CheckCircle2 className="h-3 w-3" /> Liquidada
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-bold uppercase tracking-widest">
                                      <AlertCircle className="h-3 w-3" /> Aguardando
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-32 border border-dashed border-white/10 rounded-[32px] bg-white/[0.01]">
                    <DollarSign className="h-16 w-16 text-[#D4AF37]/20 mx-auto mb-6" />
                    <p className="text-xs text-white/40 uppercase tracking-[0.4em]">Nenhum histórico financeiro</p>
                  </div>
                )}
              </div>
            )}

            {/* PANEL: PRONTUARIO */}
            {activeTab === "prontuario" && (
              <div className="space-y-10 animate-fade-in">
                <div className="border-b border-white/5 pb-6 text-left">
                  <h2 className="text-3xl font-serif font-light text-white tracking-wide">Jornada <span className="italic text-[#D4AF37]">Clínica</span></h2>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] mt-2">Recomendações e histórico clínico disponibilizados pelo Dr. Rafael.</p>
                </div>

                {record ? (
                  <div className="grid gap-8">
                    {/* Evolution Notes */}
                    {record.evolution_notes && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] uppercase tracking-[0.4em] font-bold text-[#ffd700]">Resumo do Atendimento</h4>
                        <div className="p-8 rounded-[32px] border border-white/5 bg-white/[0.02] text-sm text-white/70 leading-relaxed font-light whitespace-pre-line shadow-inner">
                          {record.evolution_notes}
                        </div>
                      </div>
                    )}

                    {/* Post recommendations */}
                    {record.post_recommendations && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] uppercase tracking-[0.4em] font-bold text-emerald-400">Diretrizes Pós-Procedimento</h4>
                        <div className="p-8 rounded-[32px] border border-emerald-500/10 bg-emerald-500/5 text-sm text-emerald-300/80 leading-relaxed font-light whitespace-pre-line shadow-lg">
                          <div className="flex gap-4 mb-4">
                            <Heart className="h-5 w-5 text-emerald-400 shrink-0" />
                            <p className="font-bold text-emerald-400 uppercase tracking-widest text-[10px]">Cuidado Recomendado</p>
                          </div>
                          {record.post_recommendations}
                        </div>
                      </div>
                    )}

                    {/* Mapping */}
                    {record.facial_mapping && Object.keys(record.facial_mapping).length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-[10px] uppercase tracking-[0.4em] font-bold text-white/40">Notas de Mapeamento</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {Object.entries(record.facial_mapping).map(([key, val]: any) => (
                            <div key={key} className="flex justify-between items-center p-5 rounded-2xl border border-white/5 bg-black/20">
                              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{key}</span>
                              <span className="text-xs font-semibold text-white tracking-wide">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-32 border border-dashed border-white/10 rounded-[32px] bg-white/[0.01]">
                    <FileText className="h-16 w-16 text-[#D4AF37]/20 mx-auto mb-6" />
                    <p className="text-xs text-white/40 uppercase tracking-[0.4em]">Nenhuma recomendação clínica</p>
                  </div>
                )}
              </div>
            )}

            {/* PANEL: NOTIFICACOES */}
            {activeTab === "notificacoes" && (
              <div className="space-y-10 animate-fade-in">
                <div className="border-b border-white/5 pb-6">
                  <h2 className="text-3xl font-serif font-light text-white tracking-wide">Central de <span className="italic text-[#D4AF37]">Avisos</span></h2>
                  <p className="text-[10px] text-white/40 uppercase tracking-[0.3em] mt-2">Comunicados exclusivos da equipe Rafael Dias.</p>
                </div>

                {notifications.length > 0 ? (
                  <div className="grid gap-4">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                        className={`p-6 rounded-3xl border transition-all duration-500 cursor-pointer flex justify-between items-start gap-6 group ${
                          notif.read 
                            ? "bg-white/[0.01] border-white/5 opacity-50" 
                            : "bg-white/[0.03] border-[#D4AF37]/30 shadow-gold scale-[1.01]"
                        }`}
                      >
                        <div className="space-y-3">
                          <h4 className={`font-bold text-sm tracking-tight ${notif.read ? "text-white/60" : "text-[#E5C38C]"}`}>{notif.title}</h4>
                          <p className="text-sm font-light text-white/60 leading-relaxed">{notif.message}</p>
                          <span className="text-[9px] text-white/20 font-mono tracking-widest block pt-2">{new Date(notif.created_at).toLocaleString("pt-BR")}</span>
                        </div>
                        {!notif.read && (
                          <div className="h-2 w-2 rounded-full bg-[#D4AF37] shrink-0 mt-2 animate-pulse shadow-gold" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-32 border border-dashed border-white/10 rounded-[32px] bg-white/[0.01]">
                    <Bell className="h-16 w-16 text-[#D4AF37]/20 mx-auto mb-6" />
                    <p className="text-xs text-white/40 uppercase tracking-[0.4em]">Sua caixa está vazia</p>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 bg-[#0D0D0F] border-t border-white/5 py-8 text-[#E3D5C1]/40 text-center text-[10px] tracking-widest uppercase">
        <span>© 2026 RD Estética • Beleza e Rejuvenescimento</span>
      </footer>

    </div>
  );
}
