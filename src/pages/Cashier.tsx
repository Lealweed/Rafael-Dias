import React, { useState, useEffect } from "react";
import { createClient } from "../lib/supabase/client";
import { 
  Calculator, 
  TrendingUp, 
  ArrowDownRight, 
  ArrowUpRight, 
  Lock, 
  Unlock, 
  Calendar, 
  DollarSign, 
  User, 
  FileText, 
  PlusCircle, 
  MinusCircle, 
  AlertTriangle,
  CheckCircle,
  HelpCircle
} from "lucide-react";
import { PremiumButton } from "../components/premium/PremiumButton";

export default function Cashier() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [paymentsSum, setPaymentsSum] = useState<Record<string, number>>({});
  
  // Form states
  const [openingBalance, setOpeningBalance] = useState<string>("0.00");
  const [openingNotes, setOpeningNotes] = useState<string>("");
  
  const [actionType, setActionType] = useState<"suprimento" | "sangria">("suprimento");
  const [actionAmount, setActionAmount] = useState<string>("");
  const [actionDescription, setActionDescription] = useState<string>("");
  const [declaredBalance, setDeclaredBalance] = useState<string>("");
  const [closingNotes, setClosingNotes] = useState<string>("");
  
  // Attachment states
  const [txReceiptUrl, setTxReceiptUrl] = useState<string>("" );
  const [uploadingTxReceipt, setUploadingTxReceipt] = useState(false);

  const [closeReceiptUrl, setCloseReceiptUrl] = useState<string>("");
  const [uploadingCloseReceipt, setUploadingCloseReceipt] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error", text: string } | null>(null);

  const handleTxReceiptUpload = async (file: File) => {
    if (!file) return;
    setUploadingTxReceipt(true);
    try {
      const fileExt = file.name.split(".").pop() || "";
      const fileName = `tx_receipt_${Date.now()}.${fileExt}`;
      const filePath = `cashier/transactions/${fileName}`;

      const { data, error } = await supabase.storage
        .from("site-assets")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(filePath);
      setTxReceiptUrl(urlData.publicUrl);
    } catch (err: any) {
      console.error(err);
      showFeedback("error", `Erro no upload do comprovante: ${err.message}`);
    } finally {
      setUploadingTxReceipt(false);
    }
  };

  const handleCloseReceiptUpload = async (file: File) => {
    if (!file) return;
    setUploadingCloseReceipt(true);
    try {
      const fileExt = file.name.split(".").pop() || "";
      const fileName = `session_close_${Date.now()}.${fileExt}`;
      const filePath = `cashier/sessions/${fileName}`;

      const { data, error } = await supabase.storage
        .from("site-assets")
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(filePath);
      setCloseReceiptUrl(urlData.publicUrl);
    } catch (err: any) {
      console.error(err);
      showFeedback("error", `Erro no upload do comprovante: ${err.message}`);
    } finally {
      setUploadingCloseReceipt(false);
    }
  };

  useEffect(() => {
    fetchSessionAndUser();
  }, []);

  async function fetchSessionAndUser() {
    setLoading(true);
    try {
      // 1. Get current logged in user profile
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();
        setCurrentUser(profile);
      }

      // 2. Look for open session
      const { data: openSession, error } = await supabase
        .from("cash_sessions")
        .select(`
          *,
          opened_by_profile:profiles!cash_sessions_opened_by_fkey (full_name)
        `)
        .eq("status", "open")
        .maybeSingle();

      if (openSession) {
        setCurrentSession(openSession);
        await fetchSessionDetails(openSession.id);
      } else {
        setCurrentSession(null);
      }
    } catch (err) {
      console.error("Error fetching session info:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSessionDetails(sessionId: string) {
    try {
      // Fetch drawer transactions (sale_cash, suprimento, sangria)
      const { data: txs } = await supabase
        .from("cash_transactions")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: false });
      setTransactions(txs || []);

      // Fetch payment totals for this session
      // Since sale_payments references sales, we filter sales that belong to this session_id and status is completed
      const { data: sales, error: salesErr } = await supabase
        .from("sales")
        .select(`
          id,
          status,
          sale_payments (
            payment_method,
            amount
          )
        `)
        .eq("session_id", sessionId)
        .eq("status", "completed");

      if (sales) {
        const sums: Record<string, number> = {
          dinheiro: 0,
          pix: 0,
          cartao_credito: 0,
          cartao_debito: 0,
          boleto: 0,
          outro: 0
        };

        sales.forEach((s: any) => {
          if (s.sale_payments) {
            s.sale_payments.forEach((p: any) => {
              const method = p.payment_method;
              const val = Number(p.amount) || 0;
              if (sums[method] !== undefined) {
                sums[method] += val;
              } else {
                sums[method] = val;
              }
            });
          }
        });
        setPaymentsSum(sums);
      }
    } catch (err) {
      console.error("Error fetching session details:", err);
    }
  }

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const balance = parseFloat(openingBalance) || 0;
      const { data, error } = await supabase
        .from("cash_sessions")
        .insert({
          opened_by: currentUser.id,
          opening_balance: balance,
          status: "open",
          notes: openingNotes || null
        })
        .select()
        .single();

      if (error) throw error;

      showFeedback("success", "Caixa aberto com sucesso!");
      setOpeningBalance("0.00");
      setOpeningNotes("");
      await fetchSessionAndUser();
    } catch (err: any) {
      console.error("Error opening session:", err);
      showFeedback("error", `Falha ao abrir caixa: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;
    
    const amountVal = parseFloat(actionAmount) || 0;
    if (amountVal <= 0) {
      showFeedback("error", "O valor deve ser maior que zero.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("cash_transactions")
        .insert({
          session_id: currentSession.id,
          type: actionType,
          amount: amountVal,
          description: actionDescription || (actionType === "suprimento" ? "Suprimento de caixa" : "Sangria de caixa"),
          receipt_url: txReceiptUrl || null
        });

      if (error) throw error;

      showFeedback("success", `${actionType === "suprimento" ? "Suprimento" : "Sangria"} realizado com sucesso!`);
      setActionAmount("");
      setActionDescription("");
      setTxReceiptUrl("");
      await fetchSessionDetails(currentSession.id);
    } catch (err: any) {
      console.error("Error creating cashier transaction:", err);
      showFeedback("error", `Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession || !currentUser) return;

    const declaredVal = parseFloat(declaredBalance);
    if (isNaN(declaredVal)) {
      showFeedback("error", "Por favor, declare o saldo físico final em dinheiro.");
      return;
    }

    setLoading(true);
    try {
      const expectedVal = expectedCashInDrawer;
      
      const { error } = await supabase
        .from("cash_sessions")
        .update({
          closed_by: currentUser.id,
          closed_at: new Date().toISOString(),
          closing_balance_declared: declaredVal,
          closing_balance_expected: expectedVal,
          status: "closed",
          notes: closingNotes ? `${currentSession.notes || ''} | Fechamento: ${closingNotes}` : currentSession.notes,
          receipt_url: closeReceiptUrl || null
        })
        .eq("id", currentSession.id);

      if (error) throw error;

      showFeedback("success", "Caixa fechado com sucesso!");
      setDeclaredBalance("");
      setClosingNotes("");
      setCloseReceiptUrl("");
      setCurrentSession(null);
      setTransactions([]);
      setPaymentsSum({});
      await fetchSessionAndUser();
    } catch (err: any) {
      console.error("Error closing session:", err);
      showFeedback("error", `Falha ao fechar caixa: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Derived financial values
  const totalSuprimentos = transactions
    .filter(t => t.type === "suprimento")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalSangrias = transactions
    .filter(t => t.type === "sangria")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalVendasDinheiro = transactions
    .filter(t => t.type === "sale_cash")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const expectedCashInDrawer = (Number(currentSession?.opening_balance) || 0) + totalVendasDinheiro + totalSuprimentos - totalSangrias;
  
  const totalSalesAllMethods = (Object.values(paymentsSum) as number[]).reduce((sum, val) => sum + val, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  const formatDateTime = (isoString: string) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleString("pt-BR");
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
      {/* Background Ambient Effect */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] rounded-full bg-gold/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-bold font-display text-glow-gold tracking-tight">Controle de Caixa</h1>
          <p className="text-xs uppercase tracking-widest text-white/30 font-bold mt-1">Gestão de Turnos e Fluxo de Gaveta</p>
        </div>

        {currentSession ? (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl backdrop-blur-md">
            <Unlock className="h-4 w-4 text-emerald-400 animate-pulse" />
            <div className="text-left">
              <p className="text-[13px] font-black uppercase text-emerald-400 tracking-wider">Caixa Aberto</p>
              <p className="text-[14px] text-white/40">{currentSession.opened_by_profile?.full_name || "Operador"}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl backdrop-blur-md">
            <Lock className="h-4 w-4 text-red-400" />
            <div className="text-left">
              <p className="text-[13px] font-black uppercase text-red-400 tracking-wider">Caixa Fechado</p>
              <p className="text-[14px] text-white/40">Abra o caixa para operar o PDV</p>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Messages */}
      {feedbackMsg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border backdrop-blur-md animate-fade-in ${
          feedbackMsg.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {feedbackMsg.type === "success" ? <CheckCircle className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
          <span className="text-xs font-medium tracking-wide">{feedbackMsg.text}</span>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-gold/60 text-xs tracking-widest font-black uppercase animate-pulse">Carregando dados do caixa...</div>
        </div>
      ) : !currentSession ? (
        /* ================= CAIXA FECHADO - FORM DE ABERTURA ================= */
        <div className="max-w-xl mx-auto">
          <div className="glass-dark p-6 rounded-2xl border border-white/5 space-y-6 relative overflow-hidden group hover:border-gold/20 transition-all duration-500">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Calculator className="h-24 w-24 text-gold" />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-lg font-bold font-display text-white">Abertura de Caixa</h2>
              <p className="text-xs text-white/40">Inicie um novo turno declarando o saldo inicial de gaveta (fundo de troco).</p>
            </div>

            <form onSubmit={handleOpenSession} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[13px] font-black uppercase tracking-wider text-white/50">Valor de Abertura (Dinheiro Físico)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-xs text-gold/60 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-gold/40 focus:bg-white/[0.04] outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-black uppercase tracking-wider text-white/50">Observações de Abertura</label>
                <textarea
                  value={openingNotes}
                  onChange={(e) => setOpeningNotes(e.target.value)}
                  placeholder="Ex: Recebi gaveta com troco em moedas..."
                  rows={3}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-3 text-white text-xs focus:border-gold/40 focus:bg-white/[0.04] outline-none transition-all"
                />
              </div>

              <PremiumButton type="submit" variant="primary" className="w-full py-3 text-xs uppercase tracking-widest font-black mt-2">
                Abrir Turno de Caixa
              </PremiumButton>
            </form>
          </div>
        </div>
      ) : (
        /* ================= CAIXA ABERTO - DASHBOARD DO TURNO ================= */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna da Esquerda e Centro: Resumo e Operações */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-dark p-4 rounded-xl border border-white/5 flex flex-col justify-between min-h-[90px]">
                <span className="text-[13px] font-black uppercase text-white/40 tracking-wider">Abertura</span>
                <div className="mt-1">
                  <span className="text-sm font-display text-white font-bold block">{formatCurrency(Number(currentSession.opening_balance))}</span>
                  <span className="text-[13px] text-white/30 uppercase tracking-widest block mt-0.5">Fundo Inicial</span>
                </div>
              </div>

              <div className="glass-dark p-4 rounded-xl border border-white/5 flex flex-col justify-between min-h-[90px]">
                <span className="text-[13px] font-black uppercase text-white/40 tracking-wider">Vendas em Dinheiro</span>
                <div className="mt-1">
                  <span className="text-sm font-display text-emerald-400 font-bold block">+{formatCurrency(totalVendasDinheiro)}</span>
                  <span className="text-[13px] text-white/30 uppercase tracking-widest block mt-0.5">Gaveta Física</span>
                </div>
              </div>

              <div className="glass-dark p-4 rounded-xl border border-white/5 flex flex-col justify-between min-h-[90px]">
                <span className="text-[13px] font-black uppercase text-white/40 tracking-wider">Entradas / Saídas</span>
                <div className="mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-white/60 font-bold">+{totalSuprimentos}</span>
                    <span className="text-xs text-red-400 font-bold">-{totalSangrias}</span>
                  </div>
                  <span className="text-[13px] text-white/30 uppercase tracking-widest block mt-0.5">Suprim / Sangria</span>
                </div>
              </div>

              <div className="glass-dark p-4 rounded-xl border border-white/5 ring-1 ring-gold/20 flex flex-col justify-between min-h-[90px]">
                <span className="text-[13px] font-black uppercase text-gold/80 tracking-wider">Esperado em Dinheiro</span>
                <div className="mt-1">
                  <span className="text-sm font-display text-glow-gold font-bold block">{formatCurrency(expectedCashInDrawer)}</span>
                  <span className="text-[13px] text-gold/40 uppercase tracking-widest block mt-0.5">Total na Gaveta</span>
                </div>
              </div>
            </div>

            {/* Faturamento por Método de Pagamento */}
            <div className="glass-dark p-5 rounded-2xl border border-white/5 space-y-4">
              <h3 className="text-xs uppercase tracking-widest text-white/60 font-black">Faturamento do Turno (Todos os Métodos)</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { label: "Dinheiro", key: "dinheiro", color: "text-white" },
                  { label: "Pix", key: "pix", color: "text-emerald-400" },
                  { label: "C. Crédito", key: "cartao_credito", color: "text-blue-400" },
                  { label: "C. Débito", key: "cartao_debito", color: "text-purple-400" },
                  { label: "Boleto", key: "boleto", color: "text-yellow-400" },
                  { label: "Outro", key: "outro", color: "text-white/60" }
                ].map((item) => (
                  <div key={item.key} className="bg-white/[0.01] border border-white/5 rounded-xl p-3 text-center">
                    <p className="text-[13px] font-black uppercase text-white/30 tracking-wider">{item.label}</p>
                    <p className={`text-xs font-bold font-display mt-1 ${item.color}`}>
                      {formatCurrency(paymentsSum[item.key] || 0)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/5 pt-3 flex justify-between items-center text-xs">
                <span className="text-white/40 uppercase tracking-widest font-black text-[14px]">Faturamento Total Bruto</span>
                <span className="text-sm font-display text-glow-gold font-bold">{formatCurrency(totalSalesAllMethods)}</span>
              </div>
            </div>

            {/* Formulário Sangria / Suprimento */}
            <div className="glass-dark p-5 rounded-2xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-widest text-white/60 font-black">Lançamento de Gaveta</h3>
                <div className="flex gap-1.5 bg-white/[0.02] border border-white/5 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActionType("suprimento")}
                    className={`px-3 py-1 rounded-md text-[13px] font-black uppercase tracking-wider transition-all ${
                      actionType === "suprimento" 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "text-white/40 hover:text-white/80 border border-transparent"
                    }`}
                  >
                    Suprimento
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType("sangria")}
                    className={`px-3 py-1 rounded-md text-[13px] font-black uppercase tracking-wider transition-all ${
                      actionType === "sangria" 
                        ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                        : "text-white/40 hover:text-white/80 border border-transparent"
                    }`}
                  >
                    Sangria
                  </button>
                </div>
              </div>

              <form onSubmit={handleAddTransaction} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-left">
                <div className="space-y-1">
                  <label className="text-[13px] font-black uppercase tracking-wider text-white/50">Valor R$</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={actionAmount}
                    onChange={(e) => setActionAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:border-gold/40 focus:bg-white/[0.04] outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[13px] font-black uppercase tracking-wider text-white/50">Motivo / Descrição</label>
                  <input
                    type="text"
                    required
                    value={actionDescription}
                    onChange={(e) => setActionDescription(e.target.value)}
                    placeholder="Ex: Compra de café, troco de R$50..."
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:border-gold/40 focus:bg-white/[0.04] outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[13px] font-black uppercase tracking-wider text-white/50 block">Comprovante (Opcional)</label>
                  {txReceiptUrl ? (
                    <div className="bg-gold/5 border border-gold/15 p-2.5 rounded-xl text-[13px] text-gold truncate">
                      Anexado!
                      <button type="button" onClick={() => setTxReceiptUrl("")} className="text-white/40 hover:text-red-400 ml-2 font-bold uppercase text-[14px]">Remover</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleTxReceiptUpload(file);
                        }}
                        disabled={uploadingTxReceipt}
                        className="w-full bg-white/[0.01] border border-white/10 rounded-xl px-2 py-2 text-[14px] text-white/40 file:bg-white/5 file:border-0 file:text-[13px] file:text-white file:px-1.5 file:py-0.5 file:rounded file:cursor-pointer outline-none"
                      />
                      {uploadingTxReceipt && <span className="text-[13px] text-gold block animate-pulse mt-0.5 font-bold">Enviando...</span>}
                    </div>
                  )}
                </div>

                <PremiumButton type="submit" variant="outline" className="py-2.5 text-[14px] uppercase tracking-wider font-black">
                  Registrar {actionType === "suprimento" ? "Entrada" : "Saída"}
                </PremiumButton>
              </form>
            </div>

            {/* Extrato do Caixa */}
            <div className="glass-dark p-5 rounded-2xl border border-white/5 space-y-4">
              <h3 className="text-xs uppercase tracking-widest text-white/60 font-black">Movimentações do Turno</h3>
              
              {transactions.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-6">Nenhuma movimentação de gaveta registrada neste turno.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-white/40 uppercase tracking-widest text-[13px]">
                        <th className="py-2">Hora</th>
                        <th className="py-2">Tipo</th>
                        <th className="py-2">Descrição</th>
                        <th className="py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/[0.01]">
                          <td className="py-2.5 text-white/50">{new Date(tx.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td>
                          <td className="py-2.5">
                            {tx.type === "suprimento" && (
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[13px] font-black uppercase tracking-wider">Suprimento</span>
                            )}
                            {tx.type === "sangria" && (
                              <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full text-[13px] font-black uppercase tracking-wider">Sangria</span>
                            )}
                            {tx.type === "sale_cash" && (
                              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full text-[13px] font-black uppercase tracking-wider">Venda Dinheiro</span>
                            )}
                          </td>
                          <td className="py-2.5 text-white/80 font-light max-w-[200px] truncate">
                            <div className="flex items-center gap-1.5">
                              <span>{tx.description}</span>
                              {tx.receipt_url && (
                                <a 
                                  href={tx.receipt_url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-gold hover:underline text-[14px] font-black shrink-0 uppercase tracking-widest"
                                  title="Ver comprovante"
                                >
                                  [Recibo]
                                </a>
                              )}
                            </div>
                          </td>
                          <td className={`py-2.5 text-right font-bold ${
                            tx.type === "sangria" ? "text-red-400" : "text-emerald-400"
                          }`}>
                            {tx.type === "sangria" ? "-" : "+"}{formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Coluna da Direita: Fechamento de Caixa */}
          <div className="space-y-6">
            <div className="glass-dark p-6 rounded-2xl border border-white/5 space-y-6 sticky top-6">
              <div className="space-y-1">
                <h3 className="text-sm font-bold font-display text-white">Fechamento de Caixa</h3>
                <p className="text-[13px] text-white/40 uppercase tracking-widest font-bold">Encerrar sessão de trabalho</p>
              </div>

              <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/40">Saldo Esperado (Dinheiro):</span>
                  <span className="font-bold text-white">{formatCurrency(expectedCashInDrawer)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/40">Abertura:</span>
                  <span className="text-white/70">{formatDateTime(currentSession.opened_at)}</span>
                </div>
              </div>

              <form onSubmit={handleCloseSession} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-black uppercase tracking-wider text-white/50 block">Saldo Declarado (Físico em Dinheiro)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-xs text-gold/60 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={declaredBalance}
                      onChange={(e) => setDeclaredBalance(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm focus:border-gold/40 focus:bg-white/[0.04] outline-none transition-all"
                    />
                  </div>
                  {declaredBalance && (
                    <div className={`text-[13px] font-black uppercase px-3 py-1.5 rounded-lg tracking-wider ${
                      Number(declaredBalance) === expectedCashInDrawer
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
                        : "bg-red-500/10 text-red-400 border border-red-500/10"
                    }`}>
                      {Number(declaredBalance) === expectedCashInDrawer ? (
                        "Status: Caixa Fechando Perfeitamente!"
                      ) : (
                        `Diferença: ${formatCurrency(Number(declaredBalance) - expectedCashInDrawer)} (${
                          Number(declaredBalance) > expectedCashInDrawer ? "Sobra" : "Falta"
                        })`
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-[13px] font-black uppercase tracking-wider text-white/50 block">Comprovante de Fechamento (Opcional)</label>
                  {closeReceiptUrl ? (
                    <div className="flex items-center justify-between bg-gold/5 border border-gold/15 p-2 rounded-xl text-xs">
                      <a href={closeReceiptUrl} target="_blank" rel="noreferrer" className="text-gold/80 hover:text-gold truncate max-w-[150px] font-mono text-[14px] underline">
                        {closeReceiptUrl.split("/").pop()}
                      </a>
                      <button 
                        onClick={() => setCloseReceiptUrl("")}
                        className="text-white/40 hover:text-red-400 p-1 text-[14px] font-bold"
                        type="button"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCloseReceiptUpload(file);
                        }}
                        disabled={uploadingCloseReceipt}
                        className="w-full bg-white/[0.01] border border-white/10 rounded-xl px-2 py-1.5 text-[14px] text-white/40 file:bg-white/5 file:border-0 file:text-[14px] file:text-white file:px-2 file:py-1 file:rounded file:cursor-pointer outline-none"
                      />
                      {uploadingCloseReceipt && (
                        <p className="text-[14px] text-gold animate-pulse mt-1 font-bold">Carregando comprovante...</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-left">
                  <label className="text-[13px] font-black uppercase tracking-wider text-white/50 block">Notas de Fechamento</label>
                  <textarea
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    placeholder="Declare motivos de discrepância ou informações adicionais..."
                    rows={3}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-3 text-white text-xs focus:border-gold/40 focus:bg-white/[0.04] outline-none transition-all"
                  />
                </div>

                <PremiumButton 
                  type="submit" 
                  variant="primary" 
                  className={`w-full py-3 text-xs uppercase tracking-widest font-black ${
                    declaredBalance && Number(declaredBalance) !== expectedCashInDrawer
                      ? "border border-red-500/40 hover:border-red-500"
                      : ""
                  }`}
                >
                  Confirmar Fechamento
                </PremiumButton>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
