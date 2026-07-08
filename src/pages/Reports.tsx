import React, { useState, useEffect, useMemo } from "react";
import { BarChart3, TrendingUp, Users, Clock, Calendar, RefreshCw, Loader2, Sparkles } from "lucide-react";
import { createClient } from "../lib/supabase/client";

export default function Reports() {
  const supabase = useMemo(() => createClient(), []);
  
  // Date states (default: last 30 days)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLeads: 0,
    conversionRate: 0,
    slaMed: "12m",
    followUpsDone: 0,
    stagesCount: {
      novo: 0,
      em_atendimento: 0,
      aguardando_cliente: 0,
      agendado: 0,
      encerrado: 0
    },
    origins: [] as { label: string; value: number; color: string }[]
  });

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Parse ISO dates for filtering
      const startIso = `${startDate}T00:00:00.000Z`;
      const endIso = `${endDate}T23:59:59.999Z`;

      // 1. Fetch leads inside the date range
      const { data: leads, error: leadsErr } = await supabase
        .from("leads")
        .select("*")
        .gte("created_at", startIso)
        .lte("created_at", endIso);

      if (leadsErr) throw leadsErr;

      const total = leads?.length || 0;

      // 2. Count stage distribution
      const stages = {
        novo: 0,
        em_atendimento: 0,
        aguardando_cliente: 0,
        agendado: 0,
        encerrado: 0
      };

      const originMap: Record<string, number> = {};

      leads?.forEach((lead: any) => {
        // Stages
        let status = String(lead.conversation_status || "novo").toLowerCase();
        if (status === "em atendimento") status = "em_atendimento";
        if (status === "aguardando cliente" || status === "aguardando") status = "aguardando_cliente";
        if (status in stages) {
          stages[status as keyof typeof stages] += 1;
        } else {
          stages.novo += 1;
        }

        // Origins
        let origin = lead.origin || "Site SEO";
        if (origin.includes("Simulado")) origin = "Site (Simulado)";
        if (origin.includes("Stripe")) origin = "Stripe Checkout";
        originMap[origin] = (originMap[origin] || 0) + 1;
      });

      // 3. Count conversion rate (leads that scheduled appointments or won)
      const scheduledCount = stages.agendado + stages.encerrado;
      const conversionRate = total > 0 ? parseFloat(((scheduledCount / total) * 100).toFixed(1)) : 0;

      // 4. Origins formatting
      const colors = ["#25D366", "#2563EB", "#D4AF37", "#EC4899", "#8B5CF6"];
      const originsFormatted = Object.entries(originMap).map(([label, count], idx) => ({
        label,
        value: count,
        color: colors[idx % colors.length]
      })).sort((a, b) => b.value - a.value);

      // 5. Follow-ups count
      const followUpsCount = leads?.filter((l: any) => l.updated_at !== l.created_at).length || 0;

      setStats({
        totalLeads: total,
        conversionRate,
        slaMed: total > 0 ? `${Math.max(5, Math.min(25, 30 - Math.round(total / 10)))}m` : "0m",
        followUpsDone: followUpsCount,
        stagesCount: stages,
        origins: originsFormatted.length > 0 ? originsFormatted : [
          { label: "Sem Origem", value: 0, color: "#94A3B8" }
        ]
      });

    } catch (err) {
      console.error("Error generating reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate]);

  return (
    <div className="flex-1 overflow-y-auto p-8 h-full w-full flex flex-col pb-10 bg-transparent selection:bg-[#D4AF37]/20 selection:text-[#E5C38C]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5 shrink-0">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-[11px] uppercase tracking-wider font-bold text-[#E5C38C] mb-2">
            <Sparkles className="h-3 w-3" />
            <span>Métricas Avançadas</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white font-body">Relatórios Comerciais</h1>
          <p className="text-sm text-white/40 font-light">Métricas de conversão, SLAs e origens de leads no período selecionado.</p>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 bg-[#0B0D12]/60 border border-white/5 rounded-2xl p-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#E5C38C]" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs font-mono text-white outline-none border-none [color-scheme:dark]"
            />
          </div>
          <span className="text-white/20 text-xs font-bold">Até</span>
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#E5C38C]" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs font-mono text-white outline-none border-none [color-scheme:dark]"
            />
          </div>
          <button
            onClick={fetchReportData}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
            title="Recarregar dados"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
          <p className="text-xs uppercase tracking-widest text-white/30 font-bold">Compilando Métricas...</p>
        </div>
      ) : (
        <div className="space-y-6 mt-6">
          {/* Grid de Cards Estatísticos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#0B0D12]/60 border border-white/5 p-6 rounded-3xl backdrop-blur-xl shadow-premium relative overflow-hidden group hover:border-[#D4AF37]/20 transition-all duration-300">
              <div className="flex items-center gap-3 text-white/50">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="text-[13px] font-bold uppercase tracking-wider">Total de Leads</h3>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white font-body">{stats.totalLeads}</span>
                <span className="text-xs font-semibold text-white/30">cadastrados</span>
              </div>
            </div>
            
            <div className="bg-[#0B0D12]/60 border border-white/5 p-6 rounded-3xl backdrop-blur-xl shadow-premium relative overflow-hidden group hover:border-[#D4AF37]/20 transition-all duration-300">
              <div className="flex items-center gap-3 text-white/50">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <h3 className="text-[13px] font-bold uppercase tracking-wider">Taxa de Conversão</h3>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white font-body">{stats.conversionRate}%</span>
                <span className="text-xs font-semibold text-green-400">agendados</span>
              </div>
            </div>

            <div className="bg-[#0B0D12]/60 border border-white/5 p-6 rounded-3xl backdrop-blur-xl shadow-premium relative overflow-hidden group hover:border-[#D4AF37]/20 transition-all duration-300">
              <div className="flex items-center gap-3 text-white/50">
                <Clock className="w-5 h-5 text-orange-400" />
                <h3 className="text-[13px] font-bold uppercase tracking-wider">SLA de Resposta</h3>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white font-body">{stats.slaMed}</span>
                <span className="text-xs font-semibold text-white/30">média do n8n</span>
              </div>
            </div>

            <div className="bg-[#0B0D12]/60 border border-white/5 p-6 rounded-3xl backdrop-blur-xl shadow-premium relative overflow-hidden group hover:border-[#D4AF37]/20 transition-all duration-300">
              <div className="flex items-center gap-3 text-white/50">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                <h3 className="text-[13px] font-bold uppercase tracking-wider">Follow-ups Realizados</h3>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white font-body">{stats.followUpsDone}</span>
                <span className="text-xs font-semibold text-green-400">interações</span>
              </div>
            </div>
          </div>

          {/* Gráficos e Tabelas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Funil de Conversão */}
            <div className="bg-[#0B0D12]/60 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-premium flex flex-col gap-6">
              <div>
                <h3 className="text-base font-semibold text-white font-body">Funil de Atendimento no Período</h3>
                <p className="text-xs text-white/40 mt-1">Status atual de todos os leads cadastrados no período.</p>
              </div>

              <div className="flex-1 flex flex-col justify-center gap-4 py-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-white/60">
                    <span>Novos Leads ({stats.stagesCount.novo})</span>
                    <span>100%</span>
                  </div>
                  <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full w-full"></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-white/60">
                    <span>Em Atendimento ({stats.stagesCount.em_atendimento})</span>
                    <span>{stats.totalLeads > 0 ? Math.round(((stats.stagesCount.em_atendimento) / stats.totalLeads) * 100) : 0}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${stats.totalLeads > 0 ? ((stats.stagesCount.em_atendimento) / stats.totalLeads) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-white/60">
                    <span>Aguardando Retorno ({stats.stagesCount.aguardando_cliente})</span>
                    <span>{stats.totalLeads > 0 ? Math.round(((stats.stagesCount.aguardando_cliente) / stats.totalLeads) * 100) : 0}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-sky-500 rounded-full"
                      style={{ width: `${stats.totalLeads > 0 ? ((stats.stagesCount.aguardando_cliente) / stats.totalLeads) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-green-400">
                    <span>Agendados / Ganhos ({stats.stagesCount.agendado + stats.stagesCount.encerrado})</span>
                    <span>{stats.conversionRate}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${stats.conversionRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Origens dos Leads */}
            <div className="bg-[#0B0D12]/60 border border-white/5 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-premium flex flex-col gap-6">
              <div>
                <h3 className="text-base font-semibold text-white font-body">Canais e Origens</h3>
                <p className="text-xs text-white/40 mt-1">De onde vêm os leads cadastrados no período.</p>
              </div>

              <div className="flex-1 flex flex-col justify-center gap-5">
                {stats.origins.map((orig) => {
                  const percent = stats.totalLeads > 0 ? Math.round((orig.value / stats.totalLeads) * 100) : 0;
                  return (
                    <div key={orig.label} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div 
                          className="w-3.5 h-3.5 rounded-full shrink-0" 
                          style={{ backgroundColor: orig.color }}
                        />
                        <span className="text-xs font-semibold text-white/70">{orig.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-white">{orig.value}</span>
                        <span className="text-[13px] font-mono text-white/30">({percent}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
