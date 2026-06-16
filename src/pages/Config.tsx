import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  Image as ImageIcon,
  Film,
  Save,
  RefreshCw,
  Copy,
  Eye,
  RotateCcw,
  Check,
  LayoutGrid,
  FileImage,
  Sliders,
  TrendingUp,
  ExternalLink
} from "lucide-react";
import { createClient } from "../lib/supabase/client";
import {
  fetchSiteSettings,
  mergeMediaSettings,
  saveSiteSettings,
  DEFAULT_MEDIA_SETTINGS,
  SITE_MEDIA_KEYS,
} from "../lib/siteSettings";

const MEDIA_LABELS: Record<string, string> = {
  login_bg_image: "Fundo de Login",
  home_hero_video: "Vídeo de Apresentação (Hero)",
  home_hero_portrait_image: "Imagem Mobile/Vertical (Hero)",
  bento_service_image_0: "Painel de Serviços: Imagem 1",
  bento_service_image_1: "Painel de Serviços: Imagem 2",
  bento_service_image_2: "Painel de Serviços: Imagem 3",
  bento_service_image_3: "Painel de Serviços: Imagem 4",
  patient_before_image_0: "Caso 1: Imagem Antes",
  patient_after_image_0: "Caso 1: Imagem Depois",
  patient_before_image_1: "Caso 2: Imagem Antes",
  patient_after_image_1: "Caso 2: Imagem Depois",
  patient_before_image_2: "Caso 3: Imagem Antes",
  patient_after_image_2: "Caso 3: Imagem Depois",
};

const CATEGORIES = {
  hero: {
    label: "Geral & Hero",
    icon: Sliders,
    keys: ["login_bg_image", "home_hero_video", "home_hero_portrait_image"],
  },
  bento: {
    label: "Painel de Serviços",
    icon: LayoutGrid,
    keys: ["bento_service_image_0", "bento_service_image_1", "bento_service_image_2", "bento_service_image_3"],
  },
  cases: {
    label: "Antes & Depois",
    icon: TrendingUp,
    keys: [
      "patient_before_image_0",
      "patient_after_image_0",
      "patient_before_image_1",
      "patient_after_image_1",
      "patient_before_image_2",
      "patient_after_image_2",
    ],
  },
};

