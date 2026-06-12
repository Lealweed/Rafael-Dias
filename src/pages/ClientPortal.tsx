import { useState, useEffect, useMemo } from "react";
import { Sparkles, Calendar, DollarSign, FileText, Bell, Phone, LogOut, Star, User, Heart, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "../lib/supabase/client";

export default function ClientPortal() {
  const [patientPhone, setPatientPhone] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);
  const [record, setRecord] = useState<any>(null);
  const [financials, setFinancials] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("agenda");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Handle Login using Phone number
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

    try {
      // Find lead by phone
      let { data: leads, error: leadError } = await supabase
        .from("leads")
        .select("*")
        .like("phone", `%${cleanPhone.slice(-8)}`)
        .limit(1);

      if (leadError || !leads || leads.length === 0) {
        // Try fallback legacy table
        const legacy = await supabase
          .from("Usuarios")
          .select("*")
          .like("telefone", `%${cleanPhone.slice(-8)}`)
          .limit(1);
        leads = legacy.data;
        leadError = legacy.error;
      }

      if (leadError || !leads || leads.length === 0) {
        setError("Paciente não localizado. Verifique o número ou fale com a clínica.");
        setLoading(false);
        return;
      }

      const lead = leads[0];
      setPatientData(lead);
      setIsLoggedIn(true);

      // Fetch related data
      await fetchPatientData(lead.id);
    } catch (err: any) {
      setError("Erro ao autenticar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientData = async (leadId: string) => {
    // 1. Fetch clinical record
    const { data: recordData } = await supabase
      .from("patient_records")
      .select("*")
      .eq("lead_id", leadId)
      .maybeSingle();
    setRecord(recordData);

    // 2. Fetch financials
    const { data: financialData } = await supabase
      .from("patient_financials")
      .select("*")
      .eq("lead_id", leadId);
    setFinancials(financialData || []);

    // 3. Fetch notifications
    const { data: notifData } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", leadId)
      .order("created_at", { ascending: false });
    setNotifications(notifData || []);
  };

  const handleMarkAsRead = async (notifId: string) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notifId);
    
    setNotifications(prev => 
      prev.map(n => n.id === notifId ? { ...n, read: true } : n)
    );
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
          <div className="flex flex-col items-center text-center mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-vibrant-gold-brushed text-[#0D0D0F] font-serif font-bold text-lg shadow-[0_0_15px_rgba(244,180,26,0.3)] mb-4">
              R
            </div>
            <h1 className="text-xl font-bold tracking-widest font-serif text-[#ffd700] text-glow-vibrant-gold uppercase">Área do Paciente</h1>
            <p className="text-[10px] text-white/40 tracking-widest uppercase font-mono mt-1">Instituto Rafael Dias</p>
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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-vibrant-gold-brushed text-[#0D0D0F] font-serif font-bold text-sm">
              R
            </div>
            <div>
              <h1 className="text-xs font-bold tracking-widest font-serif text-[#ffd700]">Portal do Paciente</h1>
              <p className="text-[8px] text-white/30 tracking-widest uppercase font-mono">RD Estética</p>
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
          <div className="rounded-3xl border border-white/5 bg-[#0E1118]/60 p-6 flex flex-col gap-5">
            <div className="flex flex-col items-center text-center pb-4 border-b border-white/5">
              <div className="h-16 w-16 rounded-full bg-vibrant-gold-brushed text-[#0D0D0F] text-xl font-bold flex items-center justify-center shadow-lg mb-3">
                {String(patientData.full_name || patientData.nome || "P").charAt(0).toUpperCase()}
              </div>
              <h3 className="font-serif text-base font-bold text-white leading-tight">{patientData.full_name || patientData.nome}</h3>
              <span className="text-[10px] text-white/40 font-mono mt-1">{patientData.phone || patientData.telefone}</span>
            </div>

            <nav className="flex flex-col gap-1.5">
              <button
                onClick={() => setActiveTab("agenda")}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === "agenda"
                    ? "bg-vibrant-gold-brushed text-[#0D0D0F] shadow-md"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span>Minha Agenda</span>
              </button>

              <button
                onClick={() => setActiveTab("financeiro")}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === "financeiro"
                    ? "bg-vibrant-gold-brushed text-[#0D0D0F] shadow-md"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <DollarSign className="h-4 w-4" />
                <span>Meus Pagamentos</span>
              </button>

              <button
                onClick={() => setActiveTab("prontuario")}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === "prontuario"
                    ? "bg-vibrant-gold-brushed text-[#0D0D0F] shadow-md"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Orientações & Evolução</span>
              </button>

              <button
                onClick={() => setActiveTab("notificacoes")}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === "notificacoes"
                    ? "bg-vibrant-gold-brushed text-[#0D0D0F] shadow-md"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4" />
                  <span>Notificações</span>
                </div>
                {unreadCount > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                    activeTab === "notificacoes"
                      ? "bg-[#0D0D0F] text-[#ffd700]"
                      : "bg-[#ffd700] text-[#0D0D0F]"
                  }`}>
                    {unreadCount}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* Right Content Panels */}
        <div className="md:col-span-3">
          <div className="rounded-3xl border border-white/5 bg-[#0E1118]/40 backdrop-blur-xl p-6 md:p-8 min-h-[450px]">
            
            {/* PANEL: AGENDA */}
            {activeTab === "agenda" && (
              <div className="space-y-6">
                <div className="border-b border-white/5 pb-4">
                  <h2 className="text-xl font-serif font-light text-white">Próximos Agendamentos</h2>
                  <p className="text-xs text-white/40">Suas consultas marcadas no Instituto Rafael Dias.</p>
                </div>

                {patientData.last_appointment_at ? (
                  <div className="rounded-2xl border border-[#D4AF37]/25 bg-gradient-to-r from-[#D4AF37]/5 to-transparent p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1.5">
                      <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-0.5 text-[8px] font-bold text-teal-400 uppercase tracking-wider">Confirmada</span>
                      <h4 className="font-serif font-bold text-white text-base">Sessão Estética</h4>
                      <p className="text-xs text-white/60">Data: {new Date(patientData.last_appointment_at).toLocaleString("pt-BR", {
                        day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}</p>
                    </div>
                    <a
                      href={`https://wa.me/5594999999999?text=Olá,%20gostaria%20de%20reconfirmar%20ou%20ajustar%20meu%20agendamento%20do%20dia%20${encodeURIComponent(new Date(patientData.last_appointment_at).toLocaleDateString())}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl bg-vibrant-gold-brushed text-[#0D0D0F] hover:opacity-90 px-5 py-2 text-[10px] font-bold uppercase tracking-wider transition-all"
                    >
                      Remarcar via WhatsApp
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl">
                    <Calendar className="h-10 w-10 text-white/10 mx-auto mb-3" />
                    <p className="text-xs text-white/40">Nenhum agendamento futuro encontrado.</p>
                    <a
                      href="https://wa.me/5594999999999?text=Olá,%20gostaria%20de%20agendar%20uma%20avaliação%20de%20Harmonização%20Estética"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-full bg-vibrant-gold-brushed text-[#0D0D0F] hover:opacity-90 px-6 py-2.5 text-[9px] font-bold uppercase tracking-widest transition-all mt-4"
                    >
                      Agendar Agora
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* PANEL: FINANCEIRO */}
            {activeTab === "financeiro" && (
              <div className="space-y-6">
                <div className="border-b border-white/5 pb-4">
                  <h2 className="text-xl font-serif font-light text-white">Planos e Parcelas</h2>
                  <p className="text-xs text-white/40">Acompanhe seus contratos, boletos e parcelamento.</p>
                </div>

                {financials.length > 0 ? (
                  <div className="space-y-6">
                    {financials.map((fin) => (
                      <div key={fin.id} className="rounded-2xl border border-white/5 bg-[#0D0D0F]/40 p-5 space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-white/5">
                          <div>
                            <h4 className="font-bold text-white text-sm">{fin.description}</h4>
                            <span className="text-[10px] text-white/40 uppercase font-mono tracking-wider">Método: {fin.payment_method}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-[#ffd700] uppercase tracking-wider block">Valor Total</span>
                            <span className="font-serif font-bold text-white text-base">R$ {parseFloat(fin.total_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h5 className="text-[9px] uppercase tracking-widest font-bold text-white/30">Demonstrativo de Parcelas</h5>
                          <div className="grid gap-2">
                            {Array.isArray(fin.installments) && fin.installments.map((inst: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-white/[0.01] border border-white/5">
                                <div>
                                  <span className="text-xs font-bold text-white font-mono">{inst.number}ª Parcela</span>
                                  <span className="text-[10px] text-white/40 ml-3">Vence em {new Date(inst.due_date).toLocaleDateString("pt-BR")}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="font-bold text-white text-xs">R$ {parseFloat(inst.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                  {inst.status === "pago" ? (
                                    <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-2 py-0.5 text-[8px] font-bold text-teal-400 uppercase tracking-wide">Paga</span>
                                  ) : (
                                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[8px] font-bold text-amber-400 uppercase tracking-wide">Pendente</span>
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
                  <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl">
                    <DollarSign className="h-10 w-10 text-white/10 mx-auto mb-3" />
                    <p className="text-xs text-white/40">Nenhum histórico financeiro encontrado no portal.</p>
                  </div>
                )}
              </div>
            )}

            {/* PANEL: PRONTUARIO */}
            {activeTab === "prontuario" && (
              <div className="space-y-6">
                <div className="border-b border-white/5 pb-4">
                  <h2 className="text-xl font-serif font-light text-white">Evolução & Orientações Clínicas</h2>
                  <p className="text-xs text-white/40">Recomendações e histórico clínico disponibilizados pelo Dr. Rafael.</p>
                </div>

                {record ? (
                  <div className="space-y-6">
                    {/* Evolution Notes */}
                    {record.evolution_notes && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#ffd700]">Resumo do Tratamento</h4>
                        <div className="p-5 rounded-2xl border border-white/5 bg-[#0D0D0F]/30 text-xs text-white/70 leading-relaxed font-light whitespace-pre-line">
                          {record.evolution_notes}
                        </div>
                      </div>
                    )}

                    {/* Post recommendations */}
                    {record.post_recommendations && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] uppercase tracking-widest font-bold text-emerald-400">Cuidados Pós-Procedimento</h4>
                        <div className="p-5 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 text-xs text-emerald-300/80 leading-relaxed font-light whitespace-pre-line">
                          {record.post_recommendations}
                        </div>
                      </div>
                    )}

                    {/* Facial/body mapping annotations */}
                    {record.facial_mapping && Object.keys(record.facial_mapping).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] uppercase tracking-widest font-bold text-white/40">Notas de Mapeamento</h4>
                        <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] grid gap-2">
                          {Object.entries(record.facial_mapping).map(([key, val]: any) => (
                            <div key={key} className="flex justify-between text-xs py-1 border-b border-white/5">
                              <span className="font-semibold text-white/50 uppercase">{key}</span>
                              <span className="text-white">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl">
                    <FileText className="h-10 w-10 text-white/10 mx-auto mb-3" />
                    <p className="text-xs text-white/40">Nenhuma recomendação cadastrada para o seu prontuário ainda.</p>
                  </div>
                )}
              </div>
            )}

            {/* PANEL: NOTIFICACOES */}
            {activeTab === "notificacoes" && (
              <div className="space-y-6">
                <div className="border-b border-white/5 pb-4">
                  <h2 className="text-xl font-serif font-light text-white">Central de Alertas</h2>
                  <p className="text-xs text-white/40">Avisos e lembretes enviados diretamente pela nossa equipe.</p>
                </div>

                {notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-start gap-4 ${
                          notif.read 
                            ? "bg-white/[0.01] border-white/5 text-white/50" 
                            : "bg-[#D4AF37]/5 border-[#D4AF37]/25 text-white shadow-md hover:bg-[#D4AF37]/10"
                        }`}
                      >
                        <div className="space-y-1">
                          <h4 className="font-bold text-xs">{notif.title}</h4>
                          <p className="text-xs font-light">{notif.message}</p>
                          <span className="text-[9px] text-white/30 block pt-1">{new Date(notif.created_at).toLocaleString("pt-BR")}</span>
                        </div>
                        {!notif.read && (
                          <span className="h-2 w-2 rounded-full bg-[#ffd700] shrink-0 mt-1.5 animate-pulse" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 border border-dashed border-white/5 rounded-2xl">
                    <Bell className="h-10 w-10 text-white/10 mx-auto mb-3" />
                    <p className="text-xs text-white/40">Você não tem notificações no momento.</p>
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
