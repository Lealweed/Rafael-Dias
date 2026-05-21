import { useState, useEffect } from "react";
import { initAuth, googleSignIn, getAccessToken, logout } from "../lib/firebase";
import { User } from "firebase/auth";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, MapPin, AlignLeft, Users, Clock } from "lucide-react";

export default function CalendarPage() {
  const [needsAuth, setNeedsAuth] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Date tracking for simple week/agenda view
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setNeedsAuth(false);
        setUser(user);
        setToken(token);
        fetchEvents(token, currentDate);
      },
      () => {
        setNeedsAuth(true);
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const fetchEvents = async (accessToken: string, date: Date) => {
    setLoading(true);
    try {
      // Get start and end of the week (Sun-Sat) or just today + 7 days
      const timeMin = new Date(date);
      timeMin.setHours(0, 0, 0, 0);
      
      const timeMax = new Date(date);
      timeMax.setDate(timeMax.getDate() + 7);
      timeMax.setHours(23, 59, 59, 999);

      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&orderBy=startTime&singleEvents=true`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.items) {
        setEvents(data.items);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        fetchEvents(result.accessToken, currentDate);
      }
    } catch (err) {
      console.error("Login failed:", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const addDays = (num: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + num);
    setCurrentDate(newDate);
    if (token) {
      fetchEvents(token, newDate);
    }
  };

  if (needsAuth) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center p-6 text-center">
        <CalendarIcon className="w-16 h-16 text-blue-500 mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Conecte sua Agenda</h2>
        <p className="text-gray-500 mb-8 max-w-md">
          Para visualizar e gerenciar seus compromissos (avaliações, procedimentos, retornos) diretamente no CRM, sincronize com o seu Google Calendar.
        </p>
        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="group relative flex items-center justify-center gap-3 rounded-full border border-gray-300 bg-white px-8 py-3 font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
        >
          {/* Official Google Icon SVG */}
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {isLoggingIn ? "Conectando..." : "Sign in with Google"}
        </button>
      </div>
    );
  }

  const formatEventTime = (event: any) => {
    if (event.start?.date) {
      return "O dia todo";
    }
    const start = new Date(event.start?.dateTime);
    const end = new Date(event.end?.dateTime);
    
    return `${start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };

  const formatEventDate = (event: any) => {
    const date = new Date(event.start?.dateTime || event.start?.date);
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
            <span className="text-xs text-gray-500 font-medium">Logado como: {user?.email}</span>
            <button 
                onClick={handleLogout}
                className="text-xs font-medium text-red-500 hover:text-red-700"
            >
                Desconectar
            </button>
            <div className="w-px h-6 bg-gray-200 mx-2"></div>
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
              <div className="text-sm font-bold text-gray-900">
                  Próximos 7 Dias (A partir de {currentDate.toLocaleDateString()})
              </div>
              <button onClick={() => addDays(7)} className="w-8 h-8 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-50">
                  <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
          </div>
          <button onClick={() => { setCurrentDate(new Date()); if(token) fetchEvents(token, new Date()); }} className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200">
              Hoje
          </button>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {loading ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                  Sincronizando agenda...
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
