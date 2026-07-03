import React, { useState, useEffect } from "react";
import { createClient } from "../lib/supabase/client";
import { 
  DollarSign, 
  Search, 
  Trash2, 
  Plus, 
  Edit, 
  X, 
  Check, 
  Calendar, 
  ShoppingBag, 
  Zap, 
  User, 
  Tag, 
  TrendingUp, 
  AlertCircle,
  FileText,
  RefreshCw,
  Clock,
  Package
} from "lucide-react";
import { PremiumButton } from "../components/premium/PremiumButton";

export default function FinancialReports() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"sales" | "installments" | "catalog">("sales");
  const [loading, setLoading] = useState(true);

  // Shared catalogs
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  // 1. Sales History State
  const [sales, setSales] = useState<any[]>([]);
  const [saleSearch, setSaleSearch] = useState("");

  // 2. Installments State
  const [installments, setInstallments] = useState<any[]>([]);
  const [instStatusFilter, setInstStatusFilter] = useState<string>("all");
  const [instSearch, setInstSearch] = useState("");

  // 3. Catalog State
  const [catalogTab, setCatalogTab] = useState<"products" | "services">("products");
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Catalog Form Fields
  const [itemName, setItemName] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCost, setItemCost] = useState("");
  const [itemSKU, setItemSKU] = useState("");
  const [itemStock, setItemStock] = useState("");
  const [itemMinStock, setItemMinStock] = useState("");
  const [itemDuration, setItemDuration] = useState("");

  // Messages
  const [feedback, setFeedback] = useState<{ type: "success" | "error", text: string } | null>(null);

  // 4. Cash Sessions State
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionSearch, setSessionSearch] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, [activeTab, catalogTab]);

  async function fetchInitialData() {
    setLoading(true);
    try {
      if (activeTab === "sales") {
        await fetchSales();
      } else if (activeTab === "installments") {
        await fetchInstallments();
      } else if (activeTab === "catalog") {
        await fetchCatalog();
      } else if (activeTab === "sessions") {
        await fetchSessions();
      }
    } catch (err) {
      console.error("Error loading financial dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // --- SALES HISTORY LOGIC ---
  async function fetchSales() {
    const { data, error } = await supabase
      .from("sales")
      .select(`
        *,
        patient:leads (full_name, phone),
        seller:profiles (full_name),
        sale_payments (payment_method, amount)
      `)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    setSales(data || []);
  }

  const handleCancelSale = async (saleId: string) => {
    if (!window.confirm("Deseja realmente cancelar esta venda? O estoque dos produtos será retornado e as parcelas pendentes serão canceladas.")) {
      return;
    }

    setLoading(true);
    try {
      // 1. Get sale items to restore stock
      const { data: items } = await supabase
        .from("sale_items")
        .select("product_id, quantity")
        .eq("sale_id", saleId);

      if (items) {
        for (const item of items) {
          if (item.product_id) {
            const { data: prod } = await supabase
              .from("products")
              .select("stock_quantity")
              .eq("id", item.product_id)
              .single();
            
            const currentStock = prod?.stock_quantity || 0;
            await supabase
              .from("products")
              .update({ stock_quantity: currentStock + item.quantity })
              .eq("id", item.product_id);
          }
        }
      }

      // 2. Cancel sale in DB
      const { error: saleErr } = await supabase
        .from("sales")
        .update({ status: "canceled" })
        .eq("id", saleId);

      if (saleErr) throw saleErr;

      // 3. Cancel installments
      const { error: instErr } = await supabase
        .from("sale_installments")
        .update({ status: "canceled" })
        .eq("sale_id", saleId);

      if (instErr) throw instErr;

      showFeedback("success", "Venda e parcelas canceladas com sucesso!");
      await fetchSales();
    } catch (err: any) {
      console.error("Error canceling sale:", err);
      showFeedback("error", `Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- INSTALLMENTS LOGIC ---
  async function fetchInstallments() {
    const { data, error } = await supabase
      .from("sale_installments")
      .select(`
        *,
        sales!inner (
          id,
          patient:leads (
            full_name,
            phone
          ),
          sale_payments (
            payment_method
          )
        )
      `)
      .order("due_date", { ascending: true });

    if (error) throw error;
    setInstallments(data || []);
  }

  const handlePayInstallment = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("sale_installments")
        .update({
          status: "paid",
          paid_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;
      showFeedback("success", "Parcela baixada como PAGA!");
      await fetchInstallments();
    } catch (err: any) {
      console.error("Error paying installment:", err);
      showFeedback("error", `Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOverdueInstallment = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("sale_installments")
        .update({ status: "overdue" })
        .eq("id", id);

      if (error) throw error;
      showFeedback("success", "Parcela marcada como EM ATRASO!");
      await fetchInstallments();
    } catch (err: any) {
      console.error("Error setting installment status:", err);
      showFeedback("error", `Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- SESSIONS LOGIC ---
  async function fetchSessions() {
    const { data, error } = await supabase
      .from("cash_sessions")
      .select(`
        *,
        opened_by_profile:profiles!cash_sessions_opened_by_fkey (full_name),
        closed_by_profile:profiles!cash_sessions_closed_by_fkey (full_name)
      `)
      .order("opened_at", { ascending: false });

    if (error) throw error;
    setSessions(data || []);
  }

  // --- CATALOG LOGIC ---
  async function fetchCatalog() {
    if (catalogTab === "products") {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      setProducts(data || []);
    } else {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      setServices(data || []);
    }
  }

  const openItemModal = (item: any = null) => {
    setEditingItem(item);
    if (item) {
      setItemName(item.name || "");
      setItemDesc(item.description || "");
      setItemPrice(item.price ? item.price.toString() : "");
      
      if (catalogTab === "products") {
        setItemCost(item.cost_price ? item.cost_price.toString() : "");
        setItemSKU(item.sku || "");
        setItemStock(item.stock_quantity ? item.stock_quantity.toString() : "0");
        setItemMinStock(item.min_stock ? item.min_stock.toString() : "0");
      } else {
        setItemDuration(item.duration_minutes ? item.duration_minutes.toString() : "");
      }
    } else {
      setItemName("");
      setItemDesc("");
      setItemPrice("");
      setItemCost("");
      setItemSKU("");
      setItemStock("0");
      setItemMinStock("0");
      setItemDuration("");
    }
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const priceVal = parseFloat(itemPrice) || 0;
      
      if (catalogTab === "products") {
        const costVal = parseFloat(itemCost) || 0;
        const stockVal = parseInt(itemStock) || 0;
        const minStockVal = parseInt(itemMinStock) || 0;

        const payload = {
          name: itemName,
          description: itemDesc || null,
          sku: itemSKU || null,
          price: priceVal,
          cost_price: costVal || null,
          stock_quantity: stockVal,
          min_stock: minStockVal
        };

        if (editingItem) {
          const { error } = await supabase
            .from("products")
            .update(payload)
            .eq("id", editingItem.id);
          if (error) throw error;
          showFeedback("success", "Produto atualizado com sucesso!");
        } else {
          const { error } = await supabase
            .from("products")
            .insert(payload);
          if (error) throw error;
          showFeedback("success", "Produto criado com sucesso!");
        }
      } else {
        const durationVal = parseInt(itemDuration) || null;

        const payload = {
          name: itemName,
          description: itemDesc || null,
          price: priceVal,
          duration_minutes: durationVal
        };

        if (editingItem) {
          const { error } = await supabase
            .from("services")
            .update(payload)
            .eq("id", editingItem.id);
          if (error) throw error;
          showFeedback("success", "Serviço atualizado com sucesso!");
        } else {
          const { error } = await supabase
            .from("services")
            .insert(payload);
          if (error) throw error;
          showFeedback("success", "Serviço criado com sucesso!");
        }
      }

      setShowItemModal(false);
      await fetchCatalog();
    } catch (err: any) {
      console.error("Error saving catalog item:", err);
      showFeedback("error", `Erro ao salvar item: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCatalogItem = async (id: string) => {
    if (!window.confirm("Deseja realmente desativar este item do catálogo?")) {
      return;
    }

    setLoading(true);
    try {
      const table = catalogTab === "products" ? "products" : "services";
      const { error } = await supabase
        .from(table)
        .update({ status: "inactive" })
        .eq("id", id);

      if (error) throw error;
      showFeedback("success", "Item desativado com sucesso!");
      await fetchCatalog();
    } catch (err: any) {
      console.error("Error disabling catalog item:", err);
      showFeedback("error", `Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper formatting
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleDateString("pt-BR");
  };

  // Filter systems
  const filteredSales = sales.filter(s => 
    s.patient?.full_name.toLowerCase().includes(saleSearch.toLowerCase()) ||
    s.id.toLowerCase().includes(saleSearch.toLowerCase())
  );

  const filteredInstallments = installments.filter(inst => {
    // 1. Status Filter
    if (instStatusFilter !== "all" && inst.status !== instStatusFilter) return false;
    // 2. Text Search
    if (instSearch) {
      const patName = inst.sales?.patient?.full_name || "";
      return patName.toLowerCase().includes(instSearch.toLowerCase());
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
      {/* Background Glow */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] rounded-full bg-gold/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-bold font-display text-glow-gold tracking-tight">Financeiro & Itens</h1>
          <p className="text-xs uppercase tracking-widest text-white/30 font-bold mt-1">Histórico Comercial, Contas a Receber e Cadastro</p>
        </div>

        {/* Tab triggers */}
        <div className="flex bg-white/[0.02] border border-white/5 p-1 rounded-xl">
          {[
            { id: "sales", label: "Vendas" },
            { id: "installments", label: "Contas a Receber" },
            { id: "sessions", label: "Turnos de Caixa" },
            { id: "catalog", label: "Catálogo" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === tab.id 
                  ? "bg-gold text-black shadow-gold font-black" 
                  : "text-white/40 hover:text-white/80"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 backdrop-blur-md animate-fade-in ${
          feedback.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
            : "bg-red-500/10 border-red-500/20 text-red-400"
        }`}>
          {feedback.type === "success" ? <Check className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
          <span className="text-xs font-medium tracking-wide">{feedback.text}</span>
        </div>
      )}

      {loading && !showItemModal ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-gold/60 text-xs tracking-widest font-black uppercase animate-pulse">Buscando dados...</div>
        </div>
      ) : (
        /* ================= TAB 1: HISTÓRICO DE VENDAS ================= */
        activeTab === "sales" ? (
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
              <input
                type="text"
                placeholder="Filtrar vendas por paciente ou ID..."
                value={saleSearch}
                onChange={(e) => setSaleSearch(e.target.value)}
                className="w-full bg-white/[0.01] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-white/25 focus:border-gold/30 outline-none"
              />
            </div>

            {/* Sales Table */}
            <div className="glass-dark rounded-2xl border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01] text-white/45 uppercase tracking-widest text-[13px] font-black">
                      <th className="p-4">Data</th>
                      <th className="p-4">ID Venda</th>
                      <th className="p-4">Paciente</th>
                      <th className="p-4">Vendedor</th>
                      <th className="p-4">Métodos</th>
                      <th className="p-4 text-right">Valor Líquido</th>
                      <th className="p-4 text-center">Comprovante</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {filteredSales.map((s) => (
                      <tr key={s.id} className="hover:bg-white/[0.005] transition-colors">
                        <td className="p-4 text-white/60 font-light">{formatDate(s.created_at)}</td>
                        <td className="p-4 font-mono text-[13px] text-white/40">#{s.id.substring(0, 8)}</td>
                        <td className="p-4 text-white font-bold">{s.patient?.full_name || "Paciente Removido"}</td>
                        <td className="p-4 text-white/70">{s.seller?.full_name || "Desconhecido"}</td>
                        <td className="p-4 capitalize text-gold/80 font-medium">
                          {s.sale_payments?.map((p: any) => p.payment_method.replace("_", " ")).join(", ") || "-"}
                        </td>
                        <td className="p-4 text-right font-bold text-white font-display">{formatCurrency(s.net_amount)}</td>
                        <td className="p-4 text-center font-bold">
                          {s.receipt_url ? (
                            <a 
                              href={s.receipt_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-gold hover:underline text-[14px] font-black uppercase tracking-widest"
                              title="Ver Comprovante"
                            >
                              [Ver Anexo]
                            </a>
                          ) : (
                            <span className="text-white/20">-</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[13px] font-black uppercase tracking-wider ${
                            s.status === "completed" 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" 
                              : "bg-red-500/10 text-red-400 border border-red-500/10"
                          }`}>
                            {s.status === "completed" ? "Faturada" : "Cancelada"}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {s.status === "completed" && (
                            <button
                              onClick={() => handleCancelSale(s.id)}
                              className="text-white/30 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg border border-transparent hover:border-red-500/20 transition-all"
                              title="Cancelar Venda"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}

                    {filteredSales.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-white/30 font-light">Nenhuma venda faturada encontrada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) :
        
        /* ================= TAB 2: CONTAS A RECEBER (PARCELAS) ================= */
        activeTab === "installments" ? (
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
                <input
                  type="text"
                  placeholder="Buscar parcelas por paciente..."
                  value={instSearch}
                  onChange={(e) => setInstSearch(e.target.value)}
                  className="w-full bg-white/[0.01] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-white/25 focus:border-gold/30 outline-none"
                />
              </div>

              <div className="flex bg-white/[0.02] border border-white/5 p-1 rounded-lg">
                {[
                  { key: "all", label: "Todas" },
                  { key: "pending", label: "Pendentes" },
                  { key: "paid", label: "Pagas" },
                  { key: "overdue", label: "Atrasadas" }
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setInstStatusFilter(f.key)}
                    className={`px-3 py-1.5 rounded-md text-[14px] font-black uppercase tracking-wider transition-all ${
                      instStatusFilter === f.key 
                        ? "bg-gold/10 text-gold border border-gold/20" 
                        : "text-white/40 hover:text-white/80"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Installments Table */}
            <div className="glass-dark rounded-2xl border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01] text-white/45 uppercase tracking-widest text-[13px] font-black">
                      <th className="p-4">Vencimento</th>
                      <th className="p-4">Paciente</th>
                      <th className="p-4">Venda Ref</th>
                      <th className="p-4 text-center">Nº Parcela</th>
                      <th className="p-4">Forma</th>
                      <th className="p-4 text-right">Valor</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {filteredInstallments.map((inst) => {
                      const isOverdue = inst.status === "pending" && new Date(inst.due_date) < new Date();
                      return (
                        <tr key={inst.id} className="hover:bg-white/[0.005] transition-colors">
                          <td className={`p-4 font-bold ${
                            isOverdue || inst.status === "overdue" ? "text-red-400 animate-pulse" : "text-white/60"
                          }`}>
                            {formatDate(inst.due_date)}
                            {isOverdue && <span className="text-[7px] uppercase font-black tracking-widest block text-red-500">(Vencida)</span>}
                          </td>
                          <td className="p-4 text-white font-bold">{inst.sales?.patient?.full_name || "Desconhecido"}</td>
                          <td className="p-4 font-mono text-[14px] text-white/40">#{inst.sale_id.substring(0, 8)}</td>
                          <td className="p-4 text-center text-white/60">{inst.installment_number}</td>
                          <td className="p-4 capitalize text-gold/80 font-medium">
                            {inst.sales?.sale_payments?.map((p: any) => p.payment_method.replace("_", " ")).join(", ") || "-"}
                          </td>
                          <td className="p-4 text-right font-bold text-white font-display">{formatCurrency(inst.amount)}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[13px] font-black uppercase tracking-wider ${
                              inst.status === "paid" 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" 
                                : inst.status === "overdue" || isOverdue
                                  ? "bg-red-500/10 text-red-400 border border-red-500/10"
                                  : inst.status === "canceled"
                                    ? "bg-white/5 text-white/30 border border-white/5"
                                    : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/10"
                            }`}>
                              {inst.status === "paid" ? "Paga" : inst.status === "overdue" || isOverdue ? "Atrasada" : inst.status === "canceled" ? "Cancelada" : "Pendente"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {inst.status === "pending" && (
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handlePayInstallment(inst.id)}
                                  className="text-emerald-400 hover:bg-emerald-500/10 p-1 rounded border border-transparent hover:border-emerald-500/20"
                                  title="Registrar Recebimento (Baixar)"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOverdueInstallment(inst.id)}
                                  className="text-red-400 hover:bg-red-500/10 p-1 rounded border border-transparent hover:border-red-500/20"
                                  title="Marcar como Atrasada"
                                >
                                  <AlertCircle className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredInstallments.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-white/30 font-light">Nenhuma parcela a receber cadastrada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === "sessions" ? (
          /* ================= TAB 3: TURNOS DE CAIXA ================= */
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20" />
              <input
                type="text"
                placeholder="Filtrar turnos por operador..."
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                className="w-full bg-white/[0.01] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-white/25 focus:border-gold/30 outline-none"
              />
            </div>

            <div className="glass-dark rounded-2xl border border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01] text-white/45 uppercase tracking-widest text-[13px] font-black">
                      <th className="p-4">Abertura</th>
                      <th className="p-4">Fechamento</th>
                      <th className="p-4">Operador</th>
                      <th className="p-4 text-right">Inicial</th>
                      <th className="p-4 text-right">Declarado</th>
                      <th className="p-4 text-right">Esperado</th>
                      <th className="p-4 text-right">Discrepância</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Comprovante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {sessions
                      .filter(s => {
                        if (!sessionSearch) return true;
                        const name = s.opened_by_profile?.full_name || "";
                        return name.toLowerCase().includes(sessionSearch.toLowerCase());
                      })
                      .map((s) => {
                        const diff = s.status === "closed" 
                          ? (Number(s.closing_balance_declared) - Number(s.closing_balance_expected)) 
                          : 0;
                        return (
                          <tr key={s.id} className="hover:bg-white/[0.005] transition-colors">
                            <td className="p-4 text-white/60 font-light">{formatDate(s.opened_at)} {new Date(s.opened_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td>
                            <td className="p-4 text-white/60 font-light">
                              {s.closed_at ? (
                                `${formatDate(s.closed_at)} ${new Date(s.closed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                              ) : "-"}
                            </td>
                            <td className="p-4 text-white font-bold">{s.opened_by_profile?.full_name || "Desconhecido"}</td>
                            <td className="p-4 text-right">{formatCurrency(s.opening_balance)}</td>
                            <td className="p-4 text-right">{s.status === "closed" ? formatCurrency(s.closing_balance_declared) : "-"}</td>
                            <td className="p-4 text-right">{s.status === "closed" ? formatCurrency(s.closing_balance_expected) : "-"}</td>
                            <td className={`p-4 text-right font-bold ${
                              diff === 0 ? "text-emerald-400" : diff > 0 ? "text-blue-400" : "text-red-400"
                            }`}>
                              {s.status === "closed" ? (diff === 0 ? "Bateu" : formatCurrency(diff)) : "-"}
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[13px] font-black uppercase tracking-wider ${
                                s.status === "open" 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 animate-pulse" 
                                  : "bg-white/5 text-white/30 border border-white/5"
                              }`}>
                                {s.status === "open" ? "Aberto" : "Fechado"}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {s.receipt_url ? (
                                <a 
                                  href={s.receipt_url} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-gold hover:underline text-[14px] font-black uppercase tracking-widest animate-pulse"
                                >
                                  [Ver Anexo]
                                </a>
                              ) : (
                                <span className="text-white/20">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                    {sessions.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-white/30 font-light">Nenhum turno de caixa registrado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) :
        
        /* ================= TAB 4: CATÁLOGO DE PRODUTOS E SERVIÇOS ================= */
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex bg-white/[0.02] border border-white/5 p-1 rounded-lg">
              <button
                onClick={() => setCatalogTab("products")}
                className={`px-3.5 py-1.5 rounded-md text-[14px] font-black uppercase tracking-wider transition-all ${
                  catalogTab === "products" 
                    ? "bg-gold/10 text-gold border border-gold/20" 
                    : "text-white/40 hover:text-white/80"
                }`}
              >
                Produtos Físicos
              </button>
              <button
                onClick={() => setCatalogTab("services")}
                className={`px-3.5 py-1.5 rounded-md text-[14px] font-black uppercase tracking-wider transition-all ${
                  catalogTab === "services" 
                    ? "bg-gold/10 text-gold border border-gold/20" 
                    : "text-white/40 hover:text-white/80"
                }`}
              >
                Serviços / Procedimentos
              </button>
            </div>

            <PremiumButton onClick={() => openItemModal()} variant="outline" className="py-2.5 text-[14px] uppercase tracking-widest font-black">
              <Plus className="h-3.5 w-3.5" /> Novo {catalogTab === "products" ? "Produto" : "Serviço"}
            </PremiumButton>
          </div>

          {/* Catalog items table */}
          <div className="glass-dark rounded-2xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01] text-white/45 uppercase tracking-widest text-[13px] font-black">
                    <th className="p-4">Nome</th>
                    <th className="p-4">Descrição</th>
                    {catalogTab === "products" && <th className="p-4">SKU</th>}
                    {catalogTab === "products" && <th className="p-4 text-center">Estoque</th>}
                    {catalogTab === "products" && <th className="p-4 text-right">Preço de Custo</th>}
                    {catalogTab === "services" && <th className="p-4 text-center">Duração</th>}
                    <th className="p-4 text-right">Preço de Tabela</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02]">
                  {catalogTab === "products" ? (
                    products.map((item) => (
                      <tr key={item.id} className={`hover:bg-white/[0.005] transition-colors ${item.status === "inactive" ? "opacity-40" : ""}`}>
                        <td className="p-4 font-bold text-white flex items-center gap-2">
                          <Package className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                          {item.name}
                        </td>
                        <td className="p-4 text-white/50 font-light max-w-[200px] truncate">{item.description || "-"}</td>
                        <td className="p-4 font-mono text-[13px] text-white/40">{item.sku || "-"}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[13px] font-bold ${
                            item.stock_quantity <= item.min_stock
                              ? "bg-red-500/10 text-red-400 border border-red-500/15 animate-pulse"
                              : "text-white/60"
                          }`}>
                            {item.stock_quantity}
                          </span>
                        </td>
                        <td className="p-4 text-right text-white/50">{item.cost_price ? formatCurrency(item.cost_price) : "-"}</td>
                        <td className="p-4 text-right text-gold font-bold font-display">{formatCurrency(item.price)}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[13px] font-black uppercase tracking-wider ${
                            item.status === "active" 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" 
                              : "bg-white/5 text-white/30 border border-white/5"
                          }`}>
                            {item.status === "active" ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {item.status === "active" && (
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => openItemModal(item)}
                                className="text-white/30 hover:text-gold p-1.5 rounded-lg border border-transparent hover:border-gold/25 transition-all"
                                title="Editar"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCatalogItem(item.id)}
                                className="text-white/30 hover:text-red-400 p-1.5 rounded-lg border border-transparent hover:border-red-500/25 transition-all"
                                title="Excluir (Desativar)"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    services.map((item) => (
                      <tr key={item.id} className={`hover:bg-white/[0.005] transition-colors ${item.status === "inactive" ? "opacity-40" : ""}`}>
                        <td className="p-4 font-bold text-white flex items-center gap-2">
                          <Zap className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                          {item.name}
                        </td>
                        <td className="p-4 text-white/50 font-light max-w-[200px] truncate">{item.description || "-"}</td>
                        <td className="p-4 text-center text-white/60">
                          {item.duration_minutes ? `${item.duration_minutes} min` : "-"}
                        </td>
                        <td className="p-4 text-right text-gold font-bold font-display">{formatCurrency(item.price)}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[13px] font-black uppercase tracking-wider ${
                            item.status === "active" 
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10" 
                              : "bg-white/5 text-white/30 border border-white/5"
                          }`}>
                            {item.status === "active" ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {item.status === "active" && (
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => openItemModal(item)}
                                className="text-white/30 hover:text-gold p-1.5 rounded-lg border border-transparent hover:border-gold/25 transition-all"
                                title="Editar"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteCatalogItem(item.id)}
                                className="text-white/30 hover:text-red-400 p-1.5 rounded-lg border border-transparent hover:border-red-500/25 transition-all"
                                title="Excluir (Desativar)"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}

                  {(catalogTab === "products" ? products : services).length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-white/30 font-light">Nenhum item cadastrado no catálogo.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= EDIT / CREATE MODAL ================= */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-dark border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold font-display text-white">
                  {editingItem ? "Editar Cadastro" : `Novo ${catalogTab === "products" ? "Produto" : "Serviço"}`}
                </h3>
                <p className="text-[14px] uppercase tracking-wider text-white/30 font-bold mt-0.5">Cadastrar no catálogo</p>
              </div>
              <button 
                onClick={() => setShowItemModal(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-4 overflow-y-auto space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[14px] font-black uppercase tracking-wider text-white/50 block">Nome do Item</label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder={`Ex: ${catalogTab === "products" ? "Filtro Solar FPS 50" : "Aplicação Botox 50U"}`}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-gold/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[14px] font-black uppercase tracking-wider text-white/50 block">Descrição</label>
                <textarea
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  placeholder="Informações adicionais do item..."
                  rows={2}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-3 text-white text-xs outline-none focus:border-gold/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[14px] font-black uppercase tracking-wider text-white/50 block">Preço de Tabela (Venda)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-gold/30"
                  />
                </div>

                {catalogTab === "products" ? (
                  <div className="space-y-1.5">
                    <label className="text-[14px] font-black uppercase tracking-wider text-white/50 block">Preço de Custo</label>
                    <input
                      type="number"
                      step="0.01"
                      value={itemCost}
                      onChange={(e) => setItemCost(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-gold/30"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[14px] font-black uppercase tracking-wider text-white/50 block">Duração (Minutos)</label>
                    <input
                      type="number"
                      value={itemDuration}
                      onChange={(e) => setItemDuration(e.target.value)}
                      placeholder="Ex: 60"
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-gold/30"
                    />
                  </div>
                )}
              </div>

              {catalogTab === "products" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[14px] font-black uppercase tracking-wider text-white/50 block">Código / SKU / Código de Barras</label>
                    <input
                      type="text"
                      value={itemSKU}
                      onChange={(e) => setItemSKU(e.target.value)}
                      placeholder="Ex: SKU-PROD-001"
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-gold/30"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[14px] font-black uppercase tracking-wider text-white/50 block">Estoque Inicial</label>
                      <input
                        type="number"
                        required
                        value={itemStock}
                        onChange={(e) => setItemStock(e.target.value)}
                        placeholder="0"
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-gold/30"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[14px] font-black uppercase tracking-wider text-white/50 block">Estoque Mínimo</label>
                      <input
                        type="number"
                        value={itemMinStock}
                        onChange={(e) => setItemMinStock(e.target.value)}
                        placeholder="0"
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-gold/30"
                      />
                    </div>
                  </div>
                </>
              )}

              <PremiumButton type="submit" variant="primary" className="w-full py-3 text-xs uppercase tracking-widest font-black mt-4">
                Salvar Cadastro
              </PremiumButton>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
