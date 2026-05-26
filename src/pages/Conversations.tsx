import { useState, useRef, useEffect } from "react";
import { Search, Send, User, Paperclip, MoreVertical, CheckCircle2 } from "lucide-react";
import { createClient } from "../lib/supabase/client";

export default function Conversations() {
  const [activeChats, setActiveChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);

  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Load leads/chats
  useEffect(() => {
    async function fetchChats() {
      const { data, error } = await supabase
        .from('Usuarios')
        .select('*');

      if (error) {
        console.error('Erro ao buscar conversas (Usuarios):', error);
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

        setActiveChats(sorted);
        // Set selectedChat only if none is selected, so we don't overwrite user selection
        setSelectedChat(prev => {
          if (!prev && sorted.length > 0) return sorted[0];
          // If we have a selected chat, ensure we keep the updated object (for time displaying)
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
  }, []);

  // Load messages when selectedChat changes
  useEffect(() => {
    async function fetchMessages() {
      if (!selectedChat) return;

      // Ambiente atual não possui tabelas conversations/messages.
      // Exibimos um histórico mínimo a partir dos dados do contato para não zerar a tela.
      const contactName = selectedChat.full_name || selectedChat.nome || selectedChat.phone || selectedChat.telefone || 'Contato';
      const lastAt = selectedChat.last_interaction_at || selectedChat.ultima_interacao_em || selectedChat.updated_at || selectedChat.created_at;
      const lastTime = lastAt ? new Date(lastAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMessages([
        {
          id: `${selectedChat.id}_system`,
          type: 'system',
          text: `Conversa ativa com ${contactName}`,
          time: lastTime,
        },
      ]);
    }
    
    fetchMessages();
    const intervalId = setInterval(fetchMessages, 3000);
    return () => clearInterval(intervalId);
  }, [selectedChat]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !selectedChat) return;
    
    const newMsg = {
      id: Date.now(),
      type: "outbound",
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
          type: "whatsapp",
          destination: selectedChat.phone || selectedChat.telefone
        })
      });
      
      const data = await res.json();
      console.log("n8n response:", data);
      
      // Simulate reply for demo purposes
      if (data.simulated) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: "inbound",
            text: "Mensagem enviada com sucesso (Simulação).",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }, 3000);
      }
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
              <input type="text" placeholder="Buscar conversa..." className="bg-transparent outline-none w-full text-gray-900 placeholder:text-gray-400" />
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs font-bold text-gray-900">Abertas ({activeChats.length})</span>
              <span className="text-xs font-medium text-[#2563EB] cursor-pointer">Filtrar</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loadingChats ? (
              <div className="p-4 text-center text-sm text-gray-500">Carregando conversas...</div>
            ) : activeChats.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">Nenhuma conversa encontrada.</div>
            ) : activeChats.map((chat) => {
              const isSelected = selectedChat?.id === chat.id;
              const dateStr = chat.last_interaction_at || chat.ultima_interacao_em || chat.updated_at || chat.created_at;
              const time = dateStr ? new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              
              return (
                <div 
                  key={chat.id} 
                  onClick={() => setSelectedChat(chat)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`text-sm font-bold truncate pr-2 ${isSelected ? 'text-[#2563EB]' : 'text-gray-900'}`}>{chat.full_name || chat.nome || chat.phone || chat.telefone}</h4>
                    <span className="text-[10px] text-gray-400 font-medium shrink-0">{time}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-xs text-gray-500 truncate pr-4">{chat.phone || chat.telefone} • {chat.origin || chat.origem || 'Desconhecido'}</p>
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
                 </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 font-medium">Selecione uma conversa</div>
            )}
            <div className="flex items-center gap-3">
              <button 
                onClick={handleGenerateProposal}
                disabled={isGeneratingDoc}
                className="px-3 py-1.5 border border-indigo-200 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isGeneratingDoc ? "Gerando..." : "Gerar Proposta (Docs)"}
              </button>
              <button className="px-3 py-1.5 border border-gray-200 bg-white rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 shadow-sm flex items-center gap-2">
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
                      <span className="text-xs font-medium text-blue-800">{msg.text} às {msg.time}</span>
                    </div>
                  </div>
                );
              }
              
              if (msg.type === "inbound") {
                return (
                  <div key={msg.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 shrink-0" />
                    <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[80%]">
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
