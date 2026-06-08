import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, MapPin, AlignLeft, Users, Pencil, Save, X, Trash2, Sparkles } from "lucide-react";
import { createClient } from "../lib/supabase/client";
import { useSearchParams } from "react-router-dom";

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<EventFormState>({
    summary: "",
    description: "",
    location: "",
    start: "",
    end: "",
  });

  useEffect(() => {
    fetchEvents(currentDate);
  }, []);

  const linkedLeadId = String(searchParams.get("leadId") || "").trim();

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
          setCurrentDate(appointmentDate);
          fetchEvents(appointmentDate);
        }
      }
    }

    fetchLinkedLead();
  }, [linkedLeadId, supabase]);

  const fetchEvents = async (date: Date) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/n8n/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "list",
          timeMin: date.toISOString(),
          days: 7,
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
    const start = new Date(currentDate);
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

      setSelectedEvent(null);
      await fetchEvents(currentDate);
    } catch (err: any) {
      setError(err?.message || "Erro ao excluir evento");
    } finally {
      setSaving(false);
    }
  };

  const addDays = (num: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + num);
    setCurrentDate(newDate);
    fetchEvents(newDate);
  };

  const formatEventTime = (event: CalendarEvent) => {
    if (event.start?.date) return "O dia todo";
    if (!event.start?.dateTime || !event.end?.dateTime) return "Sem horário";

    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    return `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const formatEventDate = (event: CalendarEvent) => {
    const date = new Date(event.start?.dateTime || event.start?.date || "");
    if (Number.isNaN(date.getTime())) return "Data inválida";
    return date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
  };

  return (
    <div className="flex flex-col h-full w-full space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-white/5 shrink-0">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] uppercase tracking-widest font-semibold text-[#E5C38C] mb-2">
            <Sparkles className="h-3 w-3" />
            <span>Google Calendar</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-serif">Agenda Integrada</h1>
          <p className="text-xs text-white/40 font-light mt-1">Sincronizado com os horários de consulta da clínica.</p>
        </div>
        <button onClick={openCreate} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#E5C38C] text-xs font-semibold uppercase tracking-wider text-[#0B0D12] rounded-2xl hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          Novo Evento
        </button>
      </div>

      {/* Linked Lead Info */}
      {linkedLead && (
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-4 shadow-md flex items-center justify-between gap-4 backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Agendamento vinculado</p>
            <h2 className="mt-1 text-sm font-bold text-white">{linkedLead.full_name || linkedLead.phone}</h2>
            <p className="mt-1 text-xs text-white/50">
              {linkedLead.phone || "Sem telefone"}
              {linkedLead.owner_name ? ` • Responsável: ${linkedLead.owner_name}` : ""}
            </p>
          </div>
          <button
            onClick={() => {
              const nextParams = new URLSearchParams(searchParams);
              nextParams.delete("leadId");
              setSearchParams(nextParams);
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 transition-colors"
          >
            Limpar Vínculo
          </button>
        </div>
      )}

      {/* Date Switcher */}
      <div className="flex items-center justify-between bg-[#0B0D12]/60 border border-white/5 rounded-3xl p-4 shadow-lg backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => addDays(-7)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <div className="text-xs font-bold text-white uppercase tracking-widest font-mono">
            {currentDate.toLocaleDateString("pt-BR", { day: 'numeric', month: 'short' })} a {new Date(new Date(currentDate).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR", { day: 'numeric', month: 'short' })}
          </div>
          <button onClick={() => addDays(7)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 hover:bg-white/5 transition-colors">
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
        <button onClick={() => { const now = new Date(); setCurrentDate(now); fetchEvents(now); }} className="text-[10px] font-bold uppercase tracking-wider text-[#E5C38C] bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-4 py-2 rounded-xl hover:bg-[#D4AF37]/20 transition-colors">
          Hoje
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400">{error}</div>
      )}

      {/* Calendar Grid & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Events List */}
        <div className="lg:col-span-2 bg-[#0B0D12]/60 border border-white/5 rounded-3xl shadow-xl overflow-hidden flex flex-col min-h-[380px] backdrop-blur-xl">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-white/30 text-xs">Sincronizando agenda do Google...</div>
          ) : events.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-white/30 p-8">
              <CalendarIcon className="w-12 h-12 text-white/10 mb-4" />
              <p className="text-xs font-semibold uppercase tracking-widest">Nenhum evento no período</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5 overflow-y-auto w-full">
              {events.map((event) => (
                <button 
                  key={event.id} 
                  onClick={() => setSelectedEvent(event)} 
                  className={`w-full text-left p-5 flex gap-6 hover:bg-white/[0.01] transition-colors relative ${selectedEvent?.id === event.id ? "bg-gradient-to-r from-[#D4AF37]/10 to-transparent" : ""}`}
                >
                  {selectedEvent?.id === event.id && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#D4AF37]" />}
                  <div className="w-32 shrink-0 flex flex-col items-end text-right">
                    <span className="font-bold text-white text-xs uppercase font-mono">{formatEventDate(event)}</span>
                    <span className="text-[10px] text-white/40 font-medium font-mono mt-0.5">{formatEventTime(event)}</span>
                  </div>
                  <div className="flex-1 flex flex-col border-l-2 border-[#D4AF37]/40 pl-4 py-0.5">
                    <h3 className="font-bold text-white text-sm tracking-wide">{event.summary || "Sem título"}</h3>
                    <div className="flex flex-col gap-1.5 mt-2">
                      {event.location && (
                        <div className="flex items-start gap-1.5 text-[10px] text-white/50 leading-relaxed font-light">
                          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-white/30" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      {event.description && (
                        <div className="flex items-start gap-1.5 text-[10px] text-white/50 leading-relaxed font-light">
                          <AlignLeft className="w-3.5 h-3.5 shrink-0 mt-0.5 text-white/30" />
                          <span className="line-clamp-2" dangerouslySetInnerHTML={{ __html: event.description || "" }}></span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Event Details Panel */}
        <div className="bg-[#0B0D12]/60 border border-white/5 rounded-3xl shadow-xl p-6 min-h-[380px] backdrop-blur-xl">
          {!selectedEvent ? (
            <div className="h-full flex items-center justify-center text-xs text-white/30 font-semibold uppercase tracking-widest">Selecione um evento</div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white tracking-wide font-serif">{selectedEvent.summary || "Sem título"}</h3>
              <p className="text-xs font-mono text-[#E5C38C] font-semibold">{formatEventDate(selectedEvent)} • {formatEventTime(selectedEvent)}</p>
              
              {linkedLead?.calendar_event_id === selectedEvent.id && (
                <span className="inline-flex rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-400">
                  Evento vinculado ao lead
                </span>
              )}
              
              {selectedEvent.location && (
                <div className="text-xs text-white/60 leading-relaxed font-light">
                  <strong>Local:</strong> {selectedEvent.location}
                </div>
              )}
              {selectedEvent.description && (
                <div className="text-xs text-white/60 leading-relaxed font-light border-t border-white/5 pt-3">
                  <strong>Descrição:</strong>
                  <div className="mt-1 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: selectedEvent.description || "" }}></div>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5">
                <button onClick={() => openEdit(selectedEvent)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
                <button onClick={deleteEvent} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-60">
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
                {selectedEvent.htmlLink && (
                  <a href={selectedEvent.htmlLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-2 text-xs font-semibold text-[#E5C38C] hover:bg-[#D4AF37]/20 transition-colors">
                    Ver no Calendar
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Dialog Form */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-[#0E1118] border border-white/5 shadow-2xl p-6 space-y-4 text-white">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-serif tracking-wide">{formMode === "create" ? "Novo Agendamento" : "Editar Agendamento"}</h3>
              <button onClick={() => setFormOpen(false)} className="text-white/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {linkedLead && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-300">
                Este agendamento será salvo no Google Calendar e vinculado ao lead <strong>{linkedLead.full_name || linkedLead.phone}</strong>.
              </div>
            )}

            <div className="space-y-3">
              <input 
                value={form.summary} 
                onChange={(e) => setForm((s) => ({ ...s, summary: e.target.value }))} 
                placeholder="Título da Consulta" 
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#D4AF37] outline-none" 
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input 
                  type="datetime-local" 
                  value={form.start} 
                  onChange={(e) => setForm((s) => ({ ...s, start: e.target.value }))} 
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white focus:border-[#D4AF37] outline-none filter invert" 
                />
                <input 
                  type="datetime-local" 
                  value={form.end} 
                  onChange={(e) => setForm((s) => ({ ...s, end: e.target.value }))} 
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white focus:border-[#D4AF37] outline-none filter invert" 
                />
              </div>
              <input 
                value={form.location} 
                onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))} 
                placeholder="Local (ex: Clínica Parauapebas-PA)" 
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#D4AF37] outline-none" 
              />
              <textarea 
                value={form.description} 
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} 
                placeholder="Descrição ou observações de saúde..." 
                rows={4} 
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-white/20 focus:border-[#D4AF37] outline-none resize-none" 
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
              <button onClick={() => setFormOpen(false)} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/60 hover:bg-white/10 transition-colors">Cancelar</button>
              <button onClick={saveEvent} disabled={saving} className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-gradient-to-r from-[#D4AF37] to-[#E5C38C] text-xs font-semibold uppercase tracking-wider text-[#0B0D12] rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60">
                <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
