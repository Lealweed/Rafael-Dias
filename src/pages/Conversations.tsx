import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Send,
  Paperclip,
  MoreVertical,
  CheckCircle2,
  MessageSquare,
  CalendarClock,
  UserRound,
  Sparkles,
  Filter,
  ArrowUpRight,
  Bot,
  Phone,
  Clock3,
} from "lucide-react";

type FlowChecklist = {
  hasOrigin: boolean;
  hasInterest: boolean;
  hasTemperature: boolean;
  hasMessages: boolean;
  hasAppointment: boolean;
  hasFollowup: boolean;
};

type ConversationMessage = {
  id: string;
  direction: "inbound" | "outbound";
  type: string;
  text: string;
  createdAt: string | null;
};

type ConversationContact = {
  id: string;
  usuarioId: string | null;
  leadId: string | null;
  conversationId: string | null;
  name: string;
  phone: string;
  origin: string;
  interest: string;
  temperature: "hot" | "warm" | "cold";
  ownerName: string;
  ownerId: string | null;
  stage: string;
  notes: string;
  lastInteractionAt: string | null;
  createdAt: string | null;
  latestMessage: string;
  latestMessagePreview: string;
  latestDirection: "inbound" | "outbound";
  latestMessageType: string;
  latestMessageAt: string | null;
  summary: string;
  appointment: {
    id: string;
    title: string;
    status: string;
    date: string | null;
    notes: string;
  } | null;
  nextFollowup: {
    id: string;
    title: string;
    description: string;
    dueDate: string | null;
    status: string;
    type: string;
    ownerName: string;
  } | null;
  messages: ConversationMessage[];
  source: string;
  queueStatus: string;
  flowChecklist: FlowChecklist;
  metrics: {
    messageCount: number;
    inboundCount: number;
    outboundCount: number;
  };
  channel: string;
};

type ConversationsPayload = {
  ok: boolean;
  contacts: ConversationContact[];
  summary?: {
    total: number;
    withMessages: number;
    withAppointments: number;
    withPendingFollowup: number;
    assignedToHuman: number;
    hotLeads: number;
    missingStructuredFields: number;
  };
  diagnostics?: {
    optionalWarnings?: string[];
  };
  error?: string;
};

type FilterKey = "all" | "priority" | "scheduled" | "followup" | "unstructured";

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "Todas",
  priority: "Prioridade",
  scheduled: "Agendadas",
  followup: "Com retorno",
  unstructured: "Sem contexto",
};

