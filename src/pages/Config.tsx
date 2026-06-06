import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, RefreshCw, ShieldCheck, Database, Webhook, Wallet } from "lucide-react";

export default function ConfigPage() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealthStatus(data);
    } catch {
      setHealthStatus({ error: "Failed to reach API" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const items = [
    {
      label: "API Backend / Express",
      description: "Disponibilidade geral da aplicação e das rotas do painel.",
      ok: healthStatus?.status === "ok",
      value: loading ? "Verificando" : healthStatus?.status === "ok" ? "Online" : "Offline",
      icon: ShieldCheck,
    },
    {
      label: "Supabase",
      description: "Verifica se as variáveis do Supabase estão configuradas.",
      ok: healthStatus?.supabase === "configured",
      value: loading ? "Verificando" : healthStatus?.supabase || "Missing",
      icon: Database,
    },
    {
      label: "n8n Webhook",
      description: "Credenciais e rota para disparo operacional do fluxo.",
      ok: healthStatus?.n8n === "configured",
      value: loading ? "Verificando" : healthStatus?.n8n || "Missing",
      icon: Webhook,
    },
    {
      label: "Configuração Pix",
      description: "Chave Pix utilizada pelo agente em cobrança e sinal.",
      ok: healthStatus?.pix === "configured",
      value: loading ? "Verificando" : healthStatus?.pix || "Missing",
      icon: Wallet,
    },
  ];

  return (
    <div className="flex h-full w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Configurações & Status</h1>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Monitoramento operacional das integrações no mesmo padrão visual do sistema
          </p>
        </div>
        <button
          onClick={fetchHealth}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-[#2563EB] shadow-sm hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar status
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <Icon className="h-4 w-4" /> {item.label}
              </div>
              <div className="mt-3 flex items-center gap-2">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[#2563EB]" />
                ) : item.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-500" />
                )}
                <p className={`text-lg font-bold ${loading ? "text-[#2563EB]" : item.ok ? "text-emerald-700" : "text-rose-700"}`}>{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-bold text-[#111827]">Health check de sistema</h2>
          <p className="mt-1 text-xs text-gray-500">Diagnóstico visual de todos os componentes necessários para o painel operacional.</p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-white p-2 shadow-sm">
                        <Icon className="h-4 w-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{item.label}</p>
                        <p className="mt-1 text-xs text-gray-500">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-rose-500" />}
                      <span className="text-sm font-bold text-gray-700">{item.value}</span>
                    </div>
                  </div>
                );
              })}

              <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <p className="text-sm font-bold text-blue-900">Configuração inicial</p>
                <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-blue-800">
                  <li>Crie um projeto no Supabase.</li>
                  <li>Rode a migração em <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-blue-700">supabase/migrations/00001_initial_schema.sql</code>.</li>
                  <li>Preencha as variáveis locais com base no <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-blue-700">.env.example</code>.</li>
                  <li>Crie o primeiro usuário no painel Auth do Supabase.</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
