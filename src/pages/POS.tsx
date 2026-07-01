import { useState, useEffect } from "react";
import { createClient } from "../lib/supabase/client";
import { 
  ShoppingBag, 
  Search, 
  User, 
  Trash2, 
  Percent, 
  Plus, 
  Minus, 
  AlertCircle, 
  CheckCircle,
  CreditCard,
  ChevronRight,
  UserCheck,
  Calculator,
  CornerDownRight,
  FileText
} from "lucide-react";
import { PremiumButton } from "../components/premium/PremiumButton";

interface CartItem {
  id: string;
  type: "product" | "service";
  name: string;
  unit_price: number;
  quantity: number;
  discount: number; // Flat discount per item
  professional_id: string; // Responsible professional
}

interface PaymentEntry {
  method: string;
  amount: number;
  installments: number;
}

export default function POS() {
  const supabase = createClient();
  
  // App States
  const [loading, setLoading] = useState(true);
  const [cashSession, setCashSession] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  
  // Selection States
  const [selectedTab, setSelectedTab] = useState<"products" | "services">("services");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Transaction States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedSeller, setSelectedSeller] = useState<string>("");
  const [globalDiscount, setGlobalDiscount] = useState<string>("0.00");
  const [saleNotes, setSaleNotes] = useState<string>("");
  
  // Checkout Modal States
  const [showCheckout, setShowCheckout] = useState(false);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [currentMethod, setCurrentMethod] = useState<string>("pix");
  const [currentAmount, setCurrentAmount] = useState<string>("");
  const [currentInstallments, setCurrentInstallments] = useState<number>(1);
  
  // Success Receipt State
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  
  // Messages
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    initializePOS();
  }, []);

  async function initializePOS() {
    setLoading(true);
    try {
      // 1. Verify open cashier session
      const { data: openSession } = await supabase
        .from("cash_sessions")
        .select(`
          *,
          opened_by_profile:profiles!cash_sessions_opened_by_fkey (full_name)
        `)
        .eq("status", "open")
        .maybeSingle();
      
      setCashSession(openSession);

      if (openSession) {
        // 2. Fetch catalog items (active status)
        const { data: prodData } = await supabase
          .from("products")
          .select("*")
          .eq("status", "active")
          .order("name", { ascending: true });
        
        const { data: servData } = await supabase
          .from("services")
          .select("*")
          .eq("status", "active")
          .order("name", { ascending: true });

        setProducts(prodData || []);
        setServices(servData || []);

        // 3. Fetch profiles for Seller & Professional assignment
        const { data: profData } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .order("full_name", { ascending: true });
        setProfiles(profData || []);

        // Set logged-in user as default seller
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setSelectedSeller(session.user.id);
        }
      }
    } catch (err) {
      console.error("Error initializing POS:", err);
    } finally {
      setLoading(false);
    }
  }

  // Live Patient (Leads) Search
  useEffect(() => {
    if (patientSearch.length < 2) {
      setPatientResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const { data } = await supabase
          .from("leads")
          .select("id, full_name, phone, email")
          .ilike("full_name", `%${patientSearch}%`)
          .limit(5);
        setPatientResults(data || []);
      } catch (err) {
        console.error("Error searching patients:", err);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [patientSearch]);

  // Cart operations
  const addToCart = (item: any, type: "product" | "service") => {
    // Check if product is already in cart
    const existingIndex = cart.findIndex(i => i.id === item.id && i.type === type);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          id: item.id,
          type,
          name: item.name,
          unit_price: Number(item.price),
          quantity: 1,
          discount: 0,
          professional_id: type === "service" ? selectedSeller : ""
        }
      ]);
    }
  };

  const updateQuantity = (index: number, change: number) => {
    const updated = [...cart];
    const newQty = updated[index].quantity + change;
    
    // Check product stock limits
    if (updated[index].type === "product") {
      const prod = products.find(p => p.id === updated[index].id);
      if (prod && newQty > prod.stock_quantity) {
        showError(`Estoque insuficiente. Estoque disponível: ${prod.stock_quantity}`);
        return;
      }
    }

    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = newQty;
    }
    setCart(updated);
  };

  const updateItemDiscount = (index: number, discountStr: string) => {
    const updated = [...cart];
    const discountVal = parseFloat(discountStr) || 0;
    if (discountVal < 0 || discountVal > updated[index].unit_price) {
      return;
    }
    updated[index].discount = discountVal;
    setCart(updated);
  };

  const updateItemProfessional = (index: number, profId: string) => {
    const updated = [...cart];
    updated[index].professional_id = profId;
    setCart(updated);
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const totalItemDiscounts = cart.reduce((sum, item) => sum + (item.discount * item.quantity), 0);
  const discGlobal = parseFloat(globalDiscount) || 0;
  const totalAmount = Math.max(0, subtotal - totalItemDiscounts - discGlobal);

  // Error/Success handlers
  const showError = (text: string) => {
    setErrorMsg(text);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const showSuccess = (text: string) => {
    setSuccessMsg(text);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  // Checkout flows
  const openCheckoutDrawer = () => {
    if (cart.length === 0) {
      showError("O carrinho está vazio.");
      return;
    }
    if (!selectedPatient) {
      showError("Por favor, selecione um paciente (cliente) para a venda.");
      return;
    }
    if (!selectedSeller) {
      showError("Por favor, selecione o vendedor da venda.");
      return;
    }
    
    // Check if any service in cart lacks a professional
    const missingProf = cart.some(item => item.type === "service" && !item.professional_id);
    if (missingProf) {
      showError("Por favor, selecione o profissional executor para cada serviço do carrinho.");
      return;
    }

    // Initialize payment entry state
    setPayments([]);
    setCurrentAmount(totalAmount.toFixed(2));
    setCurrentMethod("pix");
    setCurrentInstallments(1);
    setReceiptUrl("");
    setShowCheckout(true);
  };

  const handleReceiptUpload = async (file: File) => {
    if (!file) return;
    setUploadingReceipt(true);
    setErrorMsg(null);
    try {
      const fileExt = file.name.split(".").pop() || "";
      const fileName = `sale_receipt_${Date.now()}.${fileExt}`;
      const filePath = `cashier/sales/${fileName}`;

      const { data, error } = await supabase.storage
        .from("site-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("site-assets")
        .getPublicUrl(filePath);

      setReceiptUrl(urlData.publicUrl);
    } catch (err: any) {
      console.error(err);
      showError(`Erro no upload: ${err.message || "tente novamente."}`);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const addPayment = () => {
    const amt = parseFloat(currentAmount) || 0;
    const remaining = totalAmount - payments.reduce((sum, p) => sum + p.amount, 0);
    
    if (amt <= 0) {
      showError("O valor do pagamento deve ser maior que zero.");
      return;
    }
    if (amt > remaining + 0.01) {
      showError(`O valor excede o saldo restante de ${formatCurrency(remaining)}`);
      return;
    }

    setPayments([
      ...payments,
      {
        method: currentMethod,
        amount: amt,
        installments: currentInstallments
      }
    ]);

    // Reset fields for remaining
    const newRemaining = remaining - amt;
    setCurrentAmount(newRemaining.toFixed(2));
    setCurrentInstallments(1);
  };

  const removePayment = (index: number) => {
    const updated = [...payments];
    const removed = updated.splice(index, 1)[0];
    setPayments(updated);

    const remaining = totalAmount - updated.reduce((sum, p) => sum + p.amount, 0);
    setCurrentAmount(remaining.toFixed(2));
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const isPaymentComplete = Math.abs(totalPaid - totalAmount) < 0.05;

  const handleFinalizeSale = async () => {
    if (!isPaymentComplete) {
      showError("Adicione formas de pagamento até cobrir o valor total da venda.");
      return;
    }
    if (!cashSession) return;

    setLoading(true);
    try {
      // 1. Create Sale Header
      const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .insert({
          session_id: cashSession.id,
          patient_id: selectedPatient.id,
          seller_id: selectedSeller,
          total_amount: subtotal,
          discount: totalItemDiscounts + discGlobal,
          net_amount: totalAmount,
          status: "completed",
          notes: saleNotes || null,
          receipt_url: receiptUrl || null
        })
        .select()
        .single();

      if (saleErr) throw saleErr;

      // 2. Create Sale Items & Update Stock
      for (const item of cart) {
        const { error: itemErr } = await supabase
          .from("sale_items")
          .insert({
            sale_id: sale.id,
            product_id: item.type === "product" ? item.id : null,
            service_id: item.type === "service" ? item.id : null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount,
            total_price: (item.unit_price - item.discount) * item.quantity,
            professional_id: item.professional_id || null
          });

        if (itemErr) throw itemErr;

        // Update product stock in database
        if (item.type === "product") {
          const { data: prodInfo } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", item.id)
            .single();

          const currentStock = prodInfo?.stock_quantity || 0;
          await supabase
            .from("products")
            .update({ stock_quantity: Math.max(0, currentStock - item.quantity) })
            .eq("id", item.id);
        }
      }

      // 3. Create Sale Payments & Individual Installments
      for (const pay of payments) {
        const { data: paymentRecord, error: payErr } = await supabase
          .from("sale_payments")
          .insert({
            sale_id: sale.id,
            payment_method: pay.method,
            amount: pay.amount,
            installments_count: pay.installments
          })
          .select()
          .single();

        if (payErr) throw payErr;

        // Generate individual installments
        const installmentValue = parseFloat((pay.amount / pay.installments).toFixed(2));
        
        for (let i = 1; i <= pay.installments; i++) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (i * 30)); // Monthly schedule (30, 60, 90...)
          
          // Adjust last installment value for rounding errors
          const amt = i === pay.installments 
            ? parseFloat((pay.amount - (installmentValue * (pay.installments - 1))).toFixed(2))
            : installmentValue;

          // A 1x payment in cash, pix or card can start as 'paid' immediately
          // boleto starts as pending
          const startStatus = (pay.installments === 1 && ["dinheiro", "pix", "cartao_debito"].includes(pay.method))
            ? "paid"
            : "pending";

          const { error: instErr } = await supabase
            .from("sale_installments")
            .insert({
              sale_id: sale.id,
              payment_id: paymentRecord.id,
              installment_number: i,
              due_date: dueDate.toISOString().split("T")[0],
              amount: amt,
              status: startStatus,
              paid_at: startStatus === "paid" ? new Date().toISOString() : null
            });

          if (instErr) throw instErr;
        }

        // 4. Create Cash Transaction if payment method is cash ('dinheiro')
        if (pay.method === "dinheiro") {
          const { error: cashTxErr } = await supabase
            .from("cash_transactions")
            .insert({
              session_id: cashSession.id,
              type: "sale_cash",
              amount: pay.amount,
              description: `Venda #${sale.id.substring(0, 8)} - Dinheiro`,
              receipt_url: receiptUrl || null
            });
          if (cashTxErr) throw cashTxErr;
        }
      }

      // 5. Sync with patient_financials for patient file history
      const firstPay = payments[0]?.method || "dinheiro";
      let mappedMethod = "dinheiro";
      if (firstPay === "pix") mappedMethod = "pix";
      else if (firstPay === "boleto") mappedMethod = "boleto";
      else if (firstPay.startsWith("cartao")) mappedMethod = "cartao";

      const pfInstallments = payments.flatMap((pay) => {
        const instValue = parseFloat((pay.amount / pay.installments).toFixed(2));
        return Array.from({ length: pay.installments }).map((_, i) => {
          const idx = i + 1;
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (idx * 30));
          const startStatus = (pay.installments === 1 && ["dinheiro", "pix", "cartao_debito"].includes(pay.method))
            ? "pago"
            : "pendente";
          return {
            number: idx,
            due_date: dueDate.toISOString().split("T")[0],
            value: idx === pay.installments
              ? parseFloat((pay.amount - (instValue * (pay.installments - 1))).toFixed(2))
              : instValue,
            status: startStatus
          };
        });
      });

      const { error: pfErr } = await supabase
        .from("patient_financials")
        .insert({
          lead_id: selectedPatient.id,
          description: `PDV Venda #${sale.id.substring(0, 8)}: ` + cart.map(i => `${i.quantity}x ${i.name}`).join(", "),
          total_value: totalAmount,
          payment_method: mappedMethod,
          installments: pfInstallments,
          receipt_url: receiptUrl || null
        });

      if (pfErr) {
        console.error("Error syncing patient_financials:", pfErr);
        // Do not throw to prevent blocking the checkout success state if sync fails
      }

      // Record finished details for receipt modal
      setCompletedSale({
        id: sale.id,
        patient_name: selectedPatient.full_name,
        total: totalAmount,
        payments: [...payments]
      });

      // Clear Cart and States
      setCart([]);
      setSelectedPatient(null);
      setPatientSearch("");
      setSaleNotes("");
      setGlobalDiscount("0.00");
      setPayments([]);
      setShowCheckout(false);
      showSuccess("Venda faturada com sucesso!");

      // Refresh stock values in list
      initializePOS();
    } catch (err: any) {
      console.error("Error saving sale:", err);
      showError(`Falha ao faturar venda: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  const filteredCatalog = () => {
    const list = selectedTab === "services" ? services : products;
    if (!searchTerm) return list;
    return list.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  if (loading && !cashSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-black-void">
        <div className="text-gold/60 text-xs tracking-widest font-black uppercase animate-pulse">Carregando Frente de Caixa...</div>
      </div>
    );
  }

  if (!cashSession) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-6">
        <div className="h-16 w-16 bg-red-500/10 rounded-full border border-red-500/20 flex items-center justify-center text-red-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold font-display text-white">Caixa Fechado</h2>
          <p className="text-xs text-white/50 leading-relaxed">
            Para realizar vendas no Ponto de Venda (PDV), é obrigatório abrir um turno de caixa primeiro. Isso garante a auditoria de valores em dinheiro na clínica.
          </p>
        </div>
        <PremiumButton href="/cashier" variant="primary" className="px-6 py-3 text-xs uppercase tracking-wider font-black">
          Ir para Controle de Caixa
        </PremiumButton>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/4 w-[350px] h-[350px] rounded-full bg-gold/3 blur-[120px] pointer-events-none" />

      {/* COLUNA ESQUERDA: Catálogo de Itens */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-white/5 bg-black-void/40">
        
        {/* Top Header & Search */}
        <div className="p-4 border-b border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                <ShoppingBag className="h-4.5 w-4.5 text-gold" />
                PDV - Frente de Caixa
              </h2>
              <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mt-0.5">Turno de caixa ativo</p>
            </div>
            
            {/* Catalog toggle tabs */}
            <div className="flex bg-white/[0.02] border border-white/5 p-1 rounded-lg">
              <button
                onClick={() => setSelectedTab("services")}
                className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all ${
                  selectedTab === "services" 
                    ? "bg-gold/10 text-gold border border-gold/20" 
                    : "text-white/40 hover:text-white/80"
                }`}
              >
                Serviços
              </button>
              <button
                onClick={() => setSelectedTab("products")}
                className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all ${
                  selectedTab === "products" 
                    ? "bg-gold/10 text-gold border border-gold/20" 
                    : "text-white/40 hover:text-white/80"
                }`}
              >
                Produtos
              </button>
            </div>
          </div>

          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-3.5 w-3.5 text-white/20" />
            <input
              type="text"
              placeholder={`Buscar ${selectedTab === "services" ? "serviço/procedimento" : "produto por nome ou SKU"}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.01] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-white/25 focus:border-gold/30 outline-none transition-all"
            />
          </div>
        </div>

        {/* Catalog List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCatalog().map((item) => {
              const isOutOfStock = selectedTab === "products" && item.stock_quantity <= 0;
              return (
                <div 
                  key={item.id}
                  onClick={() => !isOutOfStock && addToCart(item, selectedTab === "products" ? "product" : "service")}
                  className={`glass-dark p-3.5 rounded-xl border border-white/5 flex flex-col justify-between hover:border-gold/40 hover:shadow-[0_0_15px_rgba(212,175,55,0.05)] cursor-pointer select-none transition-all duration-300 ${
                    isOutOfStock ? "opacity-50 cursor-not-allowed border-red-500/20 hover:border-red-500/20" : ""
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-start gap-1">
                      <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">{item.name}</h4>
                      {selectedTab === "products" && (
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isOutOfStock ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-gold/5 text-gold/80 border border-gold/10"
                        }`}>
                          Estoque: {item.stock_quantity}
                        </span>
                      )}
                    </div>
                    {item.description && <p className="text-[10px] text-white/35 line-clamp-1 font-light">{item.description}</p>}
                  </div>

                  <div className="flex justify-between items-baseline mt-4 border-t border-white/[0.02] pt-2">
                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Preço</span>
                    <span className="text-xs font-display text-gold font-bold">{formatCurrency(item.price)}</span>
                  </div>
                </div>
              );
            })}

            {filteredCatalog().length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-white/30 font-light">
                Nenhum item encontrado no catálogo.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* COLUNA DIREITA: Carrinho e Checkout */}
      <div className="w-full md:w-[380px] shrink-0 bg-black-matte/90 backdrop-blur-2xl border-t md:border-t-0 border-white/5 flex flex-col justify-between overflow-hidden relative z-10">
        
        {/* Cart Header */}
        <div className="p-4 border-b border-white/5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs uppercase tracking-widest text-white/60 font-black">Sacola de Venda</h3>
            <span className="text-[10px] bg-white/5 text-white/70 px-2 py-0.5 rounded-md font-bold">{cart.length} itens</span>
          </div>

          {/* Seller Assignment */}
          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase tracking-wider text-white/40 block">Vendedor Responsável</label>
            <select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-gold/30"
            >
              <option value="" className="bg-black text-white/50">Selecione o vendedor...</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id} className="bg-black text-white">{p.full_name}</option>
              ))}
            </select>
          </div>

          {/* Patient Selection & Search */}
          <div className="space-y-2 relative">
            <label className="text-[8px] font-black uppercase tracking-wider text-white/40 block">Paciente / Cliente</label>
            
            {selectedPatient ? (
              <div className="flex items-center justify-between bg-gold/5 border border-gold/15 p-2.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-gold" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-white leading-tight">{selectedPatient.full_name}</p>
                    <p className="text-[9px] text-gold/60">{selectedPatient.phone}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setSelectedPatient(null); setPatientSearch(""); }}
                  className="text-white/40 hover:text-red-400 p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Digitar nome para buscar paciente..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full bg-white/[0.01] border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-gold/30"
                />

                {patientResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#101010] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-30 divide-y divide-white/[0.03]">
                    {patientResults.map(p => (
                      <div
                        key={p.id}
                        onClick={() => { setSelectedPatient(p); setPatientResults([]); }}
                        className="p-3 text-left hover:bg-white/[0.02] cursor-pointer"
                      >
                        <p className="text-xs font-bold text-white">{p.full_name}</p>
                        <p className="text-[9px] text-white/40">{p.phone} | {p.email || "Sem e-mail"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {cart.map((item, index) => (
            <div key={`${item.id}-${item.type}`} className="border-b border-white/[0.02] pb-3 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-0.5 text-left">
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full inline-block mb-1 ${
                    item.type === "service" ? "bg-purple-500/10 text-purple-400 border border-purple-500/10" : "bg-blue-500/10 text-blue-400 border border-blue-500/10"
                  }`}>
                    {item.type === "service" ? "Serviço" : "Produto"}
                  </span>
                  <h4 className="text-xs font-bold text-white leading-snug">{item.name}</h4>
                  <p className="text-[9px] text-white/40">{formatCurrency(item.unit_price)} por unidade</p>
                </div>
                
                <button 
                  onClick={() => updateQuantity(index, -item.quantity)}
                  className="text-white/20 hover:text-red-400 p-1 shrink-0 mt-0.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Specific for Services: Select executor */}
              {item.type === "service" && (
                <div className="flex items-center gap-2 bg-white/[0.01] border border-white/5 p-1.5 rounded-lg">
                  <span className="text-[7.5px] font-black uppercase text-white/30 tracking-wider">Profissional:</span>
                  <select
                    value={item.professional_id}
                    onChange={(e) => updateItemProfessional(index, e.target.value)}
                    className="bg-transparent border-0 text-[10px] text-gold font-bold outline-none flex-1"
                  >
                    <option value="" className="bg-black text-white/50">Vincular executor...</option>
                    {profiles.map(p => (
                      <option key={p.id} value={p.id} className="bg-black text-white">{p.full_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantity control & Individual Item Discount */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1 bg-white/[0.02] border border-white/5 p-0.5 rounded-lg shrink-0">
                  <button 
                    onClick={() => updateQuantity(index, -1)}
                    className="p-1 hover:text-white text-white/40 transition-colors"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-xs font-bold text-white px-2.5">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(index, 1)}
                    className="p-1 hover:text-white text-white/40 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 justify-end flex-1">
                  <Percent className="h-3 w-3 text-gold/40 shrink-0" />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Desconto R$"
                    value={item.discount || ""}
                    onChange={(e) => updateItemDiscount(index, e.target.value)}
                    className="w-20 bg-transparent border-b border-white/10 text-right text-xs text-white placeholder:text-white/20 outline-none focus:border-gold/30 py-0.5"
                  />
                </div>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center py-16 text-center text-white/20">
              <ShoppingBag className="h-10 w-10 opacity-30 stroke-[1.5]" />
              <p className="text-xs mt-2 font-light">Seu carrinho está vazio.</p>
            </div>
          )}
        </div>

        {/* Global Summary & Checkout Actions */}
        <div className="p-4 border-t border-white/5 bg-black-void space-y-4">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center text-white/45">
              <span>Subtotal Itens:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            
            {totalItemDiscounts > 0 && (
              <div className="flex justify-between items-center text-red-400">
                <span>Desconto de Itens:</span>
                <span>-{formatCurrency(totalItemDiscounts)}</span>
              </div>
            )}

            <div className="flex justify-between items-center text-white/45">
              <span>Desconto Global R$:</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={globalDiscount}
                onChange={(e) => setGlobalDiscount(e.target.value)}
                className="w-20 bg-white/[0.01] border border-white/5 text-right text-xs text-white rounded px-1.5 py-0.5 outline-none focus:border-gold/30"
              />
            </div>

            <div className="border-t border-white/5 pt-2.5 flex justify-between items-center text-sm font-bold">
              <span className="text-gold/80 font-black uppercase text-[10px] tracking-wider">Total Líquido:</span>
              <span className="text-glow-gold font-display text-white">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Notas internas da venda (opcional)..."
              value={saleNotes}
              onChange={(e) => setSaleNotes(e.target.value)}
              className="w-full bg-white/[0.01] border border-white/5 rounded-xl px-3 py-2 text-[10px] text-white placeholder:text-white/20 outline-none focus:border-gold/30"
            />
            <PremiumButton 
              onClick={openCheckoutDrawer} 
              variant="primary" 
              className="w-full py-3 text-xs uppercase tracking-widest font-black"
              disabled={cart.length === 0}
            >
              Ir Para Pagamento
            </PremiumButton>
          </div>
        </div>
      </div>

      {/* ================= CHECOUT PAYMENT MODAL ================= */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-dark border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold font-display text-white">Fechar Faturamento</h3>
                <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mt-0.5">Definir formas de pagamento</p>
              </div>
              <button 
                onClick={() => setShowCheckout(false)}
                className="text-white/40 hover:text-white text-xs px-2.5 py-1.5 rounded-lg border border-white/5 bg-white/[0.01]"
              >
                Voltar
              </button>
            </div>

            {/* Error notifications */}
            {errorMsg && (
              <div className="m-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4.5 w-4.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Painel Esquerdo: Divisão de Pagamentos */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-white/50 block">Método de Pagamento</label>
                  <select
                    value={currentMethod}
                    onChange={(e) => setCurrentMethod(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-gold/30"
                  >
                    <option value="pix" className="bg-black text-white">Pix</option>
                    <option value="dinheiro" className="bg-black text-white">Dinheiro (Gaveta)</option>
                    <option value="cartao_credito" className="bg-black text-white">Cartão de Crédito</option>
                    <option value="cartao_debito" className="bg-black text-white">Cartão de Débito</option>
                    <option value="boleto" className="bg-black text-white">Boleto Bancário</option>
                    <option value="outro" className="bg-black text-white">Outros</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-wider text-white/50 block">Valor a Lançar R$</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-gold/40 outline-none"
                  />
                </div>

                {["cartao_credito", "boleto"].includes(currentMethod) && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-wider text-white/50 block">Número de Parcelas</label>
                    <select
                      value={currentInstallments}
                      onChange={(e) => setCurrentInstallments(Number(e.target.value))}
                      className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-gold/30"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                        <option key={n} value={n} className="bg-black text-white">{n}x {n > 1 ? `de ${formatCurrency(parseFloat(currentAmount) / n)}` : "Sem parcelamento"}</option>
                      ))}
                    </select>
                  </div>
                )}

                <PremiumButton onClick={addPayment} variant="outline" className="w-full py-2.5 text-[9px] uppercase tracking-widest font-black">
                  Registrar Pagamento
                </PremiumButton>
              </div>

              {/* Painel Direito: Resumo de Captura */}
              <div className="flex flex-col justify-between bg-white/[0.01] border border-white/5 p-4 rounded-xl space-y-4">
                <div className="space-y-3">
                  <h4 className="text-[9px] font-black uppercase text-white/40 tracking-wider">Pagamentos Adicionados</h4>
                  
                  {payments.length === 0 ? (
                    <p className="text-[10px] text-white/20 italic text-center py-8">Nenhum pagamento registrado ainda.</p>
                  ) : (
                    <div className="space-y-2">
                      {payments.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs bg-white/[0.02] border border-white/5 p-2 rounded-lg">
                          <div className="text-left">
                            <p className="font-bold text-white capitalize">{p.method.replace("_", " ")}</p>
                            <p className="text-[8px] text-white/40 uppercase font-black tracking-wider">
                              {p.installments > 1 ? `${p.installments} parcelas` : "À vista"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gold">{formatCurrency(p.amount)}</span>
                            <button 
                              onClick={() => removePayment(idx)}
                              className="text-white/30 hover:text-red-400 p-0.5"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* File Upload for Receipt */}
                <div className="border-t border-white/5 pt-3 space-y-1.5 text-left">
                  <label className="text-[9px] font-black uppercase tracking-wider text-white/50 block">Anexar Comprovante (Opcional)</label>
                  {receiptUrl ? (
                    <div className="flex items-center justify-between bg-gold/5 border border-gold/15 p-2 rounded-xl text-xs">
                      <a href={receiptUrl} target="_blank" rel="noreferrer" className="text-gold/80 hover:text-gold truncate max-w-[200px] font-mono text-[9px] underline">
                        {receiptUrl.split("/").pop()}
                      </a>
                      <button 
                        onClick={() => setReceiptUrl("")}
                        className="text-white/40 hover:text-red-400 p-1 text-[9px] font-bold"
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
                          if (file) handleReceiptUpload(file);
                        }}
                        disabled={uploadingReceipt}
                        className="w-full bg-white/[0.01] border border-white/5 text-[9px] text-white/40 file:bg-white/5 file:border-0 file:text-[9px] file:text-white file:px-2.5 file:py-1.5 file:rounded-lg file:mr-2 file:cursor-pointer rounded-xl px-2 py-1 outline-none"
                      />
                      {uploadingReceipt && (
                        <p className="text-[9px] text-gold animate-pulse mt-1 font-bold">Carregando comprovante...</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-white/5 pt-3 space-y-2">
                  <div className="flex justify-between text-xs text-white/40">
                    <span>Total a Receber:</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-emerald-400 font-bold">
                    <span>Total Lançado:</span>
                    <span>{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className={`flex justify-between text-xs font-bold ${
                    isPaymentComplete ? "text-emerald-400" : "text-white/60"
                  }`}>
                    <span>Saldo Restante:</span>
                    <span>{formatCurrency(Math.max(0, totalAmount - totalPaid))}</span>
                  </div>

                  <PremiumButton 
                    onClick={handleFinalizeSale}
                    variant="primary" 
                    className="w-full py-3 text-xs uppercase tracking-widest font-black mt-2"
                    disabled={!isPaymentComplete}
                  >
                    Faturar e Finalizar
                  </PremiumButton>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}

      {/* ================= SUCCESS RECEIPT DIALOG ================= */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="glass-dark border border-gold/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.15)] p-6 space-y-6 text-center animate-scale-up">
            
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold font-display text-white mt-1">Faturamento Concluído!</h3>
              <p className="text-[8px] uppercase tracking-wider text-white/30 font-bold">Comprovante de Caixa Emitido</p>
            </div>

            {/* Receipt Details */}
            <div className="bg-[#121212] border border-white/5 rounded-xl p-4 space-y-3.5 text-xs text-left font-mono">
              <div className="border-b border-white/5 border-dashed pb-2.5 flex justify-between items-center text-[10px] text-white/40">
                <span>Venda ID:</span>
                <span>#{completedSale.id.substring(0, 8)}</span>
              </div>
              
              <div className="space-y-1.5">
                <p className="text-[10px] text-white/40">Paciente:</p>
                <p className="font-bold text-white font-body">{completedSale.patient_name}</p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] text-white/40">Formas de Captura:</p>
                {completedSale.payments.map((p: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center font-body text-[11px] text-white/80">
                    <span className="capitalize">{p.method.replace("_", " ")} {p.installments > 1 ? `(${p.installments}x)` : ""}</span>
                    <span className="font-bold">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/5 border-dashed pt-2.5 flex justify-between items-center text-sm font-bold">
                <span className="text-white/40 text-xs font-body">Valor Pago:</span>
                <span className="text-gold font-display">{formatCurrency(completedSale.total)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <PremiumButton 
                onClick={() => setCompletedSale(null)}
                variant="primary" 
                className="flex-1 py-2.5 text-[9px] uppercase tracking-widest font-black"
              >
                Nova Venda
              </PremiumButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
