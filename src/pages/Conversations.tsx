import { useState, useRef, useEffect } from "react";
import { Search, Send, User, Paperclip, MoreVertical, CheckCircle2 } from "lucide-react";

export default function Conversations() {
  const [activeChats, setActiveChats] = useState([
    { id: 1, name: "Mariana Oliveira", msg: "Sim, pode marcar o horário da tarde.", time: "10:45", unread: 2, status: "Quente" },
    { id: 2, name: "Ricardo Albuquerque", msg: "Qual o valor do tratamento?", time: "09:12", unread: 0, status: "Urgente" },
    { id: 3, name: "Beatriz Santos", msg: "Vou olhar com meu marido e retorno.", time: "Ontem", unread: 0, status: "Morno" },
  ]);

  const [messages, setMessages] = useState([
    { id: 1, type: "system", text: "Lead transferido de Bot (n8n) para Humano", time: "10:42" },
    { id: 2, type: "inbound", text: "Bom dia. Gostaria de saber mais sobre o procedimento e os valores associados.", time: "10:42" },
    { id: 3, type: "outbound", text: "Olá Mariana! Bom dia. Claro, temos várias opções de tratamentos com foco na sua necessidade. Podemos marcar uma avaliação inicial gratuita?", time: "10:44" },
    { id: 4, type: "inbound", text: "Sim, pode marcar o horário da tarde.", time: "10:45" }
  ]);

  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    
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
          contactId: "1", 
          message: newMsg.text, 
          type: "whatsapp",
          destination: "+5511999999999"
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
            text: "Mensagem recebida via n8n (Simulação Ativa). Tudo certo!",
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
              <span className="text-xs font-bold text-gray-900">Abertas (14)</span>
              <span className="text-xs font-medium text-[#2563EB] cursor-pointer">Filtrar</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {activeChats.map((chat, idx) => (
              <div key={chat.id} className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${idx === 0 ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`text-sm font-bold ${idx === 0 ? 'text-[#2563EB]' : 'text-gray-900'}`}>{chat.name}</h4>
                  <span className="text-[10px] text-gray-400 font-medium">{chat.time}</span>
                </div>
                <div className="flex justify-between items-end">
                  <p className="text-xs text-gray-500 truncate pr-4">{chat.msg}</p>
                  {chat.unread > 0 && (
                    <div className="bg-[#25D366] text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full shrink-0">
                      {chat.unread}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right pane: Active Chat */}
        <div className="flex-1 flex flex-col bg-[#F9FAFB]">
          {/* Chat Header */}
          <div className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 flex items-center justify-center rounded-full bg-orange-100 text-orange-600 font-bold uppercase">
                 MO
               </div>
               <div>
                 <h2 className="text-sm font-bold text-gray-900">Mariana Oliveira</h2>
                 <p className="text-[10px] text-[#25D366] font-bold">Online no WhatsApp</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-3 py-1.5 border border-gray-200 bg-white rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 shadow-sm flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                Marcar Retorno
              </button>
              <button className="text-gray-400 hover:text-gray-600"><MoreVertical className="w-5 h-5"/></button>
            </div>
          </div>

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
