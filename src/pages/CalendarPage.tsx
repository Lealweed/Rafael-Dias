import { useEffect, useMemo, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, MapPin, AlignLeft, Users, Pencil, Save, X, Trash2 } from "lucide-react";
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
    <div className="flex flex-col h-full w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Agenda Integrada</h1>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mt-1">Sincronizado com Google Calendar</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-sm font-bold rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          Novo Evento
        </button>
      </div>

      {linkedLead && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Agendamento vinculado</p>
              <h2 className="mt-1 text-sm font-bold text-emerald-950">{linkedLead.full_name || linkedLead.phone}</h2>
              <p className="mt-1 text-xs text-emerald-800">
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
              className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
            >
              Limpar vínculo
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => addDays(-7)} className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="text-sm font-bold text-gray-900">Próximos 7 dias (a partir de {currentDate.toLocaleDateString()})</div>
          <button onClick={() => addDays(7)} className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <button onClick={() => { const now = new Date(); setCurrentDate(now); fetchEvents(now); }} className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200">
          Hoje
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[380px]">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Sincronizando agenda...</div>
          ) : events.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
              <CalendarIcon className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-sm font-medium">Nenhum evento encontrado no período.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 overflow-y-auto w-full">
              {events.map((event) => (
                <button key={event.id} onClick={() => setSelectedEvent(event)} className={`w-full text-left p-4 flex gap-6 hover:bg-gray-50 transition-colors ${selectedEvent?.id === event.id ? "bg-blue-50" : ""}`}>
                  <div className="w-32 shrink-0 flex flex-col items-end text-sm">
                    <span className="font-bold text-gray-900">{formatEventDate(event)}</span>
                    <span className="font-medium text-gray-500">{formatEventTime(event)}</span>
                  </div>
                  <div className="flex-1 flex flex-col border-l-4 border-blue-500 pl-4 py-1">
                    <h3 className="font-bold text-gray-900 text-base mb-1">{event.summary || "Sem título"}</h3>
                    <div className="flex flex-col gap-1.5 mt-2">
                      {event.location && (
                        <div className="flex items-start gap-2 text-xs text-gray-600">
                          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      {event.description && (
                        <div className="flex items-start gap-2 text-xs text-gray-600">
                          <AlignLeft className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
                          <span className="line-clamp-2" dangerouslySetInnerHTML={{ __html: event.description || "" }}></span>
                        </div>
                      )}
                      {event.attendees && event.attendees.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                          <Users className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                          <span>{event.attendees.length} convidados</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 min-h-[380px]">
          {!selectedEvent ? (
            <div className="h-full flex items-center justify-center text-sm text-gray-500">Selecione um evento para ver detalhes</div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-base font-bold text-gray-900">{selectedEvent.summary || "Sem título"}</h3>
              <p className="text-sm text-gray-600">{formatEventDate(selectedEvent)} • {formatEventTime(selectedEvent)}</p>
              {linkedLead?.calendar_event_id === selectedEvent.id && (
                <div className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  Evento vinculado ao lead
                </div>
              )}
              {selectedEvent.location && <p className="text-sm text-gray-700"><strong>Local:</strong> {selectedEvent.location}</p>}
              {selectedEvent.description && <p className="text-sm text-gray-700"><strong>Descrição:</strong> {selectedEvent.description}</p>}

              <div className="flex flex-wrap gap-2 pt-2">
                <button onClick={() => openEdit(selectedEvent)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  <Pencil className="w-4 h-4" /> Editar
                </button>
                <button onClick={deleteEvent} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
                {selectedEvent.htmlLink && (
                  <a href={selectedEvent.htmlLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50">
                    Abrir no Google Agenda
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-gray-200 shadow-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{formMode === "create" ? "Novo evento" : "Editar evento"}</h3>
              <button onClick={() => setFormOpen(false)} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>

            {linkedLead && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                Este agendamento será salvo no Google Agenda e vinculado ao lead <strong>{linkedLead.full_name || linkedLead.phone}</strong>.
              </div>
            )}

            <input value={form.summary} onChange={(e) => setForm((s) => ({ ...s, summary: e.target.value }))} placeholder="Título" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="datetime-local" value={form.start} onChange={(e) => setForm((s) => ({ ...s, start: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <input type="datetime-local" value={form.end} onChange={(e) => setForm((s) => ({ ...s, end: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <input value={form.location} onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))} placeholder="Local" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <textarea value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} placeholder="Descrição" rows={4} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={() => setFormOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={saveEvent} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
