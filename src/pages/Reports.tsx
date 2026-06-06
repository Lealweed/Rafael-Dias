import { BarChart3, TrendingUp, Users, Clock } from "lucide-react";

export default function Reports() {
  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Relatórios</h1>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mt-1">Métricas de Vendas e SLA</p>
        </div>
        <select className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-bold text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-[#2563EB]">
          <option>Últimos 30 Dias</option>
          <option>Este Mês</option>
          <option>Últimos 7 Dias</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-gray-500">
            <Users className="w-5 h-5 text-blue-500" />
            <h3 className="text-xs font-bold uppercase">Total Leads</h3>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-gray-900">342</span>
            <span className="text-xs font-bold text-green-500">+12%</span>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-gray-500">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <h3 className="text-xs font-bold uppercase">Conversão</h3>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-gray-900">14.8%</span>
            <span className="text-xs font-bold text-green-500">+2.1%</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-gray-500">
            <Clock className="w-5 h-5 text-orange-500" />
            <h3 className="text-xs font-bold uppercase">SLA Resposta (Med)</h3>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-gray-900">12m</span>
            <span className="text-xs font-bold text-red-500">+4m</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-2 text-gray-500">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            <h3 className="text-xs font-bold uppercase">Follow-ups Feitos</h3>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-gray-900">128</span>
            <span className="text-xs font-bold text-green-500">ótimo</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 min-h-[300px] flex flex-col">
          <h3 className="font-bold text-gray-900 mb-6">Taxa de Conversão por Etapa (Funil)</h3>
          <div className="flex-1 flex flex-col gap-4">
             <div className="relative">
                <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                  <span>Novo Lead (342)</span> <span>100%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full"><div className="h-3 bg-blue-500 rounded-full w-full"></div></div>
             </div>
             <div className="relative">
                <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                  <span>Qualificado (180)</span> <span>52%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full"><div className="h-3 bg-blue-500 rounded-full w-[52%]"></div></div>
             </div>
             <div className="relative">
                <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                  <span>Proposta (90)</span> <span>26%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full"><div className="h-3 bg-blue-500 rounded-full w-[26%]"></div></div>
             </div>
             <div className="relative">
                <div className="flex justify-between text-xs font-bold text-green-600 mb-1">
                  <span>Agendado / Ganho (50)</span> <span>14.8%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full"><div className="h-3 bg-green-500 rounded-full w-[14.8%]"></div></div>
             </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 min-h-[300px] flex flex-col">
          <h3 className="font-bold text-gray-900 mb-6">Leads por Origem</h3>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-end gap-6 h-48 w-full justify-center">
              {/* Fake Bar Chart */}
              <div className="flex flex-col items-center gap-2">
                 <div className="w-12 bg-[#25D366] rounded-t-md relative h-40"></div>
                 <span className="text-xs font-bold text-gray-600">WhatsApp</span>
                 <span className="text-[10px] text-gray-400">45%</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                 <div className="w-12 bg-[#2563EB] rounded-t-md relative h-28"></div>
                 <span className="text-xs font-bold text-gray-600">Facebook</span>
                 <span className="text-[10px] text-gray-400">30%</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                 <div className="w-12 bg-gray-800 rounded-t-md relative h-16"></div>
                 <span className="text-xs font-bold text-gray-600">Site SEO</span>
                 <span className="text-[10px] text-gray-400">15%</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                 <div className="w-12 bg-orange-500 rounded-t-md relative h-10"></div>
                 <span className="text-xs font-bold text-gray-600">n8n IA</span>
                 <span className="text-[10px] text-gray-400">10%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
