import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function ConfigPage() {
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="flex flex-col h-full w-full max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Configurações & Status</h1>
          <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mt-1">Verifique o status das integrações e variáveis de ambiente.</p>
        </div>
        <button 
          onClick={fetchHealth}
          className="px-4 py-2 bg-[#0E1118]/80 text-sm font-bold text-[#2563EB] border border-white/5 rounded-lg hover:bg-white/5 shadow-sm transition-colors"
        >
          Atualizar Status
        </button>
      </div>

      <div className="bg-[#0E1118]/80 rounded-2xl border border-white/5 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">Health Check de Sistema</h2>
        </div>
        
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
               <div className="flex items-center justify-between py-3 border-b border-white/5">
                 <div>
                   <p className="font-bold text-white">API Backend / Express</p>
                 </div>
                 <div className="flex items-center gap-2">
                   {healthStatus?.status === "ok" ? <CheckCircle2 className="w-5 h-5 text-green-500"/> : <XCircle className="w-5 h-5 text-red-500"/>}
                   <span className="text-sm font-medium text-white/50">{healthStatus?.status === "ok" ? "Online" : "Offline"}</span>
                 </div>
               </div>
               
               <div className="flex items-center justify-between py-3 border-b border-white/5">
                 <div>
                   <p className="font-bold text-white">Supabase Connection</p>
                   <p className="text-xs text-white/50 mt-0.5">Verifica se as variáveis do Supabase estão configuradas</p>
                 </div>
                 <div className="flex items-center gap-2">
                   {healthStatus?.supabase === "configured" ? <CheckCircle2 className="w-5 h-5 text-green-500"/> : <XCircle className="w-5 h-5 text-red-500"/>}
                   <span className="text-sm font-medium text-white/50">{healthStatus?.supabase || "Missing"}</span>
                 </div>
               </div>

               <div className="flex items-center justify-between py-3 border-b border-white/5">
                 <div>
                   <p className="font-bold text-white">n8n Webhook Configuration</p>
                   <p className="text-xs text-white/50 mt-0.5">Credenciais para disparo ao n8n</p>
                 </div>
                 <div className="flex items-center gap-2">
                   {healthStatus?.n8n === "configured" ? <CheckCircle2 className="w-5 h-5 text-green-500"/> : <XCircle className="w-5 h-5 text-red-500"/>}
                   <span className="text-sm font-medium text-white/50">{healthStatus?.n8n || "Missing"}</span>
                 </div>
               </div>
               
               <div className="mt-8 bg-blue-500/10 rounded-xl p-5 border border-blue-500/20">
                 <p className="text-sm font-bold text-blue-400">Configuração Inicial</p>
                 <ol className="mt-4 list-decimal list-inside text-sm text-blue-300 space-y-2">
                   <li>Crie um projeto no Supabase</li>
                   <li>Rode o SQL de migração localizado em <code className="bg-white/10 px-1.5 py-0.5 rounded text-blue-400 font-mono text-xs">supabase/migrations/00001_initial_schema.sql</code></li>
                   <li>Preencha as variáveis locais no arquivo de ambiente (baseado no <code className="bg-white/10 px-1.5 py-0.5 rounded text-blue-400 font-mono text-xs">.env.example</code>)</li>
                   <li>Crie o seu primeiro usuário direto pelo painel de Auth do Supabase</li>
                 </ol>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
