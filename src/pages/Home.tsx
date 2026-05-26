import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] font-sans">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB] text-white font-bold italic">
              RD
            </div>
            <div>
              <h1 className="text-base font-bold">Instituto Rafael Dias</h1>
              <p className="text-xs text-gray-500">Plataforma de CRM e gestão comercial</p>
            </div>
          </div>
          <Link
            to="/login"
            className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Acessar sistema
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-14">
        <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#2563EB]">Página pública oficial</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">Finalidade do aplicativo</h2>
          <p className="mt-4 text-gray-700 leading-relaxed">
            Este aplicativo é o CRM do Instituto Rafael Dias. A plataforma é usada para organizar contatos,
            acompanhar conversas, gerenciar pipeline comercial, follow-ups, agenda e relatórios operacionais.
          </p>
          <p className="mt-3 text-gray-700 leading-relaxed">
            Usuários autorizados utilizam o sistema para atendimento comercial e acompanhamento de oportunidades,
            com integração de dados e automações para melhorar tempo de resposta e qualidade do atendimento.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-bold">Quem opera</h3>
            <p className="mt-2 text-sm text-gray-600">Equipe autorizada do Instituto Rafael Dias.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-bold">Acesso</h3>
            <p className="mt-2 text-sm text-gray-600">Área interna protegida por autenticação em /login.</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-bold">Conformidade</h3>
            <p className="mt-2 text-sm text-gray-600">Documentação legal disponível publicamente abaixo.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4 text-sm text-gray-600">
          <span>© Instituto Rafael Dias</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy-policy" className="text-[#2563EB] hover:underline">Política de Privacidade</Link>
            <Link to="/terms-of-service" className="text-[#2563EB] hover:underline">Termos de Serviço</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
