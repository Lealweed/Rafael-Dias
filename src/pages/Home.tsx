import { Link } from "react-router-dom";
import { Sparkles, ArrowRight, ShieldCheck, Heart, Clock, Star } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#0B0D12] text-white font-sans overflow-hidden flex flex-col justify-between">
      {/* Imagem de Fundo Premium com Glassmorphism e gradiente escuro */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 scale-105"
        style={{ backgroundImage: `url('/assets/bg-premium.png')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-[#0B0D12] via-[#0B0D12]/95 to-transparent mix-blend-multiply" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0B0D12]/80 to-[#0B0D12]" />

      {/* Círculos de luz decorativos */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-[#E5C38C]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-[#D4AF37]/5 blur-[150px] pointer-events-none" />

      {/* Header Premium */}
      <header className="relative z-10 w-full border-b border-white/5 bg-[#0B0D12]/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] text-[#0B0D12] font-semibold italic text-lg shadow-[0_4px_15px_rgba(212,175,55,0.3)]">
              RD
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wider font-serif text-[#E5C38C]">Instituto Rafael Dias</h1>
              <p className="text-[10px] text-white/40 tracking-widest uppercase">Estética Avançada</p>
            </div>
          </div>
          <Link
            to="/login"
            className="group relative overflow-hidden rounded-xl bg-white/5 border border-white/10 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:border-[#D4AF37]/40 transition-all duration-300"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/10 to-transparent translate-x-full group-hover:translate-x-0 transition-transform duration-300 pointer-events-none" />
            <span className="relative z-10 flex items-center gap-2">
              Acessar Painel <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-12 md:py-24 flex-1 flex flex-col justify-center">
        
        {/* Banner Hero */}
        <div className="max-w-3xl text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest font-semibold text-[#E5C38C] mb-6 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>Portal Oficial Interno</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-light tracking-tight text-white leading-tight font-serif">
            A harmonia que <br />
            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[#E5C38C] via-[#F3E5AB] to-[#D4AF37]">
              revela a sua beleza.
            </span>
          </h2>
          <p className="mt-6 text-white/60 text-base md:text-lg leading-relaxed font-light max-w-2xl">
            Bem-vindo ao ecossistema comercial do Instituto Rafael Dias. Esta plataforma unifica o gerenciamento de leads, automações conversacionais por IA e o pipeline operacional de nossa clínica de estética avançada.
          </p>

          <div className="mt-10 flex flex-wrap gap-4 justify-center md:justify-start">
            <Link
              to="/login"
              className="relative group overflow-hidden rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#E5C38C] to-[#D4AF37] px-8 py-3.5 text-sm font-semibold text-[#0B0D12] shadow-[0_4px_25px_rgba(212,175,55,0.3)] hover:shadow-[0_4px_35px_rgba(212,175,55,0.45)] transition-all duration-300"
            >
              <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
              <span className="relative z-10 flex items-center gap-2">
                Entrar no Sistema <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>

        {/* Grid de Informações com Glassmorphism */}
        <section className="mt-16 md:mt-24 grid gap-6 md:grid-cols-3">
          
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md p-6 relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
            <div className="h-10 w-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold tracking-wide uppercase text-[#E5C38C]">Segurança de Dados</h3>
            <p className="mt-2 text-xs text-white/50 leading-relaxed font-light">
              Todos os contatos, históricos de conversas e comprovantes de pagamentos são armazenados de forma criptografada sob conformidade com a LGPD.
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md p-6 relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
            <div className="h-10 w-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] mb-4">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold tracking-wide uppercase text-[#E5C38C]">Atendimento Exclusivo</h3>
            <p className="mt-2 text-xs text-white/50 leading-relaxed font-light">
              Integração em tempo real com a Evolution API e n8n para agilizar o tempo de resposta do cliente com o Agente de IA Comercial.
            </p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md p-6 relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
            <div className="h-10 w-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] mb-4">
              <Heart className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold tracking-wide uppercase text-[#E5C38C]">Padrão de Qualidade</h3>
            <p className="mt-2 text-xs text-white/50 leading-relaxed font-light">
              Uma abordagem consultiva focada na autoestima natural do paciente, combinando tecnologia fluida com sensibilidade estética humana.
            </p>
          </div>

        </section>
      </main>

      {/* Footer Premium */}
      <footer className="relative z-10 border-t border-white/5 bg-[#0B0D12]/60 backdrop-blur-md py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-[10px] font-semibold uppercase tracking-wider text-white/40">
          <span>© Instituto Rafael Dias · Estética Avançada</span>
          <div className="flex items-center gap-6">
            <Link to="/privacy-policy" className="hover:text-[#E5C38C] transition-colors">Política de Privacidade</Link>
            <Link to="/terms-of-service" className="hover:text-[#E5C38C] transition-colors">Termos de Serviço</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