export default function ConfigPage() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_MEDIA_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<keyof typeof CATEGORIES>("hero");

  // Metas states
  const [goalAppointments, setGoalAppointments] = useState(600);
  const [goalLeads, setGoalLeads] = useState(1000);
  const [goalRevenue, setGoalRevenue] = useState(150000);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [updatingGoals, setUpdatingGoals] = useState(false);

  const supabase = createClient();

  const fetchGoals = async () => {
    setGoalsLoading(true);
    try {
      const now = new Date();
      const { data, error } = await supabase
        .from('crm_goals')
        .select('*')
        .eq('month', now.getMonth() + 1)
        .eq('year', now.getFullYear());

      if (data) {
        data.forEach((g: any) => {
          if (g.goal_type === 'appointments') setGoalAppointments(Number(g.target_value));
          if (g.goal_type === 'leads') setGoalLeads(Number(g.target_value));
          if (g.goal_type === 'revenue') setGoalRevenue(Number(g.target_value));
        });
      }
    } catch (err) {
      console.error("Error fetching goals:", err);
    } finally {
      setGoalsLoading(false);
    }
  };

  const handleUpdateGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingGoals(true);
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const goalPayloads = [
        { goal_type: 'appointments', target_value: goalAppointments, month, year },
        { goal_type: 'leads', target_value: goalLeads, month, year },
        { goal_type: 'revenue', target_value: goalRevenue, month, year }
      ];

      for (const payload of goalPayloads) {
        const { error } = await supabase
          .from('crm_goals')
          .upsert(payload, { onConflict: 'goal_type,month,year' });
        if (error) throw error;
      }

      setStatusMessage({ type: "success", text: "Metas comerciais atualizadas com sucesso para o mês atual!" });
    } catch (err: any) {
      console.error("Failed to update goals:", err);
      setStatusMessage({ type: "error", text: "Erro ao atualizar metas: " + err.message });
    } finally {
      setUpdatingGoals(false);
    }
  };

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealthStatus(data);
    } catch (e) {
      setHealthStatus({ error: "Failed to reach API" });
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    setSettingsLoading(true);
    setSettingsError(null);
    const result = await fetchSiteSettings();
    if (result.ok && result.settings) {
      setSettings(mergeMediaSettings(result.settings));
    } else {
      setSettingsError(result.error || "Não foi possível carregar as configurações de mídia.");
    }
    setSettingsLoading(false);
  };

  useEffect(() => {
    fetchHealth();
    fetchSettings();
    fetchGoals();
  }, []);

  const handleFieldChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileUpload = async (key: string, file: File) => {
    if (!file) return;
    setUploadingKey(key);
    setStatusMessage(null);

    try {
      const fileExt = file.name.split(".").pop() || "";
      const cleanKey = key.replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = `${cleanKey}_${Date.now()}.${fileExt}`;
      const filePath = `settings/${fileName}`;

      // Upload file to Supabase Storage 'site-assets' bucket
      const { data, error } = await supabase.storage
        .from("site-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("site-assets")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;
      handleFieldChange(key, publicUrl);
      setStatusMessage({ type: "success", text: `Upload de "${MEDIA_LABELS[key] || key}" realizado com sucesso!` });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: "error", text: `Erro no upload: ${err.message || "tente novamente."}` });
    } finally {
      setUploadingKey(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setStatusMessage(null);
    const result = await saveSiteSettings(settings);
    if (result.ok) {
      setStatusMessage({ type: "success", text: "Configurações salvas e aplicadas em produção com sucesso! ✨" });
    } else {
      setStatusMessage({ type: "error", text: `Erro ao salvar: ${result.error || "desconhecido"}` });
    }
    setSaving(false);
  };

  const handleCopyLink = (key: string, val: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRestoreDefault = (key: string) => {
    const defaultVal = DEFAULT_MEDIA_SETTINGS[key] || "";
    handleFieldChange(key, defaultVal);
    setStatusMessage({ type: "success", text: `Link original de "${MEDIA_LABELS[key]}" restaurado na visualização. Lembre-se de salvar!` });
  };

  const isImageUrl = (url: string) => {
    if (!url) return false;
    return (
      /\.(jpeg|jpg|gif|png|webp|svg|avif)/i.test(url) ||
      url.startsWith("/assets/") ||
      url.includes("supabase.co/storage/v1/object/public/") ||
      url.includes("supabase.com/storage/v1/object/public/")
    );
  };

  const isVideoUrl = (url: string) => {
    if (!url) return false;
    return /\.(mp4|webm|ogg|mov)/i.test(url) || url.includes("video") || url.includes("pexels.com/video");
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 h-full w-full font-sans bg-[#07090E] selection:bg-[#D4AF37]/20 selection:text-[#E5C38C] pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-white font-serif">
            Configurações & <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E5C38C] via-[#D4AF37] to-[#B8860B]">Mídias</span>
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] text-[#E5C38C] font-semibold mt-1">
            Personalize imagens, vídeos da landing page e monitore as integrações do sistema.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchHealth();
              fetchSettings();
              setStatusMessage(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-[#0E1118]/80 text-xs font-semibold text-[#E5C38C] hover:bg-white/5 hover:border-[#D4AF37]/40 transition-all shadow-sm active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sincronizar</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving || settingsLoading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-tr from-[#D4AF37] via-[#E5C38C] to-[#B8860B] text-xs font-bold text-[#0B0D12] hover:shadow-[0_4px_20px_rgba(212,175,55,0.3)] transition-all disabled:opacity-50 active:scale-95 shadow-md"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Salvar Tudo</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-sm leading-relaxed flex items-start gap-3 backdrop-blur-md transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] ${
            statusMessage.type === "success"
              ? "bg-green-500/10 border-green-500/35 text-green-300"
              : "bg-red-500/10 border-red-500/35 text-red-300"
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
          </div>
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
        {/* MEDIA MANAGEMENT */}
        <div className="bg-[#0B0D12]/70 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl p-6 md:p-8 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
            <div>
              <h2 className="text-xl font-medium tracking-tight text-white font-serif">Mídias e Arquivos</h2>
              <p className="text-xs text-white/40 mt-1">Selecione uma categoria abaixo para editar os arquivos do site.</p>
            </div>
          </div>

          {/* Elegant Category Tabs */}
          <div className="grid grid-cols-3 gap-2 bg-[#07090E]/80 p-1.5 rounded-2xl border border-white/5">
            {Object.entries(CATEGORIES).map(([catKey, cat]) => {
              const Icon = cat.icon;
              const isActive = activeTab === catKey;
              return (
                <button
                  key={catKey}
                  onClick={() => setActiveTab(catKey as any)}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? "bg-gradient-to-tr from-[#D4AF37]/20 to-[#E5C38C]/10 border border-[#D4AF37]/30 text-[#E5C38C] shadow-inner"
                      : "text-white/40 hover:text-white/80 hover:bg-white/[0.02] border border-transparent"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#E5C38C]" : "text-white/40"}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {settingsLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
              <span className="text-xs text-white/40 tracking-widest uppercase font-mono">Buscando configurações...</span>
            </div>
          ) : settingsError ? (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-5 text-sm text-red-200">
              {settingsError}
            </div>
          ) : (
            <div className="grid gap-6">
              {CATEGORIES[activeTab].keys.map((key) => {
                const value = settings[key] || "";
                const isImage = isImageUrl(value);
                const isVideo = isVideoUrl(value);

                return (
                  <div
                    key={key}
                    className="group relative flex flex-col md:flex-row gap-6 p-5 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-[#D4AF37]/20 transition-all duration-300 shadow-sm"
                  >
                    {/* Media Preview Box */}
                    <div className="w-full md:w-36 h-36 shrink-0 rounded-2xl bg-[#07090E] border border-white/5 overflow-hidden flex flex-col items-center justify-center relative shadow-inner group-hover:border-[#D4AF37]/30 transition-all">
                      {isImage && (
                        <img
                          src={value}
                          alt={MEDIA_LABELS[key]}
                          className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      )}
                      {isVideo && (
                        <div className="flex flex-col items-center justify-center h-full w-full bg-[#0E1118] p-4 text-center">
                          <Film className="w-8 h-8 text-[#E5C38C] mb-2 animate-pulse" />
                          <span className="text-[10px] text-white/50 font-mono tracking-widest uppercase truncate max-w-full">
                            Vídeo Ativo
                          </span>
                        </div>
                      )}
                      {!isImage && !isVideo && (
                        <div className="flex flex-col items-center gap-2">
                          <ImageIcon className="w-8 h-8 text-white/20" />
                          <span className="text-[9px] text-white/30 font-semibold tracking-wider">SEM PREVIEW</span>
                        </div>
                      )}
                    </div>

                    {/* Inputs & Configuration */}
                    <div className="flex-1 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold tracking-wide text-[#E5C38C] font-serif">
                            {MEDIA_LABELS[key] || key}
                          </span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-white/50 font-mono uppercase">
                            {isVideo ? "Vídeo" : "Imagem"}
                          </span>
                        </div>
                        <span className="text-[10px] text-white/30 font-mono tracking-wider block mt-1">
                          Parâmetro: {key}
                        </span>
                      </div>

                      {/* Direct URL input */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">
                          Link da Mídia / URL
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => handleFieldChange(key, e.target.value)}
                            className="flex-1 rounded-xl border border-white/10 bg-[#07090E]/90 px-4 py-2.5 text-xs text-white placeholder-white/25 outline-none transition focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/20 font-mono"
                            placeholder="URL do arquivo..."
                          />
                        </div>
                      </div>

                      {/* Multi-action Row (Premium Controls) */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                        {/* PC File Upload Label */}
                        <label className="cursor-pointer flex items-center justify-center h-9 px-4 rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#E5C38C] hover:bg-[#D4AF37]/20 transition-all font-semibold text-xs gap-1.5 whitespace-nowrap active:scale-95">
                          {uploadingKey === key ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          <span>{uploadingKey === key ? "Enviando..." : "Subir do PC"}</span>
                          <input
                            type="file"
                            accept={isVideo ? "video/*" : "image/*"}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(key, file);
                            }}
                            disabled={uploadingKey !== null}
                          />
                        </label>

                        {/* Copy URL */}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(key, value)}
                          disabled={!value}
                          className="flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 bg-[#0E1118]/80 text-[#E5C38C] hover:bg-white/5 hover:border-[#D4AF37]/30 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                          title="Copiar Link"
                        >
                          {copiedKey === key ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        {/* External View */}
                        <a
                          href={value || undefined}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex items-center justify-center w-9 h-9 rounded-xl border border-white/10 bg-[#0E1118]/80 text-[#E5C38C] hover:bg-white/5 hover:border-[#D4AF37]/30 transition-all active:scale-95 ${
                            !value ? "pointer-events-none opacity-30" : ""
                          }`}
                          title="Abrir em Nova Guia"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </a>

                        {/* Restore Default */}
                        <button
                          type="button"
                          onClick={() => handleRestoreDefault(key)}
                          className="flex items-center justify-center h-9 px-3.5 rounded-xl border border-white/10 bg-[#0E1118]/80 text-white/50 hover:bg-white/5 hover:text-white transition-all active:scale-95 text-xs gap-1.5 ml-auto"
                          title="Restaurar endereço padrão sugerido pelo sistema"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Restaurar Padrão</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SYSTEM STATUS SIDEBAR */}
        <div className="flex flex-col gap-6">
          <div className="bg-[#0B0D12]/70 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl p-6 md:p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-medium text-white font-serif">Integrações & Sistema</h2>
              <p className="text-xs text-white/40 mt-1">Status em tempo real das dependências.</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-[#07090E]/60">
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Servidor Backend</p>
                    <p className="text-[10px] text-white/40 mt-0.5">Status do Express/Vite</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {healthStatus?.status === "ok" ? (
                      <div className="flex items-center gap-1.5 text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Online</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        <XCircle className="w-3 h-3" />
                        <span>Offline</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-[#07090E]/60">
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Banco Supabase</p>
                    <p className="text-[10px] text-white/40 mt-0.5">Variáveis e conexão</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {healthStatus?.supabase === "configured" ? (
                      <div className="flex items-center gap-1.5 text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ativo</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        <XCircle className="w-3 h-3" />
                        <span>Inativo</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-[#07090E]/60">
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-wider">Fluxos n8n</p>
                    <p className="text-[10px] text-white/40 mt-0.5">Webhook da clínica</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {healthStatus?.n8n === "configured" ? (
                      <div className="flex items-center gap-1.5 text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Conectado</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        <XCircle className="w-3 h-3" />
                        <span>Incompleto</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* GOALS CONFIGURATION WIDGET */}
          <div className="bg-[#0B0D12]/70 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl p-6 md:p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-medium text-white font-serif">Definição de Metas</h2>
              <p className="text-xs text-white/40 mt-1">Configurar objetivos de conversão e faturamento para o mês.</p>
            </div>

            {goalsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleUpdateGoals} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">Meta de Agendados (Mensal)</label>
                  <input
                    type="number"
                    value={goalAppointments}
                    onChange={(e) => setGoalAppointments(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-xs text-white outline-none focus:border-[#D4AF37] transition-all font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">Meta de Novos Leads (Mensal)</label>
                  <input
                    type="number"
                    value={goalLeads}
                    onChange={(e) => setGoalLeads(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-xs text-white outline-none focus:border-[#D4AF37] transition-all font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">Meta de Faturamento R$ (Mensal)</label>
                  <input
                    type="number"
                    value={goalRevenue}
                    onChange={(e) => setGoalRevenue(Number(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-xs text-white outline-none focus:border-[#D4AF37] transition-all font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={updatingGoals}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-tr from-[#D4AF37] via-[#E5C38C] to-[#B8860B] text-xs font-bold uppercase tracking-wider text-[#0B0D12] rounded-xl hover:shadow-[0_4px_20px_rgba(212,175,55,0.25)] transition-all active:scale-95 disabled:opacity-50"
                >
                  {updatingGoals ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Salvar Metas</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

