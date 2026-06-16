import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Send, Paperclip, MoreVertical, CheckCircle2, AlertCircle, Sparkles, MessageSquare, ShieldCheck, Zap } from "lucide-react";
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
  if (normalized === "agent") return "Agente IA";
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
      let { data, error } = await supabase
        .from('leads')
        .select('*');

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
        setSelectedChat((prev: any) => {
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

    const channel = supabase
      .channel('realtime-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        fetchChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

    const channelMessages = supabase
      .channel('realtime-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchMessages();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'integration_events' }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channelMessages);
    };
  }, [selectedChat, supabase]);

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
        leadId: selectedChat.id,
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
      setGoogleAuthError(err?.message || 'Falha ao gerar proposta no Google Docs. Tente novamente.');
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
    <div className="flex-1 overflow-hidden p-8 h-full w-full space-y-6 flex flex-col bg-transparent">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-white/5 shrink-0">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] uppercase tracking-widest font-semibold text-[#E5C38C] mb-2">
            <MessageSquare className="h-3 w-3" />
            <span>Mensageria Atendimento</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-serif">Central de Conversas</h1>
          <p className="text-xs text-white/40 font-light mt-1">Gestão híbrida de leads por canais integrados.</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden rounded-3xl border border-white/5 bg-[#0B0D12]/60 backdrop-blur-xl min-h-[500px] h-full shadow-2xl">
        
        {/* Left Pane: Chat List */}
        <div className="w-80 flex flex-col border-r border-white/5 shrink-0 bg-[#0E1118]/80">
          <div className="p-4 border-b border-white/5 space-y-3">
            <div className="flex items-center gap-2 px-3 py-2.5 border border-white/5 rounded-2xl bg-[#07090E]/60 text-xs focus-within:border-[#D4AF37]/45 transition-colors">
              <Search className="w-4 h-4 text-white/30" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar conversa..."
                className="bg-transparent outline-none w-full text-white placeholder:text-white/20"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest font-bold text-white/50">Abertas ({filteredChats.length})</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {loadingChats ? (
              <div className="p-4 text-center text-xs text-white/40">Carregando conversas...</div>
            ) : filteredChats.length === 0 ? (
              <div className="p-4 text-center text-xs text-white/40">Nenhuma conversa encontrada.</div>
            ) : filteredChats.map((chat) => {
              const isSelected = selectedChat?.id === chat.id;
              const dateStr = chat.last_interaction_at || chat.ultima_interacao_em || chat.updated_at || chat.created_at;
              const time = dateStr ? new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              
              return (
                <div 
                  key={chat.id} 
                  onClick={() => handleSelectChat(chat)}
                  className={`p-4 cursor-pointer transition-colors relative ${isSelected ? 'bg-gradient-to-r from-[#D4AF37]/10 to-transparent' : 'hover:bg-white/[0.01]'}`}
                >
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#D4AF37]" />}
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`text-xs font-bold truncate pr-2 ${isSelected ? 'text-[#E5C38C]' : 'text-white'}`}>
                      {chat.full_name || chat.nome || chat.phone || chat.telefone}
                    </h4>
                    <span className="text-[9px] text-white/30 shrink-0 font-mono">{time}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] text-white/45 truncate pr-4">{chat.phone || chat.telefone} • {chat.origin || chat.origem || 'WhatsApp'}</p>
                    {chat.automation_status === 'paused_human' ? (
                      <span className="shrink-0 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-400">Humano</span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-blue-400">Agente IA</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Active Chat */}
        <div className="flex-1 flex flex-col bg-[#07090E]/40 relative">
          
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="border-b border-white/5 bg-[#0E1118]/80 p-4 md:p-6 shrink-0 space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="h-11 w-11 shrink-0 flex items-center justify-center rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/20 text-[#E5C38C] font-semibold font-serif text-base uppercase">
                      {(selectedChat.full_name || selectedChat.nome) ? (selectedChat.full_name || selectedChat.nome).substring(0, 2) : 'RD'}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-2">
                      <h2 className="text-sm font-bold text-white truncate">{selectedChat.full_name || selectedChat.nome || selectedChat.phone || selectedChat.telefone}</h2>
                      <div className="flex items-center gap-2 flex-wrap">
                        {automationState?.automation_status === 'paused_human' ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-[9px] uppercase tracking-wider font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                            Atendimento Humano
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center gap-1 text-[9px] uppercase tracking-wider font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20 animate-pulse">
                            Automação IA Ativa
                          </span>
                        )}
                        <span className="shrink-0 rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/50">
                          {selectedLeadStatus.replaceAll("_", " ")}
                        </span>
                        {(automationState?.owner_name || selectedChat?.owner_name) && (
                          <span className="shrink-0 rounded-full bg-[#111622] border border-white/5 px-2 py-0.5 text-[9px] font-bold text-[#E5C38C] truncate max-w-[150px]">
                            Resp: {automationState?.owner_name || selectedChat?.owner_name}
                          </span>
                        )}
                        {(automationState?.calendar_event_id || selectedChat?.calendar_event_id) && (
                          <span className="shrink-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                            Consulta Agendada
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ações Rápidas no Header */}
                  <div className="flex flex-wrap items-start gap-2.5 shrink-0 pt-1">
                    <select
                      value={selectedLeadStatus}
                      onChange={(e) => handleConversationStatusChange(e.target.value)}
                      disabled={isUpdatingLeadOps}
                      className="rounded-xl border border-white/10 bg-[#07090E] px-3 py-1.5 text-[10px] font-bold text-white/80 outline-none focus:border-[#D4AF37]/40 disabled:opacity-50"
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
                      disabled={isUpdatingLeadOps}
                      className="px-3 py-1.5 shrink-0 border border-white/10 bg-white/5 text-white rounded-xl text-[10px] font-bold hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      Assumir Lead
                    </button>
                    
                    <button 
                      onClick={handleAutomationToggle}
                      disabled={isUpdatingAutomation}
                      className={`px-3 py-1.5 shrink-0 rounded-xl text-[10px] font-bold border transition-colors ${
                        automationState?.automation_status === 'paused_human'
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          : 'border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      } disabled:opacity-50`}
                    >
                      {isUpdatingAutomation ? 'Salvando...' : automationState?.automation_status === 'paused_human' ? 'Ligar IA' : 'Pausar IA'}
                    </button>

                    <button 
                      onClick={handleGenerateProposal}
                      disabled={isGeneratingDoc}
                      className="px-3 py-1.5 shrink-0 border border-purple-500/20 bg-purple-500/10 text-purple-400 rounded-xl text-[10px] font-bold hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                    >
                      {isGeneratingDoc ? "Gerando..." : "Gerar Contrato"}
                    </button>

                    <button
                      onClick={handleScheduleConsultation}
                      className="px-3 py-1.5 shrink-0 border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-bold hover:bg-emerald-500/20 transition-colors"
                    >
                      Agendar
                    </button>
                  </div>
                </div>

                {/* Sub-Header: Agendamento & Follow-ups */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/5">
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-[#07090E]/60 px-3 py-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">Definir Retorno</span>
                    <input
                      type="datetime-local"
                      value={nextFollowupInput}
                      onChange={(e) => setNextFollowupInput(e.target.value)}
                      disabled={isUpdatingLeadOps}
                      className="bg-transparent text-[10px] font-semibold text-white outline-none disabled:opacity-50 [color-scheme:dark]"
                    />
                    <button
                      onClick={handleSaveFollowup}
                      disabled={isUpdatingLeadOps}
                      className="rounded-lg bg-white/10 px-2 py-0.5 text-[9px] font-bold text-[#E5C38C] hover:bg-white/20 disabled:opacity-50"
                    >
                      Salvar
                    </button>
                  </div>

                  {(automationState?.calendar_event_id || selectedChat?.calendar_event_id) && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-white/50">Status da Agenda:</span>
                      <button
                        onClick={() => handleAppointmentStatusChange('confirmed')}
                        className="px-2.5 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-lg text-[9px] font-bold hover:bg-teal-500/20 shrink-0"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => handleAppointmentStatusChange('rescheduled')}
                        className="px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-lg text-[9px] font-bold hover:bg-orange-500/20 shrink-0"
                      >
                        Remarcar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {googleAuthError && (
                <div className="mx-6 mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
                  {googleAuthError}
                </div>
              )}

              {sendError && (
                <div className="mx-6 mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
                  {sendError}
                </div>
              )}

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex justify-center">
                  <span className="bg-white/5 border border-white/10 text-white/40 text-[9px] uppercase tracking-widest font-semibold px-3 py-1 rounded-full">
                    Histórico Recente
                  </span>
                </div>
                
                {messages.map((msg) => {
                  if (msg.type === "system") {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-2xl flex items-center gap-2 max-w-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          <span className="text-[10px] font-medium text-blue-300">
                            <span className="font-bold">{msg.senderLabel || "Sistema"}</span> • {msg.text} às {msg.time}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  
                  if (msg.type === "inbound") {
                    return (
                      <div key={msg.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#E5C38C] font-semibold text-xs flex items-center justify-center shrink-0 uppercase">
                          CL
                        </div>
                        <div className="bg-[#0E1118] border border-white/5 p-4 rounded-2xl rounded-tl-none shadow-md max-w-[80%]">
                          <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[#E5C38C]">
                            {msg.senderLabel || "Cliente"}
                          </div>
                          {msg.messageType && msg.messageType !== "text" && (
                            <div className="mb-1.5 inline-flex rounded-full bg-white/5 px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white/50">
                              {msg.messageType}
                            </div>
                          )}
                          <p className="text-xs leading-relaxed text-white/80 whitespace-pre-wrap">{msg.text}</p>
                          <div className="text-right mt-2">
                            <span className="text-[9px] text-white/30 font-mono">{msg.time}</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  if (msg.type === "outbound") {
                    const isAgent = msg.senderLabel === "Agente IA";
                    return (
                      <div key={msg.id} className="flex items-start justify-end gap-3">
                        <div className={`p-4 rounded-2xl rounded-tr-none shadow-md max-w-[80%] border ${
                          isAgent 
                            ? 'bg-blue-950/20 border-blue-500/10' 
                            : 'bg-[#0E1118] border-white/5'
                        }`}>
                          <div className={`mb-1 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                            isAgent ? 'text-blue-400' : 'text-emerald-400'
                          }`}>
                            {isAgent && <Zap className="h-3 w-3 animate-pulse" />}
                            {msg.senderLabel || "Equipe"}
                          </div>
                          {msg.messageType && msg.messageType !== "text" && (
                            <div className="mb-1.5 inline-flex rounded-full bg-white/5 px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white/50">
                              {msg.messageType}
                            </div>
                          )}
                          <p className="text-xs leading-relaxed text-white/80 whitespace-pre-wrap">{msg.text}</p>
                          <div className="text-right mt-2">
                            <span className="text-[9px] text-white/30 font-mono">{msg.time}</span>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] text-[#0B0D12] flex items-center justify-center text-xs font-bold shrink-0 italic">RD</div>
                      </div>
                    );
                  }

                  return null;
                })}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-[#0E1118]/80 border-t border-white/5 shrink-0">
                <div className="flex items-end gap-2 bg-[#07090E]/60 border border-white/5 rounded-2xl p-2 focus-within:border-[#D4AF37]/45 transition-colors">
                  <button className="p-2.5 text-white/30 hover:text-white transition-colors">
                    <Paperclip className="w-4 h-4" />
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
                    placeholder="Digite sua resposta comercial..." 
                    className="w-full bg-transparent outline-none resize-none text-xs py-2 max-h-32 text-white placeholder:text-white/20"
                  />
                  <button 
                    onClick={handleSend}
                    disabled={isSending || !inputText.trim()}
                    className="p-2.5 bg-gradient-to-r from-[#D4AF37] to-[#E5C38C] text-[#0B0D12] rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <MessageSquare className="h-12 w-12 text-white/10 mb-3" />
              <p className="text-sm text-white/40 font-light">Selecione uma conversa ao lado para visualizar a linha do tempo.</p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