function formatTime(value?: string | null) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(value?: string | null) {
  if (!value) return "sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sem data";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d atrás`;
  if (diffHours > 0) return `${diffHours}h atrás`;
  if (diffMinutes > 0) return `${diffMinutes}m atrás`;
  return "agora";
}

function queueStatusLabel(status: string) {
  switch (status) {
    case "retorno-atrasado":
      return "Retorno atrasado";
    case "retorno-agendado":
      return "Retorno agendado";
    case "agendado":
      return "Agendado";
    case "humano":
      return "Atendimento humano";
    case "prioridade":
      return "Prioridade";
    case "novo":
      return "Novo";
    default:
      return "Automação";
  }
}

function queueStatusClasses(status: string) {
  switch (status) {
    case "retorno-atrasado":
      return "border-red-200 bg-red-50 text-red-700";
    case "retorno-agendado":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "agendado":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "humano":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "prioridade":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "novo":
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function temperatureLabel(temp: string) {
  if (temp === "hot") return "Quente";
  if (temp === "warm") return "Morno";
  return "Frio";
}

function temperatureClasses(temp: string) {
  if (temp === "hot") return "border-orange-200 bg-orange-50 text-orange-700";
  if (temp === "warm") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function matchesFilter(contact: ConversationContact, filter: FilterKey) {
  if (filter === "priority") return contact.temperature === "hot" || contact.queueStatus === "retorno-atrasado";
  if (filter === "scheduled") return Boolean(contact.appointment);
  if (filter === "followup") return Boolean(contact.nextFollowup);
  if (filter === "unstructured") return !contact.flowChecklist.hasInterest || !contact.flowChecklist.hasTemperature;
  return true;
}

export default function Conversations() {
  const [contacts, setContacts] = useState<ConversationContact[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [summary, setSummary] = useState<ConversationsPayload["summary"] | null>(null);
  const [diagnosticsWarnings, setDiagnosticsWarnings] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchChats() {
      try {
        const res = await fetch("/api/crm/conversations");
        const data: ConversationsPayload = await res.json();

        if (!mounted) return;

        if (!res.ok || !data.ok) {
          throw new Error(data?.error || `Falha ao buscar conversas (${res.status})`);
        }

        const sorted = Array.isArray(data.contacts) ? data.contacts : [];
        setContacts(sorted);
        setSummary(data.summary || null);
        setDiagnosticsWarnings(data.diagnostics?.optionalWarnings || []);
        setSelectedChatId((prev) => {
          if (prev && sorted.some((chat) => chat.id === prev)) return prev;
          return sorted[0]?.id || null;
        });
        setError(null);
      } catch (err: any) {
        if (!mounted) return;
        setContacts([]);
        setSummary(null);
        setDiagnosticsWarnings([]);
        setSelectedChatId(null);
        setError(err?.message || "Falha ao carregar conversas");
      } finally {
        if (mounted) setLoadingChats(false);
      }
    }

    fetchChats();
    const intervalId = setInterval(fetchChats, 15000);
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, []);

  const filteredChats = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return contacts.filter((contact) => {
      if (!matchesFilter(contact, activeFilter)) return false;
      if (!term) return true;

      const haystack = [
        contact.name,
        contact.phone,
        contact.origin,
        contact.interest,
        contact.ownerName,
        contact.latestMessagePreview,
        contact.notes,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [contacts, activeFilter, searchTerm]);

  useEffect(() => {
    setSelectedChatId((prev) => {
      if (prev && filteredChats.some((chat) => chat.id === prev)) return prev;
      return filteredChats[0]?.id || null;
    });
  }, [filteredChats]);

  const selectedChat = useMemo(
    () => filteredChats.find((chat) => chat.id === selectedChatId) || contacts.find((chat) => chat.id === selectedChatId) || null,
    [contacts, filteredChats, selectedChatId],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedChat?.messages, selectedChatId]);

  const handleSend = async () => {
    if (!inputText.trim() || !selectedChat) return;

    const outgoingText = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      const res = await fetch("/api/n8n/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedChat.leadId || selectedChat.usuarioId || selectedChat.id,
          message: outgoingText,
          type: "whatsapp",
          destination: selectedChat.phone,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Falha ao enviar (${res.status})`);

      setContacts((prev) =>
        prev.map((contact) => {
          if (contact.id !== selectedChat.id) return contact;
          const newMessage: ConversationMessage = {
            id: `local_${Date.now()}`,
            direction: "outbound",
            type: "text",
            text: outgoingText,
            createdAt: new Date().toISOString(),
          };
          const nextMessages = [...contact.messages, newMessage];
          return {
            ...contact,
            messages: nextMessages,
            latestMessage: outgoingText,
            latestMessagePreview: outgoingText,
            latestDirection: "outbound",
            latestMessageAt: newMessage.createdAt,
            lastInteractionAt: newMessage.createdAt,
            metrics: {
              ...contact.metrics,
              messageCount: contact.metrics.messageCount + 1,
              outboundCount: contact.metrics.outboundCount + 1,
            },
            flowChecklist: {
              ...contact.flowChecklist,
              hasMessages: true,
            },
          };
        }),
      );
    } catch (err) {
      console.error("Failed to send message via n8n:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateProposal = async () => {
    if (!selectedChat) return;

    setGoogleAuthError(null);
    setIsGeneratingDoc(true);
    try {
      const payload = {
        contactName: selectedChat.name || selectedChat.phone,
        phone: selectedChat.phone || "",
        origin: selectedChat.origin || "",
        interest: selectedChat.interest || "",
      };

      const res = await fetch("/api/n8n/proposal-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.docUrl) {
        throw new Error(data?.error || `Falha ao gerar proposta (${res.status})`);
      }

      window.open(data.docUrl, "_blank");
    } catch (err: any) {
      console.error("Failed to generate proposal:", err);
      const rawMessage = String(err?.message || "");
      let message = "Falha ao gerar proposta no Google Docs. Tente novamente.";

      if (rawMessage.includes("insufficientPermissions") || rawMessage.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT")) {
        message = "O refresh token não tem escopo do Google Docs. Reautorize no OAuth com o escopo https://www.googleapis.com/auth/documents.";
      } else if (rawMessage.includes("invalid_grant")) {
        message = "Refresh token inválido/expirado. Gere um novo GOOGLE_REFRESH_TOKEN e atualize na Vercel.";
      } else if (rawMessage.includes("Missing GOOGLE_CLIENT_ID")) {
        message = "Variáveis GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN ausentes na Vercel.";
      } else if (rawMessage) {
        message = rawMessage;
      }

      setGoogleAuthError(message);
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const flowChecks = selectedChat
    ? [
        { label: "Origem do fluxo", ok: selectedChat.flowChecklist.hasOrigin },
        { label: "Interesse do lead", ok: selectedChat.flowChecklist.hasInterest },
        { label: "Temperatura", ok: selectedChat.flowChecklist.hasTemperature },
        { label: "Mensagens gravadas", ok: selectedChat.flowChecklist.hasMessages },
        { label: "Agendamento refletido", ok: selectedChat.flowChecklist.hasAppointment },
        { label: "Retorno estruturado", ok: selectedChat.flowChecklist.hasFollowup },
      ]
    : [];

  return (
    <div className="flex h-full w-full flex-col gap-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Central de Conversas</h1>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Navegação operacional para escolher a conversa certa e dar sequência no atendimento
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:min-w-[540px]">
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Conversas</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{summary?.total ?? contacts.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Com agendamento</p>
            <p className="mt-1 text-2xl font-bold text-violet-700">{summary?.withAppointments ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Com retorno</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{summary?.withPendingFollowup ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Sem contexto</p>
            <p className="mt-1 text-2xl font-bold text-rose-700">{summary?.missingStructuredFields ?? 0}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {diagnosticsWarnings.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Observação:</strong> alguns dados complementares do CRM não puderam ser carregados ({diagnosticsWarnings.join(" | ")}).
        </div>
      )}

      <div className="grid min-h-[720px] grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 p-4">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, telefone, origem ou interesse..."
                className="w-full bg-transparent text-gray-900 outline-none placeholder:text-gray-400"
              />
            </div>

            <div className="mt-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
              <Filter className="h-3.5 w-3.5" /> Filtros rápidos
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(FILTER_LABELS) as FilterKey[]).map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setActiveFilter(filterKey)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                    activeFilter === filterKey
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {FILTER_LABELS[filterKey]}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="font-bold text-gray-900">Resultados ({filteredChats.length})</span>
              <span className="font-medium text-gray-400">Escolha uma conversa para acompanhar</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingChats ? (
              <div className="p-4 text-center text-sm text-gray-500">Carregando conversas...</div>
            ) : filteredChats.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">Nenhuma conversa encontrada para o filtro atual.</div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = selectedChat?.id === chat.id;
                return (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`w-full border-b border-gray-100 px-4 py-4 text-left transition-colors ${
                      isSelected ? "bg-blue-50/60" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`truncate text-sm font-bold ${isSelected ? "text-blue-700" : "text-gray-900"}`}>
                            {chat.name || chat.phone || "Sem nome"}
                          </h3>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${queueStatusClasses(chat.queueStatus)}`}>
                            {queueStatusLabel(chat.queueStatus)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-[11px] text-gray-500">{chat.phone || "Sem telefone"} • {chat.origin || "Sem origem"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-bold text-gray-400">{formatTime(chat.lastInteractionAt || chat.latestMessageAt)}</p>
                        <p className="mt-1 text-[10px] text-gray-400">{formatRelative(chat.lastInteractionAt || chat.latestMessageAt)}</p>
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-2 text-xs text-gray-600">
                      {chat.latestMessagePreview || chat.interest || chat.summary || "Sem histórico textual disponível ainda."}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${temperatureClasses(chat.temperature)}`}>
                        {temperatureLabel(chat.temperature)}
                      </span>
                      {chat.ownerName && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          {chat.ownerName}
                        </span>
                      )}
                      {chat.appointment && (
                        <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                          Agenda
                        </span>
                      )}
                      {chat.nextFollowup && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          Retorno
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-white px-6 py-4">
            {selectedChat ? (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                    <Sparkles className="h-3.5 w-3.5" /> Você está acompanhando esta conversa
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 font-bold uppercase text-orange-600">
                      {selectedChat.name ? selectedChat.name.slice(0, 2) : "LC"}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-bold text-gray-900">{selectedChat.name || selectedChat.phone}</h2>
                      <p className="truncate text-xs text-gray-500">
                        {selectedChat.phone || "Sem telefone"} • {selectedChat.origin || "Sem origem"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleGenerateProposal}
                    disabled={isGeneratingDoc || !selectedChat}
                    className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-100 disabled:opacity-50"
                  >
                    {isGeneratingDoc ? "Gerando..." : "Gerar Proposta"}
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 shadow-sm hover:bg-gray-50">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> Marcar retorno
                  </button>
                  <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm font-medium text-gray-500">Selecione uma conversa para visualizar o histórico completo.</div>
            )}
          </div>

          {googleAuthError && (
            <div className="mx-6 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{googleAuthError}</div>
          )}

          <div className="grid flex-1 min-h-0 grid-rows-[auto_1fr_auto] bg-[#F9FAFB]">
            <div className="border-b border-gray-100 px-6 py-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-gray-500">
                <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${selectedChat ? queueStatusClasses(selectedChat.queueStatus) : "border-gray-200 bg-white text-gray-500"}`}>
                  {selectedChat ? queueStatusLabel(selectedChat.queueStatus) : "Sem seleção"}
                </span>
                {selectedChat?.interest && <span>Interesse: <strong className="text-gray-700">{selectedChat.interest}</strong></span>}
                {selectedChat?.ownerName && <span>Responsável: <strong className="text-gray-700">{selectedChat.ownerName}</strong></span>}
                <span>Última atualização: <strong className="text-gray-700">{formatDateTime(selectedChat?.lastInteractionAt || selectedChat?.latestMessageAt)}</strong></span>
              </div>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              {!selectedChat ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
                  <MessageSquare className="mb-3 h-10 w-10 text-gray-300" />
                  <p className="text-sm font-medium">Selecione uma conversa na coluna da esquerda.</p>
                  <p className="mt-1 max-w-md text-xs">A nova estrutura destaca qual conversa está em acompanhamento e traz o contexto do lead ao lado do histórico.</p>
                </div>
              ) : selectedChat.messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
                  <Bot className="mb-3 h-10 w-10 text-gray-300" />
                  <p className="text-sm font-medium">Ainda não há mensagens salvas nesta conversa.</p>
                  <p className="mt-1 max-w-md text-xs">Isso normalmente indica que o lead existe no CRM, mas o histórico ainda não foi persistido pelo fluxo.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex justify-center">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      Histórico aplicado no CRM
                    </span>
                  </div>

                  {selectedChat.messages.map((msg) => {
                    const inbound = msg.direction === "inbound";
                    return (
                      <div key={msg.id} className={`flex items-start gap-3 ${inbound ? "justify-start" : "justify-end"}`}>
                        {inbound && <div className="h-8 w-8 shrink-0 rounded-full bg-orange-100" />}
                        <div
                          className={`max-w-[78%] rounded-2xl border p-3 shadow-sm ${
                            inbound
                              ? "rounded-tl-none border-gray-200 bg-white"
                              : "rounded-tr-none border-[#d6efc2] bg-[#DCF8C6]"
                          }`}
                        >
                          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                            <span>{inbound ? "Lead" : "CRM"}</span>
                            <span>•</span>
                            <span>{msg.type || "text"}</span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-gray-800">{msg.text || "[Sem conteúdo]"}</p>
                          <div className="mt-2 text-right text-[10px] font-medium text-gray-500">
                            {formatDateTime(msg.createdAt)}
                          </div>
                        </div>
                        {!inbound && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-xs font-bold text-white">
                            RD
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 bg-white p-4">
              <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <button className="p-2 text-gray-400 transition-colors hover:text-gray-600">
                  <Paperclip className="h-5 w-5" />
                </button>
                <textarea
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Digite a mensagem para dar sequência ao atendimento pelo WhatsApp..."
                  className="max-h-32 w-full resize-none bg-transparent py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
                <button
                  onClick={handleSend}
                  disabled={isSending || !inputText.trim() || !selectedChat}
                  className="rounded-lg bg-[#2563EB] p-2.5 text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="text-sm font-bold text-gray-900">Contexto do atendimento</h3>
            <p className="mt-1 text-xs text-gray-500">Painel para validar o que o fluxo realmente trouxe para dentro do CRM.</p>
          </div>

          {!selectedChat ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-gray-500">
              Escolha uma conversa para ver dados do lead, agenda, retorno e consistência do fluxo.
            </div>
          ) : (
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <UserRound className="h-3.5 w-3.5" /> Lead em acompanhamento
                </div>
                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <p><strong>Nome:</strong> {selectedChat.name || "Sem nome"}</p>
                  <p><strong>Telefone:</strong> {selectedChat.phone || "Sem telefone"}</p>
                  <p><strong>Origem:</strong> {selectedChat.origin || "Sem origem"}</p>
                  <p><strong>Interesse:</strong> {selectedChat.interest || "Não informado"}</p>
                  <p><strong>Temperatura:</strong> {temperatureLabel(selectedChat.temperature)}</p>
                  <p><strong>Responsável:</strong> {selectedChat.ownerName || "Automação / não atribuído"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                    <MessageSquare className="h-3.5 w-3.5" /> Mensagens
                  </div>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{selectedChat.metrics.messageCount}</p>
                  <p className="mt-1 text-xs text-gray-500">{selectedChat.metrics.inboundCount} recebidas • {selectedChat.metrics.outboundCount} enviadas</p>
                </div>
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                    <Phone className="h-3.5 w-3.5" /> Último contato
                  </div>
                  <p className="mt-2 text-sm font-bold text-gray-900">{formatRelative(selectedChat.lastInteractionAt || selectedChat.latestMessageAt)}</p>
                  <p className="mt-1 text-xs text-gray-500">{formatDateTime(selectedChat.lastInteractionAt || selectedChat.latestMessageAt)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-700">
                  <CalendarClock className="h-3.5 w-3.5" /> Agenda vinculada
                </div>
                {selectedChat.appointment ? (
                  <div className="mt-3 space-y-2 text-sm text-violet-900">
                    <p><strong>Título:</strong> {selectedChat.appointment.title}</p>
                    <p><strong>Quando:</strong> {formatDateTime(selectedChat.appointment.date)}</p>
                    <p><strong>Status:</strong> {selectedChat.appointment.status}</p>
                    <p className="text-xs text-violet-700">Esse bloco confirma se o fluxo de agendamento refletiu no CRM.</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-violet-800">Nenhum agendamento associado a esta conversa até agora.</p>
                )}
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                  <Clock3 className="h-3.5 w-3.5" /> Próximo retorno
                </div>
                {selectedChat.nextFollowup ? (
                  <div className="mt-3 space-y-2 text-sm text-amber-900">
                    <p><strong>Título:</strong> {selectedChat.nextFollowup.title}</p>
                    <p><strong>Data:</strong> {formatDateTime(selectedChat.nextFollowup.dueDate)}</p>
                    <p><strong>Status:</strong> {selectedChat.nextFollowup.status}</p>
                    <p><strong>Responsável:</strong> {selectedChat.nextFollowup.ownerName || selectedChat.ownerName || "Não informado"}</p>
                    {selectedChat.nextFollowup.description && <p className="text-xs text-amber-700">{selectedChat.nextFollowup.description}</p>}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-amber-800">Nenhum retorno estruturado salvo para esta conversa.</p>
                )}
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                    <Sparkles className="h-3.5 w-3.5" /> Dados do fluxo aplicados
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {flowChecks.filter((item) => item.ok).length}/{flowChecks.length}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {flowChecks.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-xl border border-white/70 bg-white/70 px-3 py-2 text-sm">
                      <span className="text-gray-700">{item.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.ok ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {item.ok ? "OK" : "Pendente"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedChat.notes && (
                <div className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                    <ArrowUpRight className="h-3.5 w-3.5" /> Observações do CRM
                  </div>
                  <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{selectedChat.notes}</p>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
