import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createClient } from "../lib/supabase/client";
import { Sparkles, Mail, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { fetchSiteSettings, mergeMediaSettings, DEFAULT_MEDIA_SETTINGS } from "../lib/siteSettings";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siteSettings, setSiteSettings] = useState(DEFAULT_MEDIA_SETTINGS);

  const supabase = createClient();

  useEffect(() => {
    fetchSiteSettings().then((result) => {
      if (result.ok && result.settings) {
        setSiteSettings(mergeMediaSettings(result.settings));
      }
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 md:p-8 font-sans bg-[#0B0D12] overflow-hidden">
      {/* Imagem de Fundo Premium com Efeito Glassmorphism e gradiente escuro */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 scale-105"
        style={{ backgroundImage: `url('${siteSettings.login_bg_image}')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-[#0B0D12] via-[#0B0D12]/90 to-transparent mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0B0D12]/80 to-[#0B0D12]" />

      {/* Círculos de luz decorativos de fundo */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#E5C38C]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#D4AF37]/10 blur-[150px] pointer-events-none" />

      {/* Container Principal */}
      <div className="relative w-full max-w-6xl grid md:grid-cols-12 gap-8 md:gap-0 bg-[#0B0D12]/65 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.8)]">
        
        {/* Lado Esquerdo: Banner de Boas-vindas Premium */}
        <div className="md:col-span-7 flex flex-col justify-between p-8 md:p-14 text-white relative min-h-[300px] md:min-h-[600px] border-b md:border-b-0 md:border-r border-white/5">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
          
          {/* Logo Premium */}
          <div className="flex items-center gap-3 relative z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] text-[#0B0D12] font-semibold italic text-xl shadow-[0_4px_20px_rgba(212,175,55,0.4)] overflow-hidden">
              <img src="/assets/logo.jpg" alt="Logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight font-serif text-[#E5C38C]">Instituto Rafael Dias</h1>
              <p className="text-xs text-white/50 tracking-wider">ESTÉTICA AVANÇADA</p>
            </div>
          </div>

          {/* Texto Inspirador de Estética / Comercial */}
          <div className="my-auto py-8 relative z-10 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#E5C38C] mb-6 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Plataforma Exclusiva CRM</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-light tracking-tight text-white leading-tight font-serif">
              Elevando a <br />
              <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#E5C38C] via-[#F3E5AB] to-[#D4AF37]">
                autoestima natural
              </span>
            </h2>
            <p className="mt-4 text-white/60 text-sm md:text-base leading-relaxed font-light">
              Gerencie oportunidades, acompanhe conversas inteligentes e organize a agenda de forma integrada com a metodologia do Instituto Rafael Dias.
            </p>

            <div className="mt-8 space-y-3.5">
              <div className="flex items-center gap-3 text-sm text-white/80">
                <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />
                <span>Integração nativa com n8n & Evolution API</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/80">
                <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />
                <span>Gestão inteligente de agendamentos no Google Calendar</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/80">
                <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />
                <span>Painel de conversas híbridas (IA e Atendente)</span>
              </div>
            </div>
          </div>

          {/* Rodapé Interno */}
          <div className="text-xs text-white/30 tracking-wide mt-auto relative z-10">
            Acesso restrito para colaboradores autorizados.
          </div>
        </div>

        {/* Lado Direito: Formulário de Login */}
        <div className="md:col-span-5 flex flex-col justify-center p-8 md:p-12 bg-[#0E1118]/80 relative">
          <div className="max-w-md w-full mx-auto">
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-white tracking-tight font-serif">Acesso ao Painel</h3>
              <p className="text-xs text-white/50 mt-1">Insira suas credenciais abaixo para entrar.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-xs leading-relaxed font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Input Email */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-white/70 uppercase tracking-widest">
                  E-mail institucional
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/30">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-11 pr-4 py-3 text-sm text-white placeholder-white/20 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] transition-all"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              {/* Input Senha */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-white/70 uppercase tracking-widest">
                    Senha de acesso
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/30">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-11 pr-4 py-3 text-sm text-white placeholder-white/20 focus:border-[#D4AF37] focus:outline-none focus:ring-1 focus:ring-[#D4AF37] transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Botão Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#E5C38C] to-[#D4AF37] py-3.5 text-sm font-semibold text-[#0B0D12] shadow-[0_4px_20px_rgba(212,175,55,0.25)] hover:shadow-[0_4px_30px_rgba(212,175,55,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                <span className="relative z-10">{loading ? "Validando credenciais..." : "Entrar no CRM"}</span>
              </button>
            </form>

            {/* Links da Política */}
            <div className="mt-8 flex items-center justify-center gap-4 text-[13px] uppercase tracking-wider font-semibold text-white/30">
              <Link to="/privacy-policy" className="hover:text-[#E5C38C] transition-colors">
                Privacidade
              </Link>
              <span>•</span>
              <Link to="/terms-of-service" className="hover:text-[#E5C38C] transition-colors">
                Termos de uso
              </Link>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
