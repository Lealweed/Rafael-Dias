import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Send, Paperclip, MoreVertical, CheckCircle2 } from "lucide-react";
import { createClient } from "../lib/supabase/client";

function normalizePhone(raw: any): string {
  if (!raw) return "";
  const base = String(raw).split("@")[0].trim();
  return base.replace(/\D/g, "");
}

function extractMessageText(payload: any): string {
  if (!payload) return "";
  return String(
    payload.message ||
    payload.text ||
    payload.content ||
    payload?.data?.message?.conversation ||
    payload?.data?.message?.extendedTextMessage?.text ||
    ""
  ).trim();
}

function extractPhone(payload: any): string {
  if (!payload) return "";
  return normalizePhone(
    payload.phone ||
    payload.from ||
    payload.remoteJid ||
    payload.wa_id ||
    payload.sender ||
    payload.destination ||
    payload?.data?.key?.remoteJid ||
    ""
  );
}

function formatMessageLabel(type: string, text: string) {
  if (type === "reaction") return `Reação: ${text || "👍"}`;
  if (type === "audio") return text || "[Áudio]";
  if (type === "image") return text || "[Imagem]";
  if (type === "document") return text || "[Documento]";
  if (type === "video") return text || "[Vídeo]";
  return text;
}

function formatSenderLabel(source?: string | null, type?: string | null) {
  const normalized = String(source || "").toLowerCase();
  if (normalized === "human") return "Equipe";
  if (normalized === "agent") return "Agente";
  if (normalized === "system" || type === "system") return "Sistema";
  return "Cliente";
}

function formatDateTimeInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTimeLabel(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAppointmentStatusLabel(status?: string | null) {
  const normalized = String(status || "scheduled").toLowerCase();
  if (normalized === "pending_confirmation") return "Aguardando confirmação";
  if (normalized === "confirmed") return "Consulta confirmada";
  if (normalized === "completed") return "Consulta realizada";
  if (normalized === "no_show") return "Faltou";
  if (normalized === "canceled") return "Consulta cancelada";
  if (normalized === "rescheduled") return "Remarcação";
  return "Consulta agendada";
}

export default function Conversations() {
  const [activeChats, setActiveChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [automationState, setAutomationState] = useState<any>(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [isUpdatingAutomation, setIsUpdatingAutomation] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const [isUpdatingLeadOps, setIsUpdatingLeadOps] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [nextFollowupInput, setNextFollowupInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedLeadStatus =
    automationState?.conversation_status ||
    selectedChat?.conversation_status ||
    "novo";
  const currentAgentName =
    currentUser?.user_metadata?.full_name ||
    currentUser?.user_metadata?.name ||
    currentUser?.email ||
    "Equipe Clínica";
  const currentAgentId = currentUser?.id || null;
  const filteredChats = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return activeChats;

    return activeChats.filter((chat: any) => {
      const name = String(chat.full_name || chat.nome || "").toLowerCase();
      const phone = String(chat.phone || chat.telefone || "").toLowerCase();
      const origin = String(chat.origin || chat.origem || "").toLowerCase();
      return name.includes(term) || phone.includes(term) || origin.includes(term);
    });
  }, [activeChats, searchTerm]);

  useEffect(() => {
    async function fetchCurrentUser() {
      const { data } = await supabase.auth.getUser();
      setCurrentUser(data.user || null);
    }

    fetchCurrentUser();
  }, [supabase]);

  // Load leads/chats
  useEffect(() => {
    async function fetchChats() {
      // Fonte principal no schema atual
      let { data, error } = await supabase
        .from('leads')
        .select('*');

      // Fallback de compatibilidade
      if (error) {
        console.warn('Falha ao buscar conversas em public.leads, tentando Usuarios:', error.message);
        const legacy = await supabase
          .from('Usuarios')
          .select('*');
        data = legacy.data;
        error = legacy.error;
      }

      if (error) {
        console.error('Erro ao buscar conversas (leads/Usuarios):', error);
        setActiveChats([]);
        setLoadingChats(false);
        return;
      }

      if (data) {
        const sorted = [...data].sort((a: any, b: any) => {
          const ta = new Date(a.updated_at || a.created_at || 0).getTime();
          const tb = new Date(b.updated_at || b.created_at || 0).getTime();
          return tb - ta;
        });
        const preferredLeadId = String(searchParams.get("leadId") || "").trim();
        const preferredChat = preferredLeadId ? sorted.find((item: any) => item.id === preferredLeadId) : null;

        setActiveChats(sorted);
        setSelectedChat(prev => {
          if (preferredChat && !prev) return preferredChat;
          if (!prev && sorted.length > 0) return sorted[0];
          if (prev) {
            const updated = sorted.find(c => c.id === prev.id);
            if (updated) return updated;
          }
          return prev;
        });
      }
      setLoadingChats(false);
    }
    fetchChats();
    const intervalId = setInterval(fetchChats, 5000);
    return () => clearInterval(intervalId);
  }, [searchParams, supabase]);

  // Load messages when selectedChat changes
  useEffect(() => {
    async function fetchMessages() {
      if (!selectedChat) return;

      const selectedPhone = normalizePhone(selectedChat.phone || selectedChat.telefone || "");
      if (!selectedPhone) {
        setMessages([]);
        return;
      }

      // 1) Tentar schema novo: conversations + messages
      const { data: convRows, error: convErr } = await supabase
        .from('conversations')
        .select('id')
        .eq('lead_id', selectedChat.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (!convErr && convRows && convRows.length > 0) {
        const conversationIds = convRows.map((c: any) => c.id);
        const { data: msgRows, error: msgErr } = await supabase
          .from('messages')
          .select('id, direction, type, source, content, created_at')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: true })
          .limit(300);

        if (!msgErr && msgRows && msgRows.length > 0) {
          const mappedFromMessages = msgRows.map((m: any) => ({
            id: m.id,
            type: m.type === 'system' ? 'system' : m.direction === 'outbound' ? 'outbound' : 'inbound',
            messageType: m.type || 'text',
            senderLabel: formatSenderLabel(m.source, m.type),
            text: formatMessageLabel(String(m.type || 'text'), String(m.content || '[mensagem sem texto]')),
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));
          setMessages(mappedFromMessages);
          return;
        }
      }

      // 2) Fallback: integration_events por telefone
      const { data, error } = await supabase
        .from('integration_events')
        .select('id, direction, payload, created_at')
        .order('created_at', { ascending: true })
        .limit(300);

      if (error) {
        console.error('Erro ao buscar mensagens em integration_events:', error);
        setMessages([]);
        return;
      }

      const mapped = (data || [])
        .filter((evt: any) => extractPhone(evt.payload) === selectedPhone)
        .map((evt: any) => {
          const text = extractMessageText(evt.payload);
          const messageType = String(
            evt.payload?.messageType ||
            evt.payload?.type ||
            evt.payload?.data?.messageType ||
            "text"
          ).trim();
          return {
            id: evt.id,
            type: evt.direction === 'outbound' ? 'outbound' : 'inbound',
            messageType,
            senderLabel: formatSenderLabel(
              evt.payload?.source ||
              evt.payload?.payload?.source ||
              (evt.direction === 'outbound' ? 'agent' : 'customer'),
              messageType
            ),
            text: formatMessageLabel(messageType, text || '[mensagem sem texto]'),
            time: new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
        })
        .filter((m: any) => m.text);

      setMessages(mapped);
    }

    fetchMessages();
    const intervalId = setInterval(fetchMessages, 5000);
    return () => clearInterval(intervalId);
  }, [selectedChat]);

  useEffect(() => {
    async function fetchAutomationState() {
      if (!selectedChat?.id) {
        setAutomationState(null);
        return;
      }

      try {
        const res = await fetch(`/api/conversations/automation?leadId=${encodeURIComponent(selectedChat.id)}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.ok) {
          setAutomationState(null);
          return;
        }

        setAutomationState(data.lead);
      } catch {
        setAutomationState(null);
      }
    }

    fetchAutomationState();
  }, [selectedChat]);

  useEffect(() => {
    const nextValue = formatDateTimeInput(
      automationState?.next_followup_at ||
      selectedChat?.next_followup_at ||
      null
    );
    setNextFollowupInput(nextValue);
  }, [automationState, selectedChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !selectedChat) return;
    setSendError(null);
    
    const newMsg = {
      id: Date.now(),
      type: "outbound",
      senderLabel: "Equipe",
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, newMsg]);
    setInputText("");
    setIsSending(true);

    try {
      const res = await fetch("/api/n8n/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contactId: selectedChat.id, 
          message: newMsg.text, 
          type: "text",
          destination: selectedChat.phone || selectedChat.telefone,
          source: "human",
          ownerId: currentAgentId,
          ownerName: currentAgentName,
          nextFollowupAt: nextFollowupInput || null,
        })
      });
      
      const data = await res.json().catch(() => ({}));
      console.log("n8n response:", data);
      if (res.ok && data?.success) {
        setAutomationState((prev: any) => ({
          ...(prev || {}),
          id: selectedChat.id,
          automation_status: 'paused_human',
          automation_paused_at: new Date().toISOString(),
        }));
      } else {
        setMessages((prev) => prev.filter((msg) => msg.id !== newMsg.id));
        setSendError(data?.details || data?.error || `Falha ao enviar mensagem (${res.status})`);
      }
    } catch (err) {
      setMessages((prev) => prev.filter((msg) => msg.id !== newMsg.id));
      setSendError("Não foi possível enviar a mensagem agora.");
      console.error("Failed to send message via n8n:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleAutomationToggle = async () => {
    if (!selectedChat?.id) return;

    const nextAction = automationState?.automation_status === 'paused_human' ? 'resume' : 'pause';
    setIsUpdatingAutomation(true);

    try {
      const res = await fetch('/api/conversations/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedChat.id,
          action: nextAction,
          pausedBy: currentAgentId,
          ownerId: nextAction === 'pause' ? currentAgentId : null,
          ownerName: nextAction === 'pause' ? currentAgentName : null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Falha ao atualizar automacao (${res.status})`);
      }

      setAutomationState(data.lead);
    } catch (err) {
      console.error('Failed to update automation state:', err);
    } finally {
      setIsUpdatingAutomation(false);
    }
  };

  const handleGenerateProposal = async () => {
    if (!selectedChat) return;

    setGoogleAuthError(null);
    setIsGeneratingDoc(true);
    try {
      const payload = {
        contactName: selectedChat.full_name || selectedChat.nome || selectedChat.phone || selectedChat.telefone,
        phone: selectedChat.phone || selectedChat.telefone || '',
        origin: selectedChat.origin || selectedChat.origem || '',
        interest: selectedChat.interest || selectedChat.interesse || '',
      };

      const res = await fetch('/api/n8n/proposal-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.docUrl) {
        throw new Error(data?.error || `Falha ao gerar proposta (${res.status})`);
      }

      window.open(data.docUrl, '_blank');
    } catch (err: any) {
      console.error('Failed to generate proposal:', err);

      const rawMessage = String(err?.message || '');
      let message = 'Falha ao gerar proposta no Google Docs. Tente novamente.';

      if (rawMessage.includes('insufficientPermissions') || rawMessage.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT')) {
        message = 'O refresh token não tem escopo do Google Docs. Reautorize no OAuth com o escopo https://www.googleapis.com/auth/documents.';
      } else if (rawMessage.includes('invalid_grant')) {
        message = 'Refresh token inválido/expirado. Gere um novo GOOGLE_REFRESH_TOKEN e atualize na Vercel.';
      } else if (rawMessage.includes('Missing GOOGLE_CLIENT_ID')) {
        message = 'Variáveis GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN ausentes na Vercel.';
      } else if (rawMessage) {
        message = rawMessage;
      }

      setGoogleAuthError(message);
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleConversationStatusChange = async (nextStatus: string) => {
    if (!selectedChat?.id) return;
    setIsUpdatingLeadOps(true);
    try {
      const res = await fetch('/api/leads/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedChat.id,
          conversationStatus: nextStatus,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Falha ao atualizar status (${res.status})`);
      }

      setAutomationState((prev: any) => ({ ...(prev || {}), ...data.lead }));
      setSelectedChat((prev: any) => (prev ? { ...prev, ...data.lead } : prev));
      setActiveChats((prev: any[]) => prev.map((chat) => (chat.id === data.lead.id ? { ...chat, ...data.lead } : chat)));
    } catch (err) {
      console.error('Failed to update lead ops:', err);
    } finally {
      setIsUpdatingLeadOps(false);
    }
  };

  const handleAssignToMe = async () => {
    if (!selectedChat?.id) return;
    setIsUpdatingLeadOps(true);
    try {
      const res = await fetch('/api/leads/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedChat.id,
          ownerId: currentAgentId,
          ownerName: currentAgentName,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Falha ao atribuir responsavel (${res.status})`);
      }

      setAutomationState((prev: any) => ({ ...(prev || {}), ...data.lead }));
      setSelectedChat((prev: any) => (prev ? { ...prev, ...data.lead } : prev));
      setActiveChats((prev: any[]) => prev.map((chat) => (chat.id === data.lead.id ? { ...chat, ...data.lead } : chat)));
    } catch (err) {
      console.error('Failed to assign owner:', err);
    } finally {
      setIsUpdatingLeadOps(false);
    }
  };

  const handleSaveFollowup = async () => {
    if (!selectedChat?.id) return;
    setIsUpdatingLeadOps(true);
    try {
      const res = await fetch('/api/leads/ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedChat.id,
          nextFollowupAt: nextFollowupInput || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Falha ao salvar retorno (${res.status})`);
      }

      setAutomationState((prev: any) => ({ ...(prev || {}), ...data.lead }));
      setSelectedChat((prev: any) => (prev ? { ...prev, ...data.lead } : prev));
      setActiveChats((prev: any[]) => prev.map((chat) => (chat.id === data.lead.id ? { ...chat, ...data.lead } : chat)));
    } catch (err) {
      console.error('Failed to save follow-up:', err);
    } finally {
      setIsUpdatingLeadOps(false);
    }
  };

  const handleScheduleConsultation = () => {
    if (!selectedChat?.id) return;
    navigate(`/calendar?leadId=${encodeURIComponent(selectedChat.id)}`);
  };

  const handleSelectChat = (chat: any) => {
    setSelectedChat(chat);
    if (searchParams.get("leadId")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("leadId");
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleAppointmentStatusChange = async (nextStatus: string) => {
    if (!selectedChat?.id) return;
    setIsUpdatingLeadOps(true);
    try {
      const res = await fetch('/api/automation/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedChat.id,
          event: nextStatus,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Falha ao atualizar consulta (${res.status})`);
      }

      setAutomationState((prev: any) => ({ ...(prev || {}), ...data.lead }));
      setSelectedChat((prev: any) => (prev ? { ...prev, ...data.lead } : prev));
      setActiveChats((prev: any[]) => prev.map((chat) => (chat.id === data.lead.id ? { ...chat, ...data.lead } : chat)));
    } catch (err) {
      console.error('Failed to update appointment status:', err);
    } finally {
      setIsUpdatingLeadOps(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Central de Conversas</h1>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mt-1">Interações Omnichannel & n8n</p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm min-h-[600px] h-[calc(100vh-180px)]">
        
        {/* Left pane: Chats List */}
        <div className="w-80 flex flex-col border-r border-gray-200 shrink-0 bg-white">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar conversa..."
                className="bg-transparent outline-none w-full text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs font-bold text-gray-900">Abertas ({filteredChats.length})</span>
              <span className="text-xs font-medium text-[#2563EB] cursor-pointer">Filtrar</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loadingChats ? (
              <div className="p-4 text-center text-sm text-gray-500">Carregando conversas...</div>
            ) : filteredChats.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">Nenhuma conversa encontrada.</div>
            ) : filteredChats.map((chat) => {
              const isSelected = selectedChat?.id === chat.id;
              const dateStr = chat.last_interaction_at || chat.ultima_interacao_em || chat.updated_at || chat.created_at;
              const time = dateStr ? new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              
               return (
                 <div 
                   key={chat.id} 
                   onClick={() => handleSelectChat(chat)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`text-sm font-bold truncate pr-2 ${isSelected ? 'text-[#2563EB]' : 'text-gray-900'}`}>{chat.full_name || chat.nome || chat.phone || chat.telefone}</h4>
                    <span className="text-[10px] text-gray-400 font-medium shrink-0">{time}</span>
                  </div>
                   <div className="flex justify-between items-end">
                     <p className="text-xs text-gray-500 truncate pr-4">{chat.phone || chat.telefone} • {chat.origin || chat.origem || 'Desconhecido'}</p>
                     {chat.automation_status === 'paused_human' ? (
                       <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">Humano</span>
                     ) : (
                       <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">Auto</span>
                     )}
                   </div>
                 </div>
               );
            })}
          </div>
        </div>

        {/* Right pane: Active Chat */}
        <div className="flex-1 flex flex-col bg-[#F9FAFB]">
          {/* Chat Header */}
          <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
            {selectedChat ? (
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 flex items-center justify-center rounded-full bg-orange-100 text-orange-600 font-bold uppercase">
                   {(selectedChat.full_name || selectedChat.nome) ? (selectedChat.full_name || selectedChat.nome).substring(0, 2) : 'LC'}
                 </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">{selectedChat.full_name || selectedChat.nome || selectedChat.phone || selectedChat.telefone}</h2>
                    <p className="text-[10px] text-[#25D366] font-bold">Online / WhatsApp</p>
                    {automationState?.automation_status === 'paused_human' ? (
                      <p className="text-[10px] text-amber-600 font-bold">Atendimento humano ativo</p>
                    ) : (
                      <p className="text-[10px] text-blue-600 font-bold">Automacao ativa</p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                        {selectedLeadStatus.replaceAll("_", " ")}
                      </span>
                      {(automationState?.owner_name || selectedChat?.owner_name) && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {automationState?.owner_name || selectedChat?.owner_name}
                        </span>
                      )}
                      {(automationState?.calendar_event_id || selectedChat?.calendar_event_id) && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          Consulta vinculada
                        </span>
                      )}
                      {(automationState?.calendar_event_id || selectedChat?.calendar_event_id) && (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          {formatAppointmentStatusLabel(automationState?.appointment_status || selectedChat?.appointment_status)}
                        </span>
                      )}
                      {(automationState?.next_followup_at || selectedChat?.next_followup_at) && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          Retorno {formatDateTimeLabel(automationState?.next_followup_at || selectedChat?.next_followup_at)}
                        </span>
                      )}
                    </div>
                  </div>
               </div>
            ) : (
              <div className="text-sm text-gray-500 font-medium">Selecione uma conversa</div>
            )}
            <div className="flex items-center gap-3">
               <select
                 value={selectedLeadStatus}
                 onChange={(e) => handleConversationStatusChange(e.target.value)}
                 disabled={!selectedChat || isUpdatingLeadOps}
                 className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm disabled:opacity-50"
               >
                 <option value="novo">Novo</option>
                 <option value="em_atendimento">Em atendimento</option>
                 <option value="aguardando_cliente">Aguardando cliente</option>
                 <option value="agendado">Agendado</option>
                 <option value="em_followup">Em follow-up</option>
                 <option value="encerrado">Encerrado</option>
               </select>
               <button
                 onClick={handleAssignToMe}
                 disabled={!selectedChat || isUpdatingLeadOps}
                 className="px-3 py-1.5 border border-slate-200 bg-slate-50 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 shadow-sm disabled:opacity-50"
               >
                 Assumir para mim
               </button>
               <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2 py-1 shadow-sm">
                 <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Retorno</span>
                 <input
                   type="datetime-local"
                   value={nextFollowupInput}
                   onChange={(e) => setNextFollowupInput(e.target.value)}
                   disabled={!selectedChat || isUpdatingLeadOps}
                   className="bg-transparent text-xs font-medium text-gray-700 outline-none disabled:opacity-50"
                 />
                 <button
                   onClick={handleSaveFollowup}
                   disabled={!selectedChat || isUpdatingLeadOps}
                   className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                 >
                   Salvar
                 </button>
               </div>
               <button 
                 onClick={handleAutomationToggle}
                 disabled={!selectedChat || isUpdatingAutomation}
                 className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${
                   automationState?.automation_status === 'paused_human'
                     ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                     : 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                 } disabled:opacity-50`}
               >
                 {isUpdatingAutomation
                   ? 'Salvando...'
                   : automationState?.automation_status === 'paused_human'
                     ? 'Retomar Automacao'
                     : 'Assumir Atendimento'}
               </button>
              <button 
                 onClick={handleGenerateProposal}
                 disabled={isGeneratingDoc}
                 className="px-3 py-1.5 border border-indigo-200 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 shadow-sm flex items-center gap-2 disabled:opacity-50"
               >
                {isGeneratingDoc ? "Gerando..." : "Gerar Proposta (Docs)"}
              </button>
              <button
                onClick={handleScheduleConsultation}
                disabled={!selectedChat}
                className="px-3 py-1.5 border border-emerald-200 bg-emerald-50 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-100 shadow-sm disabled:opacity-50"
              >
                Agendar Consulta
              </button>
              <button
                onClick={() => handleAppointmentStatusChange('confirmed')}
                disabled={!selectedChat || !(automationState?.calendar_event_id || selectedChat?.calendar_event_id) || isUpdatingLeadOps}
                className="px-3 py-1.5 border border-teal-200 bg-teal-50 rounded-lg text-xs font-bold text-teal-700 hover:bg-teal-100 shadow-sm disabled:opacity-50"
              >
                Confirmou
              </button>
              <button
                onClick={() => handleAppointmentStatusChange('rescheduled')}
                disabled={!selectedChat || !(automationState?.calendar_event_id || selectedChat?.calendar_event_id) || isUpdatingLeadOps}
                className="px-3 py-1.5 border border-orange-200 bg-orange-50 rounded-lg text-xs font-bold text-orange-700 hover:bg-orange-100 shadow-sm disabled:opacity-50"
              >
                Remarcar
              </button>
              <button
                onClick={handleSaveFollowup}
                disabled={!selectedChat || isUpdatingLeadOps}
                className="px-3 py-1.5 border border-gray-200 bg-white rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                Marcar Retorno
              </button>
              <button className="text-gray-400 hover:text-gray-600"><MoreVertical className="w-5 h-5"/></button>
            </div>
          </div>

          {googleAuthError && (
            <div className="mx-6 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {googleAuthError}
            </div>
          )}

          {sendError && (
            <div className="mx-6 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {sendError}
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex justify-center">
              <span className="bg-gray-100 text-gray-500 text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full">Hoje</span>
            </div>
            
            {messages.map((msg) => {
              if (msg.type === "system") {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl flex items-center gap-2 max-w-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="text-xs font-medium text-blue-800">
                        <span className="font-bold">{msg.senderLabel || "Sistema"}</span> • {msg.text} às {msg.time}
                      </span>
                    </div>
                  </div>
                );
              }
              
              if (msg.type === "inbound") {
                return (
                  <div key={msg.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 shrink-0" />
                    <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[80%]">
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-orange-500">
                        {msg.senderLabel || "Cliente"}
                      </div>
                      {msg.messageType && msg.messageType !== "text" && (
                        <div className="mb-1 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                          {msg.messageType}
                        </div>
                      )}
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.text}</p>
                      <div className="text-right mt-1">
                        <span className="text-[10px] text-gray-400 font-medium">{msg.time}</span>
                      </div>
                    </div>
                  </div>
                );
              }
              
              if (msg.type === "outbound") {
                return (
                  <div key={msg.id} className="flex items-start justify-end gap-3">
                    <div className="bg-[#DCF8C6] border border-[#d6efc2] p-3 rounded-2xl rounded-tr-none shadow-sm max-w-[80%]">
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        {msg.senderLabel || "Equipe"}
                      </div>
                      {msg.messageType && msg.messageType !== "text" && (
                        <div className="mb-1 inline-flex rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500">
                          {msg.messageType}
                        </div>
                      )}
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.text}</p>
                      <div className="text-right mt-1">
                        <span className="text-[10px] text-gray-500 font-medium">{msg.time}</span>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs font-bold shrink-0">RD</div>
                  </div>
                );
              }

              return null;
            })}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-200 shrink-0">
             <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
               <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                 <Paperclip className="w-5 h-5" />
               </button>
               <textarea 
                 rows={1}
                 value={inputText}
                 onChange={(e) => setInputText(e.target.value)}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter' && !e.shiftKey) {
                     e.preventDefault();
                     handleSend();
                   }
                 }}
                 placeholder="Digite sua mensagem. Será enviada ao WhatsApp pelo n8n..." 
                 className="w-full bg-transparent outline-none resize-none text-sm py-2 max-h-32 text-gray-900 placeholder:text-gray-400"
               />
               <button 
                 onClick={handleSend}
                 disabled={isSending || !inputText.trim()}
                 className="p-2.5 bg-[#2563EB] text-white rounded-lg shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
               >
                 <Send className="w-4 h-4" />
               </button>
             </div>
          </div>

        </div>

      </div>
    </div>
  );
}
