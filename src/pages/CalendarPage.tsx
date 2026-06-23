import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, MapPin, AlignLeft, Users, Pencil, Save, X, Trash2, Sparkles, CheckCircle2, Clock } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { useSearchParams } from "react-router-dom";
import { PremiumButton } from "../components/premium/PremiumButton";
import { motion, AnimatePresence } from "framer-motion";

type CalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  attendees?: Array<{ email?: string }>;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  htmlLink?: string;
};

type EventFormState = {
  eventId?: string;
  summary: string;
  description: string;
  location: string;
  start: string;
  end: string;
};

function toLocalDateTimeInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputToIso(localValue: string) {
  const d = new Date(localValue);
  if (Number.isNaN(d.getTime())) throw new Error("Data/hora inválida");
  return d.toISOString();
}

function extractDateTime(event?: CalendarEvent) {
  return {
    start: event?.start?.dateTime || event?.start?.date || "",
    end: event?.end?.dateTime || event?.end?.date || "",
  };
}

export default function CalendarPage() {
  const supabase = useMemo(() => createClient(), []);
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [linkedLead, setLinkedLead] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date()); // Represents currently visible month
  const [selectedDate, setSelectedDate] = useState(new Date()); // Represents clicked day
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<EventFormState>({
    summary: "",
    description: "",
    location: "",
    start: "",
    end: "",
  });

  const linkedLeadId = String(searchParams.get("leadId") || "").trim();

  useEffect(() => {
    fetchEvents(currentDate);
  }, [currentDate]);

  useEffect(() => {
    async function fetchLinkedLead() {
      if (!linkedLeadId) {
        setLinkedLead(null);
        return;
      }

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', linkedLeadId)
        .maybeSingle();

      if (error || !data?.id) {
        setLinkedLead(null);
        return;
      }

      setLinkedLead(data);
      if (data.last_appointment_at) {
        const appointmentDate = new Date(data.last_appointment_at);
        if (!Number.isNaN(appointmentDate.getTime())) {
          setSelectedDate(appointmentDate);
          setCurrentDate(appointmentDate);
        }
      }
    }

    fetchLinkedLead();
  }, [linkedLeadId, supabase]);

  const fetchEvents = async (date: Date) => {
    setLoading(true);
    setError(null);
    try {
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const res = await fetch("/api/n8n/calendar", {
        method: "POST",
        headers: await getWriteHeaders(),
        body: JSON.stringify({
          action: "list",
          timeMin: startOfMonth.toISOString(),
          days: 35,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `Erro ao carregar agenda (${res.status})`);
      }

      const nextEvents = Array.isArray(data.events) ? data.events : [];
      setEvents(nextEvents);

      if (linkedLead?.calendar_event_id) {
        const linkedEvent = nextEvents.find((e: CalendarEvent) => e.id === linkedLead.calendar_event_id) || null;
        if (linkedEvent) {
          setSelectedEvent(linkedEvent);
          return;
        }
      }

      if (selectedEvent) {
        const refreshed = nextEvents.find((e: CalendarEvent) => e.id === selectedEvent.id) || null;
        setSelectedEvent(refreshed);
      }
    } catch (err: any) {
      setError(err?.message || "Falha ao carregar agenda");
      setEvents([]);
      setSelectedEvent(null);
    } finally {
      setLoading(false);
    }
  };

  const getWriteHeaders = async () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const openCreate = () => {
    const start = new Date(selectedDate);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10, 0, 0, 0);

    setFormMode("create");
    setForm({
      summary: linkedLead?.full_name ? `Consulta - ${linkedLead.full_name}` : "",
      description: "",
      location: "",
      start: toLocalDateTimeInput(start.toISOString()),
      end: toLocalDateTimeInput(end.toISOString()),
    });
    setFormOpen(true);
    setDetailOpen(false);
  };

  const openEdit = (event: CalendarEvent) => {
    const dt = extractDateTime(event);
    setFormMode("edit");
    setForm({
      eventId: event.id,
      summary: event.summary || "",
      description: event.description || "",
      location: event.location || "",
      start: toLocalDateTimeInput(dt.start),
      end: toLocalDateTimeInput(dt.end),
    });
    setFormOpen(true);
    setDetailOpen(false);
  };

  const openDetail = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDetailOpen(true);
  };

  const saveEvent = async () => {
    if (!form.summary.trim()) return setError("Informe o título do evento");
    if (!form.start || !form.end) return setError("Informe início e fim do evento");

    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        action: formMode === "create" ? "create" : "update",
        summary: form.summary.trim(),
        description: form.description,
        location: form.location,
        start: fromLocalInputToIso(form.start),
        end: fromLocalInputToIso(form.end),
      };

      if (formMode === "edit") payload.eventId = form.eventId;
      if (linkedLeadId) payload.leadId = linkedLeadId;

      const res = await fetch("/api/n8n/calendar", {
        method: "POST",
        headers: await getWriteHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `Falha ao salvar evento (${res.status})`);
      }

      setFormOpen(false);
      await fetchEvents(currentDate);
    } catch (err: any) {
      setError(err?.message || "Erro ao salvar evento");
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async () => {
    if (!selectedEvent?.id) return;
    const ok = window.confirm(`Excluir o evento "${selectedEvent.summary || "Sem título"}"?`);
    if (!ok) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/n8n/calendar", {
        method: "POST",
        headers: await getWriteHeaders(),
        body: JSON.stringify({ action: "delete", eventId: selectedEvent.id, leadId: linkedLeadId || undefined }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `Falha ao excluir evento (${res.status})`);
      }

      setDetailOpen(false);
      setSelectedEvent(null);
      await fetchEvents(currentDate);
    } catch (err: any) {
      setError(err?.message || "Erro ao excluir evento");
    } finally {
      setSaving(false);
    }
  };

  // Monthly grid days generator
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // Index of first day of the month
    const totalDays = new Date(year, month + 1, 0).getDate(); // Total days in this month

    const days = [];
    // Empty boxes for preceding month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Days of the month
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  }, [currentDate]);

  // Navigate months
  const changeMonth = (val: number) => {
    const next = new Date(currentDate);
    next.setMonth(currentDate.getMonth() + val);
    setCurrentDate(next);
  };

  // Filter events for the selected date
  const selectedDayEvents = useMemo(() => {
    return events.filter(e => {
      const start = e.start?.dateTime || e.start?.date;
      if (!start) return false;
      const eventDate = new Date(start);
      return eventDate.toDateString() === selectedDate.toDateString();
    });
  }, [events, selectedDate]);

  // Check if a day has events to show helper dots
  const dayHasEvents = (date: Date) => {
    return events.some(e => {
      const start = e.start?.dateTime || e.start?.date;
      if (!start) return false;
      return new Date(start).toDateString() === date.toDateString();
    });
  };

  const formatEventTime = (event: CalendarEvent) => {
    if (event.start?.date) return "O dia todo";
    if (!event.start?.dateTime || !event.end?.dateTime) return "Sem horário";

    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    return `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 h-full w-full space-y-8 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 pb-6 border-b border-white/5 shrink-0">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-[10px] uppercase tracking-[0.2em] font-bold text-gold mb-2">
            <Sparkles className="h-3 w-3" />
            <span>Google Calendar</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white font-display">Agenda Integrada</h1>
          <p className="text-sm text-white/40 font-light">Navegação em grade de calendário mensal e controle de horários.</p>
        </div>
        <PremiumButton onClick={openCreate} className="h-12 px-8">
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </PremiumButton>
      </div>

      {/* Linked Lead Info */}
      {linkedLead && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-8 shadow-premium flex items-center justify-between gap-6 backdrop-blur-xl"
        >
          <div className="flex items-center gap-5">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">Agendamento vinculado</p>
              <h2 className="mt-1 text-xl font-bold text-white font-display">{linkedLead.full_name || linkedLead.phone}</h2>
              <p className="mt-1 text-xs text-white/50 font-light">
                {linkedLead.phone || "Sem telefone"}
                {linkedLead.owner_name ? ` • Responsável: ${linkedLead.owner_name}` : ""}
              </p>
            </div>
          </div>
          <PremiumButton
            variant="outline"
            onClick={() => {
              const nextParams = new URLSearchParams(searchParams);
              nextParams.delete("leadId");
              setSearchParams(nextParams);
            }}
            className="h-10 px-6 text-[9px]"
          >
            Limpar Vínculo
          </PremiumButton>
        </motion.div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-xs text-red-400 animate-pulse">{error}</div>
      )}

      {/* Main Grid: Left Calendar / Right Daily Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
        
        {/* MONTHLY CALENDAR GRID (Left 2/3) */}
        <div className="lg:col-span-2 bg-black-matte/40 border border-white/5 rounded-[2rem] p-8 shadow-premium flex flex-col backdrop-blur-xl">
          <div className="flex-1">
            {/* Calendar Controls */}
            <div className="flex items-center justify-between pb-6 border-b border-white/5 mb-8">
              <h3 className="text-2xl font-display font-bold text-white capitalize tracking-wide">
                {currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </h3>
              <div className="flex gap-3">
                <button onClick={() => changeMonth(-1)} className="p-3 rounded-2xl border border-white/10 hover:bg-white/5 text-white/60 hover:text-white transition-all duration-300">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <PremiumButton 
                  variant="outline" 
                  onClick={() => { const today = new Date(); setSelectedDate(today); setCurrentDate(today); }}
                  className="h-11 px-6 text-[9px]"
                >
                  Hoje
                </PremiumButton>
                <button onClick={() => changeMonth(1)} className="p-3 rounded-2xl border border-white/10 hover:bg-white/5 text-white/60 hover:text-white transition-all duration-300">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Calendar Grid Headers */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 mb-6">
              <span>Dom</span>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-3">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="aspect-square" />;
                const isSelected = day.toDateString() === selectedDate.toDateString();
                const isToday = day.toDateString() === new Date().toDateString();
                const hasEvents = dayHasEvents(day);

                return (
                  <motion.button
                    key={`day-${day.getDate()}`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDate(day)}
                    className={`aspect-square rounded-[1.25rem] flex flex-col items-center justify-center relative transition-all duration-300 border ${
                      isSelected 
                        ? "gold-gradient text-black border-transparent font-bold shadow-gold"
                        : isToday
                          ? "border-gold/50 bg-gold/10 text-gold hover:bg-gold/20"
                          : "border-white/5 bg-white/[0.01] hover:bg-white/5 text-white/80"
                    }`}
                  >
                    <span className="text-sm font-body font-medium">{day.getDate()}</span>
                    {hasEvents && (
                      <span className={`absolute bottom-3 h-1.5 w-1.5 rounded-full ${
                        isSelected ? "bg-black" : "bg-gold"
                      }`} />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
          <div className="text-[10px] text-white/20 pt-8 border-t border-white/5 mt-8 font-light tracking-widest uppercase text-center">
            * Selecione um dia para gerenciar agendamentos
          </div>
        </div>

        {/* DAILY AGENDA panel (Right 1/3) */}
        <div className="flex flex-col gap-8">
          {/* Daily events list */}
          <div className="bg-black-matte/40 border border-white/5 rounded-[2rem] p-8 flex flex-col flex-1 shadow-premium backdrop-blur-xl overflow-hidden">
            <div className="pb-6 border-b border-white/5 mb-6 flex justify-between items-center shrink-0">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Agenda do Dia</h4>
                <p className="text-[10px] text-gold font-bold uppercase tracking-widest mt-1.5">
                  {selectedDate.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                </p>
              </div>
              <button 
                onClick={openCreate}
                className="p-2.5 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all duration-300"
                title="Novo Agendamento"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
              {loading ? (
                <div className="h-full flex items-center justify-center text-[10px] text-white/20 uppercase font-bold tracking-widest animate-pulse">Sincronizando...</div>
              ) : selectedDayEvents.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-12 text-white/10 text-center opacity-40">
                  <CalendarIcon className="h-10 w-10 mb-4" />
                  <p className="text-[10px] uppercase font-bold tracking-[0.3em]">Nenhum compromisso</p>
                </div>
              ) : (
                selectedDayEvents.map((evt) => (
                  <motion.button
                    key={evt.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => openDetail(evt)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all duration-300 flex flex-col gap-2 group ${
                      selectedEvent?.id === evt.id
                        ? "bg-gold/10 border-gold/30"
                        : "bg-white/[0.02] border-white/5 hover:border-gold/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    <h5 className={`font-bold text-sm leading-tight transition-colors ${selectedEvent?.id === evt.id ? 'text-gold' : 'text-white/90 group-hover:text-gold'}`}>
                      {evt.summary || "Sem título"}
                    </h5>
                    <div className="flex items-center gap-3 text-[10px] text-white/40 font-medium uppercase tracking-widest">
                      <Clock className="h-3 w-3 text-gold/50" />
                      {formatEventTime(evt)}
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {detailOpen && selectedEvent && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDetailOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg rounded-[2.5rem] bg-black-matte border border-white/10 shadow-premium p-10 space-y-8 text-white overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 gold-gradient opacity-50" />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 border border-gold/20 text-[9px] uppercase tracking-[0.2em] font-bold text-gold">
                  Detalhes do Compromisso
                </div>
                <button onClick={() => setDetailOpen(false)} className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-3xl font-display font-bold text-white leading-tight">{selectedEvent.summary || "Sem título"}</h3>
                  <div className="flex items-center gap-3 text-gold/70 text-xs font-bold uppercase tracking-widest">
                    <Clock className="h-4 w-4" />
                    {formatEventTime(selectedEvent)}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 pt-4 border-t border-white/5">
                  {selectedEvent.location && (
                    <div className="flex gap-4">
                      <div className="mt-1 h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center text-gold/50">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/30">Localização</p>
                        <p className="text-sm text-white/80 mt-1">{selectedEvent.location}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedEvent.description && (
                    <div className="flex gap-4">
                      <div className="mt-1 h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center text-gold/50">
                        <AlignLeft className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/30">Observações Clínicas</p>
                        <div className="mt-2 text-sm text-white/70 leading-relaxed font-light bg-white/[0.02] p-4 rounded-2xl border border-white/5 whitespace-pre-wrap max-h-40 overflow-y-auto" dangerouslySetInnerHTML={{ __html: selectedEvent.description || "" }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <PremiumButton onClick={() => openEdit(selectedEvent)} variant="outline" className="flex-1 h-12">
                  <Pencil className="w-4 h-4" /> Editar
                </PremiumButton>
                <PremiumButton onClick={deleteEvent} className="flex-1 h-12 bg-red-500/10 border-red-500/20 text-red-400 gold-gradient-none shadow-none hover:bg-red-500/20">
                  <Trash2 className="w-4 h-4" /> Excluir
                </PremiumButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE/EDIT MODAL FORM */}
      <AnimatePresence>
        {formOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFormOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl rounded-[2.5rem] bg-black-matte border border-white/10 shadow-premium p-10 space-y-8 text-white"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-display font-bold tracking-wide">{formMode === "create" ? "Novo Agendamento" : "Editar Detalhes"}</h3>
                <button onClick={() => setFormOpen(false)} className="text-white/40 hover:text-white transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </div>

              {linkedLead && formMode === "create" && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <p className="text-xs text-emerald-300 font-medium">
                    Vinculando consulta ao paciente: <span className="text-white">{linkedLead.full_name}</span>
                  </p>
                </div>
              )}

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/30 ml-4">Título do Procedimento</label>
                  <input 
                    value={form.summary} 
                    onChange={(e) => setForm((s) => ({ ...s, summary: e.target.value }))} 
                    placeholder="Ex: Aplicação de Toxina Botulínica" 
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 text-sm text-white placeholder-white/20 focus:border-gold outline-none transition-all" 
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/30 ml-4">Início</label>
                    <input 
                      type="datetime-local" 
                      value={form.start} 
                      onChange={(e) => setForm((s) => ({ ...s, start: e.target.value }))} 
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 text-sm text-white focus:border-gold outline-none filter invert contrast-125" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/30 ml-4">Término</label>
                    <input 
                      type="datetime-local" 
                      value={form.end} 
                      onChange={(e) => setForm((s) => ({ ...s, end: e.target.value }))} 
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 text-sm text-white focus:border-gold outline-none filter invert contrast-125" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/30 ml-4">Localização</label>
                  <input 
                    value={form.location} 
                    onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))} 
                    placeholder="Ex: Clínica Sede / Online" 
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 text-sm text-white placeholder-white/20 focus:border-gold outline-none transition-all" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/30 ml-4">Observações Internas</label>
                  <textarea 
                    value={form.description} 
                    onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} 
                    placeholder="Histórico clínico, alergias ou notas do procedimento..." 
                    rows={4} 
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 text-sm text-white placeholder-white/20 focus:border-gold outline-none resize-none transition-all" 
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                <PremiumButton variant="ghost" onClick={() => setFormOpen(false)} className="h-12 px-8">
                  Cancelar
                </PremiumButton>
                <PremiumButton onClick={saveEvent} disabled={saving} className="h-12 px-10">
                  <Save className="w-4 h-4" /> {saving ? "Processando..." : "Confirmar Agendamento"}
                </PremiumButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
