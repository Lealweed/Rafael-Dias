import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Target, 
  TrendingUp, 
  Users, 
  DollarSign, 
  RefreshCw, 
  Loader2, 
  Sparkles, 
  Copy, 
  Check, 
  HelpCircle,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Percent,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { createClient } from "../lib/supabase/client";

interface Campaign {
  id: string;
  name: string;
  platform: 'google_ads' | 'meta_ads';
  status: 'active' | 'paused' | 'ended';
  budget: number;
  impressions: number;
  clicks: number;
  cost: number;
  start_date: string;
  end_date: string | null;
  lead_count?: number;
  cpl?: number;
  conversions?: number;
}

export default function Marketing() {
  const supabase = useMemo(() => createClient(), []);
  
  const [loading, setLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [backgroundSyncing, setBackgroundSyncing] = useState(false);
  const autoSyncTriggered = useRef(false);
  const [copiedText, setCopiedText] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [leadsStats, setLeadsStats] = useState({
    totalCampaignLeads: 0,
    googleLeads: 0,
    metaLeads: 0,
    conversionsCount: 0
  });

  const [showConfig, setShowConfig] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: "success" | "error" | "info", text: string } | null>(null);

  // API Credentials States
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [metaAdAccountId, setMetaAdAccountId] = useState("");
  const [googleDevToken, setGoogleDevToken] = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [googleRefreshToken, setGoogleRefreshToken] = useState("");
  const [googleCustomerId, setGoogleCustomerId] = useState("");
  const [savingCreds, setSavingCreds] = useState(false);

  const WEBHOOK_META = "https://rafael-dias-api.vercel.app/api/marketing/webhook?platform=meta&token=rd_live_83726a19f";
  const WEBHOOK_GOOGLE = "https://rafael-dias-api.vercel.app/api/marketing/webhook?platform=google&token=rd_live_83726a19f";

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(""), 2000);
  };

  const triggerBackgroundSync = async () => {
    setBackgroundSyncing(true);
    try {
      const res = await fetch("/api/marketing?type=sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro de sincronização");
      await fetchMarketingData();
    } catch (err) {
      console.error("Error running background sync:", err);
    } finally {
      setBackgroundSyncing(false);
    }
  };

  const fetchMarketingData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Campaigns
      const { data: dbCampaigns, error: campErr } = await supabase
        .from("marketing_campaigns")
        .select("*")
        .order("status", { ascending: true })
        .order("cost", { ascending: false });

      if (campErr) throw campErr;



      // 2. Fetch Leads with UTM tracking
      const { data: dbLeads, error: leadsErr } = await supabase
        .from("leads")
        .select("*")
        .not("utm_source", "is", null);

      if (leadsErr) throw leadsErr;

      const utmLeads = dbLeads || [];
      setAllLeads(utmLeads);
      const totalCampaignLeads = utmLeads.length;
      
      const googleLeads = utmLeads.filter(l => l.utm_source === "google" || l.utm_source === "google_ads").length;
      const metaLeads = utmLeads.filter(l => l.utm_source === "meta" || l.utm_source === "facebook" || l.utm_source === "instagram" || l.utm_source === "meta_ads").length;
      
      // Conversions: Leads in 'agendado' or 'encerrado' status
      const conversionsCount = utmLeads.filter(l => 
        l.conversation_status === "agendado" || l.conversation_status === "encerrado"
      ).length;

      // 3. Process Campaigns Stats
      const processedCampaigns = (dbCampaigns || []).map((camp: any) => {
        const campLeads = utmLeads.filter(l => 
          l.utm_campaign?.toLowerCase().trim() === camp.name.toLowerCase().trim()
        );
        const lCount = campLeads.length;
        const cpl = lCount > 0 ? Number((camp.cost / lCount).toFixed(2)) : 0;
        const convCount = campLeads.filter(l => 
          l.conversation_status === "agendado" || l.conversation_status === "encerrado"
        ).length;

        return {
          ...camp,
          lead_count: lCount,
          cpl,
          conversions: convCount
        };
      });

      setCampaigns(processedCampaigns);
      setLeadsStats({
        totalCampaignLeads,
        googleLeads,
        metaLeads,
        conversionsCount
      });

      // 4. Fetch Credentials
      const { data: dbSettings } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "marketing_credentials")
        .maybeSingle();

      let hasCredentials = false;
      if (dbSettings && dbSettings.value && typeof dbSettings.value === 'object') {
        const val = dbSettings.value as any;
        setMetaAccessToken(val.meta_access_token || "");
        setMetaAdAccountId(val.meta_ad_account_id || "");
        setGoogleDevToken(val.google_developer_token || "");
        setGoogleClientId(val.google_client_id || "");
        setGoogleClientSecret(val.google_client_secret || "");
        setGoogleRefreshToken(val.google_refresh_token || "");
        setGoogleCustomerId(val.google_customer_id || "");

        if ((val.meta_access_token && val.meta_ad_account_id) || 
            (val.google_developer_token && val.google_customer_id)) {
          hasCredentials = true;
        }
      }

      // Determine latest update time
      let latestUpdate: Date | null = null;
      if (dbCampaigns && dbCampaigns.length > 0) {
        const times = dbCampaigns
          .map((c: any) => c.updated_at ? new Date(c.updated_at).getTime() : 0)
          .filter(t => t > 0);
        if (times.length > 0) {
          latestUpdate = new Date(Math.max(...times));
        }
      }
      setLastSyncTime(latestUpdate);

      // Check credentials for auto background sync (every 30 mins)
      if (!autoSyncTriggered.current && hasCredentials) {
        autoSyncTriggered.current = true;
        const now = new Date().getTime();
        const lastSync = latestUpdate ? latestUpdate.getTime() : 0;
        const thirtyMinutes = 30 * 60 * 1000;
        
        if (now - lastSync > thirtyMinutes) {
          triggerBackgroundSync();
        }
      }

    } catch (err) {
      console.error("Error fetching marketing data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCreds(true);
    setSyncMessage(null);
    try {
      const payload = {
        meta_access_token: metaAccessToken.trim(),
        meta_ad_account_id: metaAdAccountId.trim(),
        google_developer_token: googleDevToken.trim(),
        google_client_id: googleClientId.trim(),
        google_client_secret: googleClientSecret.trim(),
        google_refresh_token: googleRefreshToken.trim(),
        google_customer_id: googleCustomerId.trim()
      };

      const { error } = await supabase
        .from("site_settings")
        .upsert({
          key: "marketing_credentials",
          value: payload,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
      setSyncMessage({ type: "success", text: "Credenciais de API salvas com sucesso!" });
    } catch (err: any) {
      console.error("Error saving API credentials:", err);
      setSyncMessage({ type: "error", text: `Erro ao salvar credenciais: ${err.message}` });
    } finally {
      setSavingCreds(false);
    }
  };

  const handleTriggerSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/marketing?type=sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro de servidor na sincronização");

      setSyncMessage({ 
        type: "success", 
        text: `Sincronização concluída: ${data.logs?.join(" ") || "Campanhas atualizadas."}` 
      });
      await fetchMarketingData();
    } catch (err: any) {
      console.error("Error triggering campaigns sync:", err);
      setSyncMessage({ type: "error", text: `Falha na sincronização: ${err.message}` });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchMarketingData();
  }, []);

  // Global Performance Calculations
  const metrics = useMemo(() => {
    const totalCost = campaigns.reduce((acc, c) => acc + Number(c.cost), 0);
    const totalClicks = campaigns.reduce((acc, c) => acc + c.clicks, 0);
    const totalImpressions = campaigns.reduce((acc, c) => acc + c.impressions, 0);
    const totalBudget = campaigns.reduce((acc, c) => acc + (c.status === 'active' ? Number(c.budget) : 0), 0);
    
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCpl = leadsStats.totalCampaignLeads > 0 ? totalCost / leadsStats.totalCampaignLeads : 0;
    
    // Average estimated ticket is R$ 1.800,00 for won leads/appointments
    const estimatedRevenue = leadsStats.conversionsCount * 1800.00;
    const roi = totalCost > 0 ? ((estimatedRevenue - totalCost) / totalCost) * 100 : 0;

    // Platform Split
    const metaCost = campaigns.filter(c => c.platform === 'meta_ads').reduce((acc, c) => acc + Number(c.cost), 0);
    const googleCost = campaigns.filter(c => c.platform === 'google_ads').reduce((acc, c) => acc + Number(c.cost), 0);
    
    const metaCpl = leadsStats.metaLeads > 0 ? metaCost / leadsStats.metaLeads : 0;
    const googleCpl = leadsStats.googleLeads > 0 ? googleCost / leadsStats.googleLeads : 0;

    return {
      totalCost,
      totalClicks,
      totalImpressions,
      totalBudget,
      ctr: parseFloat(ctr.toFixed(2)),
      avgCpl: parseFloat(avgCpl.toFixed(2)),
      roi: parseFloat(roi.toFixed(1)),
      estimatedRevenue,
      metaCost,
      googleCost,
      metaCpl: parseFloat(metaCpl.toFixed(2)),
      googleCpl: parseFloat(googleCpl.toFixed(2))
    };
  }, [campaigns, leadsStats]);

  return (
    <div className="flex-1 overflow-y-auto p-8 h-full w-full flex flex-col pb-10 bg-transparent selection:bg-[#D4AF37]/20 selection:text-[#E5C38C]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5 shrink-0">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-[13px] uppercase tracking-[0.2em] font-bold text-[#E5C38C] mb-2">
            <Sparkles className="h-3 w-3" />
            <span>ROI & Performance</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white font-display">Campanhas Digitais</h1>
          <p className="text-sm text-white/40 font-light flex flex-col gap-1 mt-1">
            <span>Métricas integradas do Google Ads e Meta Ads do Instituto Rafael Dias.</span>
            {lastSyncTime && (
              <span className="text-xs text-white/30">
                Última atualização: {lastSyncTime.toLocaleString("pt-BR")}
              </span>
            )}
            {backgroundSyncing && (
              <span className="text-xs text-[#E5C38C] flex items-center gap-1.5 font-bold animate-pulse mt-0.5">
                <Loader2 className="h-3 w-3 animate-spin text-gold" /> Atualizando dados com Meta/Google Ads em segundo plano...
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleTriggerSync}
            disabled={syncing || backgroundSyncing}
            className="flex items-center gap-2 bg-gold/10 border border-gold/20 hover:bg-gold/20 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-[#E5C38C] hover:shadow-gold disabled:opacity-50 transition-all duration-300 cursor-pointer"
          >
            {syncing || backgroundSyncing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            <span>Sincronizar Métricas</span>
          </button>
          
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 bg-[#0B0D12]/60 border border-white/5 px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white hover:border-gold/30 hover:bg-white/5 transition-all duration-300 cursor-pointer"
          >
            <span>Configurar APIs</span>
          </button>

          <button 
            onClick={fetchMarketingData} 
            className="flex items-center gap-2 bg-[#0B0D12]/60 border border-white/5 px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white hover:border-gold/30 hover:bg-white/5 transition-all duration-300 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Recarregar Painel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
          <p className="text-xs uppercase tracking-widest text-white/30 font-bold">Consolidando dados de anúncios...</p>
        </div>
      ) : (
        <div className="space-y-6 mt-6">
          
          {/* TOP METRICS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            
            {/* Investimento Total */}
            <div className="bg-[#0B0D12]/60 border border-white/5 p-5 rounded-3xl backdrop-blur-xl hover:border-gold/20 transition-all duration-300">
              <div className="flex items-center gap-2.5 text-white/40">
                <DollarSign className="w-4 h-4 text-amber-500" />
                <h3 className="text-[14px] font-bold uppercase tracking-wider">Investimento Total</h3>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-white font-body">R$ {metrics.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <p className="text-[14px] text-white/30 mt-1">Orçamento Diário Ativo: R$ {metrics.totalBudget.toLocaleString('pt-BR')} /dia</p>
              </div>
            </div>

            {/* Leads Atribuídos */}
            <div className="bg-[#0B0D12]/60 border border-white/5 p-5 rounded-3xl backdrop-blur-xl hover:border-gold/20 transition-all duration-300">
              <div className="flex items-center gap-2.5 text-white/40">
                <Users className="w-4 h-4 text-blue-400" />
                <h3 className="text-[14px] font-bold uppercase tracking-wider">Leads Gerados</h3>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-white font-body">{leadsStats.totalCampaignLeads}</span>
                <p className="text-[14px] text-white/30 mt-1">Google: {leadsStats.googleLeads} | Meta: {leadsStats.metaLeads}</p>
              </div>
            </div>

            {/* CPL Médio */}
            <div className="bg-[#0B0D12]/60 border border-white/5 p-5 rounded-3xl backdrop-blur-xl hover:border-gold/20 transition-all duration-300">
              <div className="flex items-center gap-2.5 text-white/40">
                <Target className="w-4 h-4 text-emerald-400" />
                <h3 className="text-[14px] font-bold uppercase tracking-wider">CPL Médio</h3>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-white font-body">R$ {metrics.avgCpl.toFixed(2)}</span>
                <p className="text-[14px] text-white/30 mt-1">Custo por lead qualificado</p>
              </div>
            </div>

            {/* CTR Médio */}
            <div className="bg-[#0B0D12]/60 border border-white/5 p-5 rounded-3xl backdrop-blur-xl hover:border-gold/20 transition-all duration-300">
              <div className="flex items-center gap-2.5 text-white/40">
                <Percent className="w-4 h-4 text-purple-400" />
                <h3 className="text-[14px] font-bold uppercase tracking-wider">CTR Global</h3>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-white font-body">{metrics.ctr}%</span>
                <p className="text-[14px] text-white/30 mt-1">Total de cliques / Impressões</p>
              </div>
            </div>

            {/* ROI Estimado */}
            <div className="bg-[#0B0D12]/60 border border-[#D4AF37]/20 p-5 rounded-3xl backdrop-blur-xl shadow-gold/5 relative overflow-hidden group hover:border-gold/40 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full blur-xl pointer-events-none group-hover:bg-gold/10 transition-colors" />
              <div className="flex items-center gap-2.5 text-white/40">
                <TrendingUp className="w-4 h-4 text-gold" />
                <h3 className="text-[14px] font-bold uppercase tracking-wider text-[#E5C38C]">Retorno ROI</h3>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-gold font-body">+{metrics.roi}%</span>
                <p className="text-[14px] text-[#E5C38C]/50 mt-1">Retorno sobre investimento</p>
              </div>
            </div>

          </div>

          {/* PLATFORMS BREAKDOWN & COMPARISON */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Google Ads Analytics */}
            <div className="bg-[#0B0D12]/60 border border-white/5 rounded-3xl p-6 backdrop-blur-xl flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <span className="text-xs font-bold text-blue-400">G</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Google Ads</h4>
                    <p className="text-[13px] text-white/30">Campanhas de Pesquisa e Local</p>
                  </div>
                </div>
                <span className="text-[13px] text-white/40 font-mono">Investido: R$ {metrics.googleCost.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-3 gap-4 py-2">
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[13px] uppercase tracking-wider text-white/40">Leads Gerados</span>
                  <p className="text-xl font-bold text-white mt-1 font-body">{leadsStats.googleLeads}</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[13px] uppercase tracking-wider text-white/40">CPL Médio</span>
                  <p className="text-xl font-bold text-blue-400 mt-1 font-body">R$ {metrics.googleCpl}</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[13px] uppercase tracking-wider text-white/40">CTR Médio</span>
                  <p className="text-xl font-bold text-white mt-1 font-body">
                    {campaigns.filter(c => c.platform === 'google_ads').length > 0
                      ? (campaigns.filter(c => c.platform === 'google_ads').reduce((acc, c) => acc + (c.clicks/c.impressions)*100, 0) / campaigns.filter(c => c.platform === 'google_ads').length).toFixed(1)
                      : "0"}%
                  </p>
                </div>
              </div>
            </div>

            {/* Meta Ads Analytics */}
            <div className="bg-[#0B0D12]/60 border border-white/5 rounded-3xl p-6 backdrop-blur-xl flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                    <span className="text-xs font-bold text-pink-400">M</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">Meta Ads</h4>
                    <p className="text-[13px] text-white/30">Anúncios no Instagram e Facebook</p>
                  </div>
                </div>
                <span className="text-[13px] text-white/40 font-mono">Investido: R$ {metrics.metaCost.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-3 gap-4 py-2">
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[13px] uppercase tracking-wider text-white/40">Leads Gerados</span>
                  <p className="text-xl font-bold text-white mt-1 font-body">{leadsStats.metaLeads}</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[13px] uppercase tracking-wider text-white/40">CPL Médio</span>
                  <p className="text-xl font-bold text-pink-400 mt-1 font-body">R$ {metrics.metaCpl}</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[13px] uppercase tracking-wider text-white/40">CTR Médio</span>
                  <p className="text-xl font-bold text-white mt-1 font-body">
                    {campaigns.filter(c => c.platform === 'meta_ads').length > 0
                      ? (campaigns.filter(c => c.platform === 'meta_ads').reduce((acc, c) => acc + (c.clicks/c.impressions)*100, 0) / campaigns.filter(c => c.platform === 'meta_ads').length).toFixed(1)
                      : "0"}%
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* CAMPAIGNS PERFORMANCE LIST */}
          <div className="bg-[#0B0D12]/60 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
            <div className="pb-4 border-b border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-medium text-white font-serif">Desempenho por Campanha</h3>
                <p className="text-xs text-white/40 mt-1">Estatísticas detalhadas de cada canal de anúncio no sistema.</p>
              </div>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[14px] uppercase tracking-wider text-white/30">
                    <th className="py-3 px-4">Campanha</th>
                    <th className="py-3 px-4">Canal</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Investimento</th>
                    <th className="py-3 px-4">Cliques / CTR</th>
                    <th className="py-3 px-4 text-center">Leads</th>
                    <th className="py-3 px-4">CPL</th>
                    <th className="py-3 px-4 text-center">Agendados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-white/30 italic">
                        Nenhuma campanha de marketing ativa encontrada.
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((c) => {
                      const ctrVal = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
                      return (
                        <tr 
                          key={c.id} 
                          onClick={() => setSelectedCampaign(c)}
                          className="group hover:bg-white/[0.03] hover:shadow-inner cursor-pointer transition-all duration-300"
                        >
                          <td className="py-4 px-4 font-medium text-white font-body text-sm flex items-center gap-2 group-hover:text-gold transition-colors">
                            <ChevronRight className="h-3.5 w-3.5 text-gold opacity-0 group-hover:opacity-100 transition-all duration-300 shrink-0" />
                            <span>{c.name}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[14px] font-bold ${
                              c.platform === 'google_ads' 
                                ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' 
                                : 'bg-pink-500/10 border border-pink-500/20 text-pink-400'
                            }`}>
                              {c.platform === 'google_ads' ? 'Google' : 'Meta'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[14px] font-bold ${
                              c.status === 'active' 
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                                : 'bg-white/5 border border-white/10 text-white/40'
                            }`}>
                              {c.status === 'active' ? 'Ativo' : 'Pausado'}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-mono text-white/80">R$ {Number(c.cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 px-4 font-mono">
                            {c.clicks} <span className="text-white/30 text-[13px]">({ctrVal.toFixed(1)}%)</span>
                          </td>
                          <td className="py-4 px-4 text-center font-bold text-white">{c.lead_count}</td>
                          <td className="py-4 px-4 font-mono font-medium text-gold">R$ {c.cpl}</td>
                          <td className="py-4 px-4 text-center">
                            <span className="font-bold text-emerald-400">{c.conversions}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sync & Feedback Notifications */}
          {syncMessage && (
            <div className={`p-4 rounded-2xl flex items-center justify-between border backdrop-blur-xl ${
              syncMessage.type === "success" 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}>
              <span className="text-xs font-bold uppercase tracking-wider">{syncMessage.text}</span>
              <button onClick={() => setSyncMessage(null)} className="text-white/40 hover:text-white text-xs font-bold uppercase">Fechar</button>
            </div>
          )}

          {/* CONFIGURATION PANEL */}
          {showConfig && (
            <div className="bg-[#0B0D12]/80 border border-gold/20 rounded-3xl p-6 backdrop-blur-xl flex flex-col gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none">
                <Target className="h-32 w-32 text-gold" />
              </div>

              <div>
                <h3 className="text-lg font-medium text-gold font-serif">Configuração de APIs (Meta & Google Ads)</h3>
                <p className="text-xs text-white/40 mt-1">Insira as credenciais de desenvolvedor para que o CRM sincronize relatórios de cliques, impressões e custos automaticamente.</p>
              </div>

              <form onSubmit={handleSaveCredentials} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Meta Ads Credentials */}
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase tracking-widest text-pink-400 font-black border-b border-white/5 pb-2">Meta Ads (Facebook/Instagram)</h4>
                    
                    <div className="space-y-2">
                      <label className="text-[13px] font-black uppercase tracking-wider text-white/50 block">Access Token</label>
                      <input 
                        type="password"
                        value={metaAccessToken}
                        onChange={(e) => setMetaAccessToken(e.target.value)}
                        placeholder="EAAB..."
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-gold/30"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[13px] font-black uppercase tracking-wider text-white/50 block">Ad Account ID</label>
                      <input 
                        type="text"
                        value={metaAdAccountId}
                        onChange={(e) => setMetaAdAccountId(e.target.value)}
                        placeholder="act_123456789"
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-gold/30"
                      />
                    </div>
                  </div>

                  {/* Google Ads Credentials */}
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase tracking-widest text-blue-400 font-black border-b border-white/5 pb-2">Google Ads API</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[13px] font-black uppercase tracking-wider text-white/50 block">Developer Token</label>
                        <input 
                          type="password"
                          value={googleDevToken}
                          onChange={(e) => setGoogleDevToken(e.target.value)}
                          placeholder="Dev Token"
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-gold/30"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[13px] font-black uppercase tracking-wider text-white/50 block">Customer ID (ID da Conta)</label>
                        <input 
                          type="text"
                          value={googleCustomerId}
                          onChange={(e) => setGoogleCustomerId(e.target.value)}
                          placeholder="123-456-7890"
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-gold/30"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[13px] font-black uppercase tracking-wider text-white/50 block">Client ID</label>
                        <input 
                          type="text"
                          value={googleClientId}
                          onChange={(e) => setGoogleClientId(e.target.value)}
                          placeholder="OAuth Client ID"
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-gold/30"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[13px] font-black uppercase tracking-wider text-white/50 block">Client Secret</label>
                        <input 
                          type="password"
                          value={googleClientSecret}
                          onChange={(e) => setGoogleClientSecret(e.target.value)}
                          placeholder="OAuth Client Secret"
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-gold/30"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[13px] font-black uppercase tracking-wider text-white/50 block">Refresh Token</label>
                      <input 
                        type="password"
                        value={googleRefreshToken}
                        onChange={(e) => setGoogleRefreshToken(e.target.value)}
                        placeholder="Refresh Token"
                        className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs outline-none focus:border-gold/30"
                      />
                    </div>
                  </div>

                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <button 
                    type="button"
                    onClick={() => setShowConfig(false)}
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={savingCreds}
                    className="px-5 py-2.5 rounded-xl bg-gold text-black shadow-gold hover:opacity-90 text-xs uppercase tracking-widest font-black transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {savingCreds ? "Salvando..." : "Salvar Configurações"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* INTEGRATION SETTINGS */}
          <div className="bg-[#0B0D12]/60 border border-white/5 rounded-3xl p-6 backdrop-blur-xl flex flex-col gap-6">
            <div>
              <h3 className="text-lg font-medium text-white font-serif">Integração com Fontes de Tráfego</h3>
              <p className="text-xs text-white/40 mt-1">Conecte seus formulários de leads do Meta Ads e extensões do Google Ads para importar contatos automaticamente.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Meta Webhook Card */}
              <div className="border border-white/5 bg-white/[0.01] p-5 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-pink-400 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-pink-500 animate-pulse" />
                    Webhook do Meta Lead Ads
                  </h4>
                  <span className="text-[14px] uppercase tracking-wider text-white/20 font-bold">API Ativa</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">Instale este endpoint em seu painel do Meta Developer ou utilize o n8n para direcionar os contatos do formulário de anúncio para o CRM do Instituto.</p>
                
                <div className="flex items-center justify-between gap-3 bg-black-void/50 border border-white/5 px-3 py-2 rounded-lg font-mono text-[13px] text-white/70 overflow-hidden relative">
                  <span className="truncate pr-12 select-all">{WEBHOOK_META}</span>
                  <button 
                    onClick={() => handleCopy(WEBHOOK_META, "meta")}
                    className="absolute right-2 bg-[#0B0D12] p-1.5 rounded-md hover:bg-white/5 text-white/60 hover:text-white transition-all duration-300"
                    title="Copiar link"
                  >
                    {copiedText === "meta" ? <Check className="h-3 w-3 text-gold" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {/* Google Webhook Card */}
              <div className="border border-white/5 bg-white/[0.01] p-5 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                    Google Ads Lead Form Ext
                  </h4>
                  <span className="text-[14px] uppercase tracking-wider text-white/20 font-bold">Aguardando Envio</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">Insira esta URL de webhook nas configurações do formulário de lead das suas campanhas de pesquisa do Google Ads. Lembre-se de usar chaves correspondentes.</p>
                
                <div className="flex items-center justify-between gap-3 bg-black-void/50 border border-white/5 px-3 py-2 rounded-lg font-mono text-[13px] text-white/70 overflow-hidden relative">
                  <span className="truncate pr-12 select-all">{WEBHOOK_GOOGLE}</span>
                  <button 
                    onClick={() => handleCopy(WEBHOOK_GOOGLE, "google")}
                    className="absolute right-2 bg-[#0B0D12] p-1.5 rounded-md hover:bg-white/5 text-white/60 hover:text-white transition-all duration-300"
                    title="Copiar link"
                  >
                    {copiedText === "google" ? <Check className="h-3 w-3 text-gold" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {selectedCampaign && (
        <CampaignDetailsModal 
          campaign={selectedCampaign} 
          allLeads={allLeads}
          onClose={() => setSelectedCampaign(null)} 
        />
      )}
    </div>
  );
}

interface CampaignDetailsModalProps {
  campaign: Campaign;
  allLeads: any[];
  onClose: () => void;
}

function CampaignDetailsModal({ campaign, allLeads, onClose }: CampaignDetailsModalProps) {
  // Filter leads that belong to this campaign
  const campaignLeads = useMemo(() => {
    return allLeads.filter(l => 
      l.utm_campaign?.toLowerCase().trim() === campaign.name.toLowerCase().trim()
    );
  }, [campaign.name, allLeads]);

  // Conversions are leads in agendado or encerrado status
  const conversionsCount = useMemo(() => {
    return campaignLeads.filter(l => 
      l.conversation_status === "agendado" || l.conversation_status === "encerrado"
    ).length;
  }, [campaignLeads]);

  // Calculate CTR, CPC, CPL
  const ctrVal = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
  const cpcVal = campaign.clicks > 0 ? campaign.cost / campaign.clicks : 0;
  const cplVal = campaignLeads.length > 0 ? campaign.cost / campaignLeads.length : 0;
  const convRateVal = campaignLeads.length > 0 ? (conversionsCount / campaignLeads.length) * 100 : 0;

  // Funnel calculations
  const ctrPercent = ctrVal.toFixed(2);
  const clickToLeadPercent = campaign.clicks > 0 ? ((campaignLeads.length / campaign.clicks) * 100).toFixed(1) : "0";
  const leadToConvPercent = campaignLeads.length > 0 ? ((conversionsCount / campaignLeads.length) * 100).toFixed(1) : "0";

  // Helper to format date & hours beautifully
  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-[#0B0D12]/95 border border-white/10 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 flex flex-col gap-6 relative shadow-gold/10 text-white scrollbar-hide"
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white p-2 rounded-xl transition-all cursor-pointer z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="border-b border-white/5 pb-4">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-widest ${
            campaign.platform === 'google_ads' 
              ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' 
              : 'bg-pink-500/10 border border-pink-500/20 text-pink-400'
          }`}>
            {campaign.platform === 'google_ads' ? 'Google Ads' : 'Meta Ads'}
          </span>
          <h2 className="text-xl font-bold tracking-tight text-white font-serif mt-2 pr-8">{campaign.name}</h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-xs text-white/50">
            <span className={`h-2 w-2 rounded-full ${campaign.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-white/30'}`} />
            <span className="capitalize">{campaign.status === 'active' ? 'Ativa' : 'Pausada'}</span>
            <span className="text-white/20">•</span>
            <span>Orçamento: R$ {campaign.budget.toFixed(2)}/dia</span>
            {campaign.start_date && (
              <>
                <span className="text-white/20">•</span>
                <span>Iniciada em: {formatDateTime(campaign.start_date)}</span>
              </>
            )}
            {campaign.end_date && (
              <>
                <span className="text-white/20">•</span>
                <span>Término: {formatDateTime(campaign.end_date)}</span>
              </>
            )}
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Investimento</span>
            <p className="text-lg font-bold text-white mt-1 font-body">R$ {Number(campaign.cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Cliques / CTR</span>
            <p className="text-lg font-bold text-white mt-1 font-body">{campaign.clicks} <span className="text-xs text-white/40 font-light">({ctrPercent}%)</span></p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Leads / CPL</span>
            <p className="text-lg font-bold text-gold mt-1 font-body">{campaignLeads.length} <span className="text-xs text-[#E5C38C]/60 font-light">(R$ {cplVal.toFixed(2)})</span></p>
          </div>
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Agendados (ROI)</span>
            <p className="text-lg font-bold text-emerald-400 mt-1 font-body">{conversionsCount} <span className="text-xs text-emerald-400/60 font-light">({convRateVal.toFixed(1)}%)</span></p>
          </div>
        </div>

        {/* Funnel Section */}
        <div className="bg-white/[0.01] border border-white/5 p-6 rounded-3xl">
          <h3 className="text-sm font-semibold text-white mb-4">Funil de Conversão da Campanha</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            
            {/* Stage 1 */}
            <div className="flex flex-col p-3 bg-white/[0.02] border border-white/5 rounded-2xl relative">
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">1. Visualizações</span>
              <span className="text-xl font-bold text-white mt-1 font-body">{campaign.impressions.toLocaleString()}</span>
              <span className="text-[10px] text-white/30 mt-1">Impressões do anúncio</span>
            </div>
            
            {/* Connector 1 */}
            <div className="flex flex-row md:flex-col justify-center items-center gap-1 text-[#E5C38C] font-mono text-xs font-bold py-1 md:py-0">
              <span className="bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full text-[10px]">CTR: {ctrPercent}%</span>
              <span className="hidden md:inline">➔</span>
              <span className="inline md:hidden">↓</span>
            </div>

            {/* Stage 2 */}
            <div className="flex flex-col p-3 bg-white/[0.02] border border-white/5 rounded-2xl relative">
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">2. Cliques no Link</span>
              <span className="text-xl font-bold text-white mt-1 font-body">{campaign.clicks.toLocaleString()}</span>
              <span className="text-[10px] text-white/30 mt-1">CPC Médio: R$ {cpcVal.toFixed(2)}</span>
            </div>

            {/* Connector 2 */}
            <div className="flex flex-row md:flex-col justify-center items-center gap-1 text-[#E5C38C] font-mono text-xs font-bold py-1 md:py-0">
              <span className="bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full text-[10px]">Leads: {clickToLeadPercent}%</span>
              <span className="hidden md:inline">➔</span>
              <span className="inline md:hidden">↓</span>
            </div>

            {/* Stage 3 */}
            <div className="flex flex-col p-3 bg-white/[0.02] border border-white/5 rounded-2xl relative">
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">3. Leads Criados</span>
              <span className="text-xl font-bold text-white mt-1 font-body">{campaignLeads.length}</span>
              <span className="text-[10px] text-white/30 mt-1">Contatos no CRM</span>
            </div>

            {/* Connector 3 */}
            <div className="flex flex-row md:flex-col justify-center items-center gap-1 text-[#E5C38C] font-mono text-xs font-bold py-1 md:py-0">
              <span className="bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full text-[10px]">Conv.: {leadToConvPercent}%</span>
              <span className="hidden md:inline">➔</span>
              <span className="inline md:hidden">↓</span>
            </div>

            {/* Stage 4 */}
            <div className="flex flex-col p-3 bg-gold/10 border border-gold/20 rounded-2xl relative">
              <span className="text-[10px] uppercase tracking-wider text-[#E5C38C] font-bold">4. Agendados</span>
              <span className="text-xl font-bold text-gold mt-1 font-body">{conversionsCount}</span>
              <span className="text-[10px] text-[#E5C38C]/70 mt-1">Clientes convertidos</span>
            </div>

          </div>
        </div>

        {/* Leads Table Section */}
        <div className="flex-1 flex flex-col min-h-[250px]">
          <h3 className="text-sm font-semibold text-white mb-3">Leads Capturados nesta Campanha ({campaignLeads.length})</h3>
          <div className="flex-1 border border-white/5 bg-white/[0.01] rounded-2xl overflow-hidden overflow-y-auto max-h-[300px]">
            {campaignLeads.length === 0 ? (
              <div className="h-full flex items-center justify-center py-12 text-white/30 italic text-xs">
                Nenhum lead atribuído a esta campanha no momento.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02] text-white/40 uppercase tracking-wider font-bold">
                    <th className="py-2.5 px-4">Nome</th>
                    <th className="py-2.5 px-4">Telefone</th>
                    <th className="py-2.5 px-4">Origem</th>
                    <th className="py-2.5 px-4">Temperatura</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Criado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white/70">
                  {campaignLeads.map((lead) => {
                    const dateStr = lead.created_at ? new Date(lead.created_at).toLocaleDateString("pt-BR") : "--";
                    
                    // Temperature badge
                    let tempColor = "bg-white/10 text-white/60";
                    if (lead.temperature === "hot") tempColor = "bg-red-500/15 text-red-400 border border-red-500/20";
                    else if (lead.temperature === "warm") tempColor = "bg-amber-500/15 text-amber-400 border border-amber-500/20";
                    else if (lead.temperature === "cold") tempColor = "bg-blue-500/15 text-blue-400 border border-blue-500/20";
                    
                    // Status badge
                    let statusColor = "bg-white/5 border border-white/10 text-white/60";
                    if (lead.conversation_status === "agendado" || lead.conversation_status === "encerrado") {
                      statusColor = "bg-emerald-500/15 border border-emerald-500/20 text-emerald-400";
                    } else if (lead.conversation_status === "em_atendimento") {
                      statusColor = "bg-amber-500/15 border border-amber-500/20 text-amber-400";
                    }

                    return (
                      <tr key={lead.id} className="hover:bg-white/[0.01]">
                        <td className="py-2.5 px-4 font-semibold text-white">{lead.full_name || "Sem Nome"}</td>
                        <td className="py-2.5 px-4 font-mono">{lead.phone || "--"}</td>
                        <td className="py-2.5 px-4 capitalize">{lead.origin || lead.utm_source || "Meta Ads"}</td>
                        <td className="py-2.5 px-4">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${tempColor}`}>
                            {lead.temperature || "warm"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${statusColor}`}>
                            {lead.conversation_status?.replace('_', ' ') || "novo"}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-white/40">{dateStr}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
