import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  const updatedAt = "26/05/2026";

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] font-sans">
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Política de Privacidade</h1>
          <Link to="/login" className="text-sm font-semibold text-[#2563EB] hover:underline">
            Voltar para login
          </Link>
        </div>

        <p className="mb-6 text-sm text-gray-500">Última atualização: {updatedAt}</p>

        <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 leading-7">
          <section>
            <h2 className="mb-2 text-lg font-bold">1. Quem somos</h2>
            <p>
              Esta aplicação é operada pelo Instituto Rafael Dias, responsável pelo tratamento de dados pessoais
              coletados em formulários, atendimentos e interações comerciais.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold">2. Dados coletados</h2>
            <p>
              Podemos coletar nome, telefone, e-mail, histórico de atendimento, informações de agendamento e dados
              técnicos de acesso (IP, navegador e dispositivo).
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold">3. Finalidade do uso</h2>
            <ul className="list-disc pl-6">
              <li>Atender solicitações e prestar suporte;</li>
              <li>Gerenciar relacionamento com leads e alunos;</li>
              <li>Enviar comunicações operacionais e comerciais;</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold">4. Compartilhamento de dados</h2>
            <p>
              Os dados podem ser compartilhados com provedores necessários para operação do serviço (ex.: hospedagem,
              CRM, automações e analytics), sempre com controles de segurança e finalidade compatível.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold">5. Base legal e LGPD</h2>
            <p>
              O tratamento é realizado com base na Lei Geral de Proteção de Dados (Lei nº 13.709/2018), incluindo
              execução de contrato, legítimo interesse e consentimento, quando aplicável.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold">6. Retenção e segurança</h2>
            <p>
              Mantemos os dados pelo tempo necessário para as finalidades descritas e aplicamos medidas técnicas e
              administrativas para proteção contra acesso não autorizado, perda ou alteração indevida.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold">7. Direitos do titular</h2>
            <p>
              Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade ou
              exclusão dos dados, conforme previsto em lei.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold">8. Cookies e tecnologias de rastreamento</h2>
            <p>
              Podemos utilizar cookies para autenticação, segurança, desempenho e medição de campanhas. Você pode
              gerenciar permissões no navegador.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-bold">9. Contato</h2>
            <p>
              Para assuntos de privacidade e proteção de dados, entre em contato pelos canais oficiais do Instituto
              Rafael Dias informados no atendimento.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
