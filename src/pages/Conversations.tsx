import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  Search, Send, Paperclip, MessageSquare, Zap, Loader2, User
} from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { motion } from "motion/react";
import { PremiumButton } from "../components/premium/PremiumButton";
import { cn } from "../lib/utils";

// --- Utilities ---
function normalizePhone(raw: any): string {
  if (!raw) return "";
  const base = String(raw).split("@")[0].trim();
  return base.replace(/\D/g, "");
}

function extractMessageText(payload: any): string {
  if (!payload) return "";
  return String(
    payload.message || payload.text || payload.content ||
    payload?.data?.message?.conversation ||
    payload?.data?.message?.extendedTextMessage?.text || ""
  ).trim();
}

function extractPhone(payload: any): string {
  if (!payload) return "";
  return normalizePhone(
    payload.phone || payload.from || payload.remoteJid ||
    payload.wa_id || payload.sender || payload.destination ||
    payload?.data?.key?.remoteJid || ""
  );
}

function formatMessageLabel(type: string, text: string) {
  if (type === "reaction") return `Reação: ${text || "👍"}`;
  if (["audio", "image", "document", "video"].includes(type)) return text || `[${type.toUpperCase()}]`;
  return text;
}

function formatSenderLabel(source?: string | null, type?: string | null) {
  const normalized = String(source || "").toLowerCase();
  if (normalized === "human") return "Equipe";
  if (normalized === "agent") return "Agente IA";
  if (normalized === "system" || type === "system") return "Sistema";
  return "Cliente";
}

/** Returns a display name for a lead — never returns just a phone number */
function getDisplayName(chat: any): string {
  const raw = String(chat?.full_name || chat?.nome || "").trim();
  // If the "name" is all digits (phone number stored as name), fallback
  if (!raw || /^\+?\d[\d\s\-()]{6,}$/.test(raw)) {
    return "Visitante";
  }
  return raw;
}

/** Returns a single initial for avatar — never a digit */
function getInitial(name: string): string {
  const letter = name.replace(/[^a-zA-ZÀ-ÿ]/g, "").charAt(0).toUpperCase();
  return letter || "V";
}

/**
 * Conversations Page: Hybrid messaging hub combining AI automation and human interaction.
 */
