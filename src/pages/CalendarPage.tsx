import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, MapPin, AlignLeft, Users } from "lucide-react";

type CalendarEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  attendees?: Array<{ email?: string }>;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchEvents(currentDate);
  }, []);

  const fetchEvents = async (date: Date) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/n8n/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'list',
          timeMin: date.toISOString(),
          days: 7,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `Erro ao carregar agenda (${res.status})`);
      }

      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar agenda');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const addDays = (num: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + num);
    setCurrentDate(newDate);
    fetchEvents(newDate);
  };

  const formatEventTime = (event: CalendarEvent) => {
    if (event.start?.date) return 'O dia todo';
    if (!event.start?.dateTime || !event.end?.dateTime) return 'Sem horário';

    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const formatEventDate = (event: CalendarEvent) => {
    const date = new Date(event.start?.dateTime || event.start?.date || '');
    if (Number.isNaN(date.getTime())) return 'Data inválida';
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827]">Agenda Integrada</h1>
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mt-1">Sincronizado com Google Calendar</p>
        </div>
        <div className="flex gap-3 items-center">
          <button className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-sm font-bold rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            Agendar Reunião
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => addDays(-7)} className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="text-sm font-bold text-gray-900">Próximos 7 Dias (A partir de {currentDate.toLocaleDateString()})</div>
          <button onClick={() => addDays(7)} className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <button onClick={() => { const now = new Date(); setCurrentDate(now); fetchEvents(now); }} className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200">
          Hoje
        </button>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Sincronizando agenda...</div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-red-500 px-4 text-center">
            <p className="font-semibold">Falha na integração da agenda</p>
            <p className="text-sm mt-1 text-gray-500">{error}</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <CalendarIcon className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-sm font-medium">Nenhum evento encontrado no período.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 overflow-y-auto w-full">
            {events.map((event) => (
              <div key={event.id} className="p-4 flex gap-6 hover:bg-gray-50 transition-colors">
                <div className="w-32 shrink-0 flex flex-col items-end text-sm">
                  <span className="font-bold text-gray-900">{formatEventDate(event)}</span>
                  <span className="font-medium text-gray-500">{formatEventTime(event)}</span>
                </div>
                <div className="flex-1 flex flex-col border-l-4 border-blue-500 pl-4 py-1">
                  <h3 className="font-bold text-gray-900 text-base mb-1">{event.summary || 'Sem título'}</h3>

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
                        <span className="line-clamp-2" dangerouslySetInnerHTML={{ __html: event.description || '' }}></span>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
