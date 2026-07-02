import React, { useState, useEffect, useMemo } from "react";
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
  Percent
} from "lucide-react";
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
  const [copiedText, setCopiedText] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leadsStats, setLeadsStats] = useState({
    totalCampaignLeads: 0,
    googleLeads: 0,
    metaLeads: 0,
    conversionsCount: 0
  });

  const WEBHOOK_META = "https://rafael-dias-api.vercel.app/api/marketing/webhook?platform=meta&token=rd_live_83726a19f";
  const WEBHOOK_GOOGLE = "https://rafael-dias-api.vercel.app/api/marketing/webhook?platform=google&token=rd_live_83726a19f";

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(""), 2000);
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

      if (!dbCampaigns || dbCampaigns.length === 0) {
        const SAMPLE_CAMPAIGNS: Campaign[] = [
          {
            id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
            name: "Campanha Carrossel Botox 2026",
            platform: "meta_ads",
            status: "active",
            budget: 50.00,
            impressions: 24500,
            clicks: 1220,
            cost: 850.50,
            start_date: "2026-06-01",
            end_date: null,
            lead_count: 3,
            cpl: 283.50,
            conversions: 2
          },
          {
            id: "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
            name: "Bioestimuladores de Colágeno - Vídeo",
            platform: "meta_ads",
            status: "active",
            budget: 75.00,
            impressions: 18200,
            clicks: 940,
            cost: 620.00,
            start_date: "2026-06-15",
            end_date: null,
            lead_count: 2,
            cpl: 310.00,
            conversions: 1
          },
          {
            id: "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
            name: "Preenchimento Labial / Mandíbula - Pesquisa",
            platform: "google_ads",
            status: "active",
            budget: 100.00,
            impressions: 8900,
            clicks: 1050,
            cost: 1240.20,
            start_date: "2026-06-05",
            end_date: null,
            lead_count: 3,
            cpl: 413.40,
            conversions: 3
          },
          {
            id: "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a",
            name: "Clínica Harmonização Facial Parauapebas",
            platform: "google_ads",
            status: "active",
            budget: 80.00,
            impressions: 12000,
            clicks: 1350,
            cost: 980.10,
            start_date: "2026-06-01",
            end_date: null,
            lead_count: 3,
            cpl: 326.70,
            conversions: 2
          },
          {
            id: "e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b",
            name: "Rinomodelação - Antes e Depois",
            platform: "meta_ads",
            status: "paused",
            budget: 40.00,
            impressions: 15000,
            clicks: 650,
            cost: 450.00,
            start_date: "2026-05-10",
            end_date: "2026-06-10",
            lead_count: 1,
            cpl: 450.00,
            conversions: 1
          }
        ];

        setCampaigns(SAMPLE_CAMPAIGNS);
        setLeadsStats({
          totalCampaignLeads: 12,
          googleLeads: 6,
          metaLeads: 6,
          conversionsCount: 8
        });
        setLoading(false);
        return;
      }

      // 2. Fetch Leads with UTM tracking
      const { data: dbLeads, error: leadsErr } = await supabase
        .from("leads")
        .select("*")
        .not("utm_source", "is", null);

      if (leadsErr) throw leadsErr;

      const utmLeads = dbLeads || [];
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

    } catch (err) {
      console.error("Error fetching marketing data:", err);
    } finally {
      setLoading(false);
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-[10px] uppercase tracking-[0.2em] font-bold text-[#E5C38C] mb-2">
            <Sparkles className="h-3 w-3" />
            <span>ROI & Performance</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white font-display">Campanhas Digitais</h1>
          <p className="text-sm text-white/40 font-light">Métricas integradas do Google Ads e Meta Ads do Instituto Rafael Dias.</p>
        </div>

        <button 
          onClick={fetchMarketingData} 
          className="flex items-center gap-2 bg-[#0B0D12]/60 border border-white/5 px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white hover:border-gold/30 hover:bg-white/5 transition-all duration-300"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Recarregar Painel
        </button>
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
                <h3 className="text-[9px] font-bold uppercase tracking-wider">Investimento Total</h3>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-white font-display">R$ {metrics.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                <p className="text-[9px] text-white/30 mt-1">Orçamento Diário Ativo: R$ {metrics.totalBudget.toLocaleString('pt-BR')} /dia</p>
              </div>
            </div>

            {/* Leads Atribuídos */}
            <div className="bg-[#0B0D12]/60 border border-white/5 p-5 rounded-3xl backdrop-blur-xl hover:border-gold/20 transition-all duration-300">
              <div className="flex items-center gap-2.5 text-white/40">
                <Users className="w-4 h-4 text-blue-400" />
                <h3 className="text-[9px] font-bold uppercase tracking-wider">Leads Gerados</h3>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-white font-display">{leadsStats.totalCampaignLeads}</span>
                <p className="text-[9px] text-white/30 mt-1">Google: {leadsStats.googleLeads} | Meta: {leadsStats.metaLeads}</p>
              </div>
            </div>

            {/* CPL Médio */}
            <div className="bg-[#0B0D12]/60 border border-white/5 p-5 rounded-3xl backdrop-blur-xl hover:border-gold/20 transition-all duration-300">
              <div className="flex items-center gap-2.5 text-white/40">
                <Target className="w-4 h-4 text-emerald-400" />
                <h3 className="text-[9px] font-bold uppercase tracking-wider">CPL Médio</h3>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-white font-display">R$ {metrics.avgCpl.toFixed(2)}</span>
                <p className="text-[9px] text-white/30 mt-1">Custo por lead qualificado</p>
              </div>
            </div>

            {/* CTR Médio */}
            <div className="bg-[#0B0D12]/60 border border-white/5 p-5 rounded-3xl backdrop-blur-xl hover:border-gold/20 transition-all duration-300">
              <div className="flex items-center gap-2.5 text-white/40">
                <Percent className="w-4 h-4 text-purple-400" />
                <h3 className="text-[9px] font-bold uppercase tracking-wider">CTR Global</h3>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-white font-display">{metrics.ctr}%</span>
                <p className="text-[9px] text-white/30 mt-1">Total de cliques / Impressões</p>
              </div>
            </div>

            {/* ROI Estimado */}
            <div className="bg-[#0B0D12]/60 border border-[#D4AF37]/20 p-5 rounded-3xl backdrop-blur-xl shadow-gold/5 relative overflow-hidden group hover:border-gold/40 transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full blur-xl pointer-events-none group-hover:bg-gold/10 transition-colors" />
              <div className="flex items-center gap-2.5 text-white/40">
                <TrendingUp className="w-4 h-4 text-gold" />
                <h3 className="text-[9px] font-bold uppercase tracking-wider text-[#E5C38C]">Retorno ROI</h3>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-gold font-display">+{metrics.roi}%</span>
                <p className="text-[9px] text-[#E5C38C]/50 mt-1">Retorno sobre investimento</p>
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
                    <p className="text-[10px] text-white/30">Campanhas de Pesquisa e Local</p>
                  </div>
                </div>
                <span className="text-[10px] text-white/40 font-mono">Investido: R$ {metrics.googleCost.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-3 gap-4 py-2">
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[8px] uppercase tracking-wider text-white/40">Leads Gerados</span>
                  <p className="text-xl font-bold text-white mt-1 font-display">{leadsStats.googleLeads}</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[8px] uppercase tracking-wider text-white/40">CPL Médio</span>
                  <p className="text-xl font-bold text-blue-400 mt-1 font-display">R$ {metrics.googleCpl}</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[8px] uppercase tracking-wider text-white/40">CTR Médio</span>
                  <p className="text-xl font-bold text-white mt-1 font-display">
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
                    <p className="text-[10px] text-white/30">Anúncios no Instagram e Facebook</p>
                  </div>
                </div>
                <span className="text-[10px] text-white/40 font-mono">Investido: R$ {metrics.metaCost.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-3 gap-4 py-2">
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[8px] uppercase tracking-wider text-white/40">Leads Gerados</span>
                  <p className="text-xl font-bold text-white mt-1 font-display">{leadsStats.metaLeads}</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[8px] uppercase tracking-wider text-white/40">CPL Médio</span>
                  <p className="text-xl font-bold text-pink-400 mt-1 font-display">R$ {metrics.metaCpl}</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                  <span className="text-[8px] uppercase tracking-wider text-white/40">CTR Médio</span>
                  <p className="text-xl font-bold text-white mt-1 font-display">
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
                  <tr className="border-b border-white/5 text-[9px] uppercase tracking-wider text-white/30">
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
                  {campaigns.map((c) => {
                    const ctrVal = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
                    return (
                      <tr key={c.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-4 px-4 font-medium text-white font-display text-sm">{c.name}</td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            c.platform === 'google_ads' 
                              ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' 
                              : 'bg-pink-500/10 border border-pink-500/20 text-pink-400'
                          }`}>
                            {c.platform === 'google_ads' ? 'Google' : 'Meta'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            c.status === 'active' 
                              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                              : 'bg-white/5 border border-white/10 text-white/40'
                          }`}>
                            {c.status === 'active' ? 'Ativo' : 'Pausado'}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono text-white/80">R$ {Number(c.cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 px-4 font-mono">
                          {c.clicks} <span className="text-white/30 text-[10px]">({ctrVal.toFixed(1)}%)</span>
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-white">{c.lead_count}</td>
                        <td className="py-4 px-4 font-mono font-medium text-gold">R$ {c.cpl}</td>
                        <td className="py-4 px-4 text-center">
                          <span className="font-bold text-emerald-400">{c.conversions}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

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
                  <span className="text-[9px] uppercase tracking-wider text-white/20 font-bold">API Ativa</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">Instale este endpoint em seu painel do Meta Developer ou utilize o n8n para direcionar os contatos do formulário de anúncio para o CRM do Instituto.</p>
                
                <div className="flex items-center justify-between gap-3 bg-black-void/50 border border-white/5 px-3 py-2 rounded-lg font-mono text-[10px] text-white/70 overflow-hidden relative">
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
                  <span className="text-[9px] uppercase tracking-wider text-white/20 font-bold">Aguardando Envio</span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">Insira esta URL de webhook nas configurações do formulário de lead das suas campanhas de pesquisa do Google Ads. Lembre-se de usar chaves correspondentes.</p>
                
                <div className="flex items-center justify-between gap-3 bg-black-void/50 border border-white/5 px-3 py-2 rounded-lg font-mono text-[10px] text-white/70 overflow-hidden relative">
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
    </div>
  );
}