export default function Conversations() {
  const [activeChats, setActiveChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [automationState, setAutomationState] = useState<any>(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [isUpdatingAutomation, setIsUpdatingAutomation] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const supabase = useMemo(() => createClient(), []);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const currentAgentName = currentUser?.user_metadata?.full_name || currentUser?.email || "Equipe Clínica";
  const currentAgentId = currentUser?.id || null;
  
  const filteredChats = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return activeChats;
    return activeChats.filter((c: any) => {
      const name = getDisplayName(c).toLowerCase();
      const phone = String(c.phone || c.telefone || "").toLowerCase();
      return name.includes(term) || phone.includes(term);
    });
  }, [activeChats, searchTerm]);

  useEffect(() => {
    async function fetchCurrentUser() {
      const { data } = await supabase.auth.getUser();
      setCurrentUser(data.user || null);
    }
    fetchCurrentUser();
  }, [supabase]);

  useEffect(() => {
    async function fetchChats() {
      let { data, error } = await supabase
        .from('leads')
        .select('id, full_name, nome, phone, telefone, origin, automation_status, updated_at, created_at');
      if (error) {
        const legacy = await supabase.from('Usuarios').select('*');
        data = legacy.data ? legacy.data.map((u: any) => ({
          ...u,
          full_name: u.full_name || u.nome || '',
          phone: u.phone || u.telefone || '',
        })) : null;
      }
      if (data) {
        const sorted = [...data].sort((a: any, b: any) =>
          new Date(b.updated_at || b.created_at || 0).getTime() -
          new Date(a.updated_at || a.created_at || 0).getTime()
        );
        const prefId = String(searchParams.get("leadId") || "").trim();
        const prefChat = prefId ? sorted.find((item: any) => item.id === prefId) : null;
        setActiveChats(sorted);
        setSelectedChat((prev: any) => prefChat || prev || (sorted.length > 0 ? sorted[0] : null));
      }
      setLoadingChats(false);
    }
    fetchChats();
    const ch = supabase.channel('realtime-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchChats)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [searchParams, supabase]);

  useEffect(() => {
    async function fetchMessages() {
      if (!selectedChat) return;
      setLoadingMessages(true);
      const selectedPhone = normalizePhone(selectedChat.phone || selectedChat.telefone || "");
      
      if (!selectedPhone) {
        setMessages([]);
        setLoadingMessages(false);
        return;
      }

      try {
        // 1. Try structured messages table via conversations
        const { data: convRows } = await supabase
          .from('conversations')
          .select('id')
          .eq('lead_id', selectedChat.id)
          .order('updated_at', { ascending: false })
          .limit(5);

        if (convRows && convRows.length > 0) {
          const { data: msgRows } = await supabase
            .from('messages')
            .select('*')
            .in('conversation_id', convRows.map((c: any) => c.id))
            .order('created_at', { ascending: true })
            .limit(300);

          if (msgRows && msgRows.length > 0) {
            setMessages(msgRows.map((m: any) => ({
              id: m.id,
              type: m.type === 'system' ? 'system' : m.direction === 'outbound' ? 'outbound' : 'inbound',
              messageType: m.type || 'text',
              senderLabel: formatSenderLabel(m.source, m.type),
              text: formatMessageLabel(String(m.type || 'text'), String(m.content || '')),
              time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            })));
            setLoadingMessages(false);
            return;
          }
        }

        // 2. Fallback: integration_events filtered by phone
        const { data: events } = await supabase
          .from('integration_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);

        const mapped = (events || [])
          .filter((evt: any) => {
            const evtPhone = extractPhone(evt.payload);
            return evtPhone && evtPhone.slice(-8) === selectedPhone.slice(-8);
          })
          .map((evt: any) => {
            const text = extractMessageText(evt.payload);
            const type = String(
              evt.payload?.messageType ||
              evt.payload?.type ||
              evt.payload?.data?.messageType ||
              "text"
            ).trim();
            return {
              id: evt.id,
              type: evt.direction === 'outbound' ? 'outbound' : 'inbound',
              messageType: type,
              senderLabel: formatSenderLabel(
                evt.payload?.source || evt.payload?.payload?.source ||
                (evt.direction === 'outbound' ? 'agent' : 'customer'),
                type
              ),
              text: formatMessageLabel(type, text || '[mensagem sem texto]'),
              time: new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              rawDate: new Date(evt.created_at),
            };
          })
          .filter(m => m.text && m.text !== '[mensagem sem texto]');

        setMessages([...mapped].sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime()));
      } catch (err) {
        console.error('Erro ao buscar mensagens:', err);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    }

    fetchMessages();
    const chMsg = supabase.channel(`realtime-msg-${selectedChat?.id || 'none'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchMessages)
      .subscribe();
    return () => { supabase.removeChannel(chMsg); };
  }, [selectedChat, supabase]);

  useEffect(() => {
    async function fetchAutomation() {
      if (!selectedChat?.id) return;
      try {
        const res = await fetch(`/api/conversations/automation?leadId=${encodeURIComponent(selectedChat.id)}`);
        const data = await res.json();
        if (data?.ok) setAutomationState(data.lead);
        else setAutomationState(selectedChat); // fallback to lead data
      } catch {
        setAutomationState(selectedChat);
      }
    }
    fetchAutomation();
  }, [selectedChat]);

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
      const data = await res.json();
      if (data?.ok) setAutomationState(data.lead);
    } finally { setIsUpdatingAutomation(false); }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !selectedChat) return;
    setSendError(null);
    const newMsg = {
      id: Date.now(),
      type: "outbound",
      senderLabel: "Equipe",
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
        }),
      });
      if (res.ok) {
        setAutomationState((p: any) => ({ ...p, automation_status: 'paused_human' }));
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.details || errData?.error || `Status ${res.status}`);
      }
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== newMsg.id));
      setSendError(`Falha no envio. Verifique a conexão com o n8n. (${err.message || "Erro desconhecido"})`);
    } finally { setIsSending(false); }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const isHumanMode = automationState?.automation_status === 'paused_human';

  return (
    <div className="flex-1 overflow-hidden h-full w-full flex flex-col">
      
      {/* --- Compact Header --- */}
      <div className="shrink-0 px-5 pt-4 pb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gold/10 border border-gold/20 text-[13px] uppercase tracking-[0.15em] font-bold text-[#E5C38C] mb-0.5">
              <Zap className="h-2.5 w-2.5 animate-pulse" />
              <span>Intervenção Humana</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white font-display">Central de Conversas</h1>
          </div>
        </div>
        <p className="text-xs font-light text-white/30">
          {loadingChats ? "Carregando..." : `${activeChats.length} diálogos ativos`}
        </p>
      </div>

      {/* --- Main Interface: Split Pane --- */}
      <section className="flex-1 flex min-h-0 overflow-hidden mx-3 mb-3 mt-3 rounded-xl border border-white/5 bg-black-void/40 backdrop-blur-3xl shadow-2xl">
        
        {/* Left: Chat Directory */}
        <div className="w-64 shrink-0 flex flex-col border-r border-white/5 bg-black-matte/40">
          <div className="p-3 border-b border-white/5 space-y-2">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/10 group-focus-within:text-gold transition-colors" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Localizar diálogo..."
                className="w-full bg-white/[0.02] border border-white/5 rounded-lg py-2 pl-9 pr-3 text-[13px] text-white focus:outline-none focus:border-gold/30 transition-all"
              />
            </div>
            <div className="flex justify-between items-center px-1">
              <span className="text-[13px] uppercase tracking-[0.2em] font-black text-white/20">DIÁLOGOS ATIVOS</span>
              <span className="text-[13px] font-mono text-gold/60">{filteredChats.length}</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
            {loadingChats ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-gold/40 animate-spin" />
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <MessageSquare className="h-7 w-7 text-white/5 mb-2" />
                <p className="text-[14px] font-bold uppercase tracking-widest text-white/20">Nenhum diálogo encontrado</p>
              </div>
            ) : filteredChats.map((chat) => {
              const isSelected = selectedChat?.id === chat.id;
              const displayName = getDisplayName(chat);
              const phone = chat.phone || chat.telefone || "";
              return (
                <motion.div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={cn(
                    "px-3 py-2.5 cursor-pointer transition-all relative group border-b border-white/[0.02]",
                    isSelected ? "bg-gold/5" : "hover:bg-white/[0.02]"
                  )}
                >
                  {isSelected && (
                    <motion.div layoutId="chat-select" className="absolute left-0 top-2 bottom-2 w-0.5 bg-gold rounded-r-full" />
                  )}
                  <div className="flex items-center gap-2.5">
                    {/* Mini avatar */}
                    <div className={cn(
                      "h-7 w-7 shrink-0 rounded-lg flex items-center justify-center text-[13px] font-black",
                      isSelected ? "bg-gold-gradient text-black" : "bg-white/5 text-white/40"
                    )}>
                      {getInitial(displayName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-2">
                        <h4 className={cn(
                          "text-xs font-bold truncate transition-colors",
                          isSelected ? "text-gold" : "text-white/80 group-hover:text-white"
                        )}>
                          {displayName}
                        </h4>
                        <div className={cn(
                          "h-1.5 w-1.5 rounded-full shrink-0",
                          chat.automation_status === 'paused_human'
                            ? "bg-amber-400"
                            : "bg-blue-400"
                        )} />
                      </div>
                      <p className="text-[14px] text-white/30 font-mono truncate mt-0.5">
                        {phone ? `...${phone.slice(-8)}` : (chat.origin || "DIRECT")}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Right: Chat Pane */}
        <div className="flex-1 flex flex-col min-w-0 bg-black-void/20 relative">
          {selectedChat ? (
            <>
              {/* Chat Header — compact, no overflow */}
              <div className="shrink-0 px-4 py-3 border-b border-white/5 bg-black-matte/60 backdrop-blur-xl flex flex-wrap items-center gap-3">
                {/* Contact Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-gold-gradient text-black flex items-center justify-center font-display font-black text-sm shadow-gold">
                    {getInitial(getDisplayName(selectedChat))}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-black text-white font-display tracking-tight leading-none truncate">
                      {getDisplayName(selectedChat)}
                    </h2>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <div className={cn(
                        "px-2 py-0.5 rounded-full text-[14px] font-black uppercase tracking-widest border shrink-0",
                        isHumanMode
                          ? "border-amber-500/20 text-amber-400 bg-amber-500/5"
                          : "border-blue-500/20 text-blue-400 bg-blue-500/5 animate-pulse"
                      )}>
                        {isHumanMode ? "MODO HUMANO" : "IA ASSISTENTE"}
                      </div>
                      <span className="text-[14px] text-white/20 font-mono truncate">
                        {selectedChat.phone || selectedChat.telefone || "—"}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <PremiumButton
                    variant="outline"
                    onClick={() => navigate(`/calendar?leadId=${selectedChat.id}`)}
                    className="py-1.5 px-3 text-[14px]"
                  >
                    AGENDAR
                  </PremiumButton>
                  <PremiumButton
                    onClick={handleAutomationToggle}
                    className="py-1.5 px-3 text-[14px]"
                    disabled={isUpdatingAutomation}
                  >
                    {isUpdatingAutomation ? "..." : isHumanMode ? "LIGAR IA" : "PAUSAR IA"}
                  </PremiumButton>
                </div>
              </div>

              {/* Messages Stage */}
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide"
              >
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 text-gold/40 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-10 text-center space-y-3 opacity-30">
                    <User className="h-10 w-10 text-white" />
                    <div>
                      <p className="text-[13px] font-black uppercase tracking-[0.3em] text-white">Sem mensagens</p>
                      <p className="text-[14px] text-white/50 mt-1">As mensagens aparecerão aqui quando sincronizadas pelo n8n</p>
                    </div>
                  </div>
                ) : messages.map((msg, i) => {
                  const isOut = msg.type === "outbound";
                  const isSys = msg.type === "system";
                  if (isSys) return (
                    <div key={msg.id} className="flex justify-center">
                      <span className="text-[14px] font-black uppercase tracking-[0.4em] text-white/10 bg-white/[0.02] px-5 py-1.5 rounded-full border border-white/5">
                        {msg.text}
                      </span>
                    </div>
                  );
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.3) }}
                      className={cn("flex flex-col gap-1", isOut ? "items-end" : "items-start")}
                    >
                      <div className={cn(
                        "text-[14px] font-bold uppercase tracking-widest px-2 flex items-center gap-1",
                        isOut ? "text-gold/50" : "text-white/20"
                      )}>
                        {isOut && <Zap className="h-2.5 w-2.5" />}
                        {msg.senderLabel}
                      </div>
                      <div className={cn(
                        "max-w-[75%] px-4 py-2.5 rounded-xl text-xs leading-relaxed shadow-lg border",
                        isOut
                          ? "bg-gold/8 border-gold/15 text-white rounded-tr-sm"
                          : "bg-white/[0.04] border-white/5 text-white/80 rounded-tl-sm"
                      )}>
                        <p className="font-light whitespace-pre-wrap break-words">{msg.text}</p>
                        <div className="mt-2 flex justify-end">
                          <span className="text-[14px] font-mono text-white/15">{msg.time}</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Input Command Center */}
              <div className="shrink-0 p-3 bg-black-matte/80 border-t border-white/5 backdrop-blur-2xl">
                {sendError && (
                  <div className="mb-3 text-xs text-red-400 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20">
                    {sendError}
                  </div>
                )}
                <div className="flex items-end gap-2 bg-white/[0.02] border border-white/8 rounded-xl p-2 focus-within:border-gold/30 transition-all">
                  <button className="p-1.5 text-white/10 hover:text-gold transition-colors shrink-0">
                    <Paperclip className="h-3.5 w-3.5" />
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
                    placeholder="Escrever mensagem... (Enter para enviar)"
                    className="flex-1 bg-transparent outline-none resize-none text-xs py-1.5 max-h-32 text-white placeholder:text-white/15 font-light"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    disabled={isSending || !inputText.trim()}
                    className="h-8 w-8 bg-gold-gradient text-black rounded-lg flex items-center justify-center shadow-gold disabled:opacity-30 shrink-0 transition-opacity"
                  >
                    {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </motion.button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 opacity-20">
              <MessageSquare className="h-10 w-10 text-white" />
              <p className="text-[14px] font-black uppercase tracking-[0.3em] text-white">Selecione um diálogo</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
