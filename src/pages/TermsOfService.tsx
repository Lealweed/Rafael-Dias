import { Link } from "react-router-dom";

export default function TermsOfService() {
  const updatedAt = "26/05/2026";

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] font-sans">
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Termos de Serviço</h1>
          <Link to="/login" className="text-sm font-semibold text-[#2563EB] hover:underline">
            Voltar para login
          </Link>
        </div>

        <p className="mb-6 text-sm text-gray-500">Última atualização: {updatedAt}</p>

        <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 leading-7">
          <section>
            <h2 className="mb-2 text-lg font-bold">1. Aceitação</h2>
            <p>
              Ao utilizar esta aplicação, você concorda com estes Termos de Serviço e com a Política de Privacidade.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold">2. Descrição do serviço</h2>
            <p>
              A plataforma oferece funcionalidades de gestão comercial, atendimento, agendamentos, acompanhamento de
              leads e relatórios operacionais.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold">3. Cadastro e acesso</h2>
            <p>
              O usuário é responsável pela veracidade dos dados de cadastro e pela confidencialidade das credenciais
              de acesso.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold">4. Uso permitido</h2>
            <ul className="list-disc pl-6">
              <li>Utilizar a plataforma conforme a legislação aplicável;</li>
              <li>Não tentar acesso indevido a sistemas, dados ou contas de terceiros;</li>
              <li>Não usar o serviço para práticas ilícitas ou abusivas.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold">5. Propriedade intelectual</h2>
            <p>
              Marcas, interface, conteúdos e código relacionados ao serviço são protegidos por legislação aplicável e
              não podem ser copiados ou explorados sem autorização.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold">6. Disponibilidade e limitações</h2>
            <p>
              Empregamos esforços para manter o serviço disponível, mas não garantimos operação ininterrupta ou livre
              de falhas. Manutenções e indisponibilidades pontuais podem ocorrer.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold">7. Responsabilidades</h2>
            <p>
              O usuário responde por informações inseridas e pelo uso da conta. O operador da plataforma responde pela
              operação do serviço nos limites legais e contratuais.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold">8. Alterações dos termos</h2>
            <p>
              Estes termos podem ser atualizados periodicamente. A versão vigente estará sempre disponível nesta
              página com a data de atualização.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold">9. Foro e legislação aplicável</h2>
            <p>
              Estes termos são regidos pela legislação brasileira. Eventuais controvérsias serão tratadas no foro
              competente, conforme a lei.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
