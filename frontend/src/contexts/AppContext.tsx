import React, {
  createContext, useContext, useState, useEffect,
  useCallback, useMemo, useRef,
} from 'react';
import { API_URL } from '../lib/constants';
import type {
  User, Institution, StudySpace, Subject, Topic, Card,
  CalendarEvent, Metrics, PlanStatus, Insight, EventDraft,
} from '../types';
import { blankDraft } from '../lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Toast { id: number; kind: 'success' | 'error'; message: string }

interface AppContextValue {
  // Auth
  token: string | null;
  currentUser: User | null;
  emailPending: string | null;
  setEmailPending: (v: string | null) => void;
  handleLogout: () => void;
  storeAuth: (at: string, user: User) => void;
  apiCall: (endpoint: string, options?: RequestInit) => Promise<unknown>;

  // Theme
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Toasts
  toasts: Toast[];
  showSuccess: (m: string) => void;
  showError: (m: string) => void;
  dismissToast: (id: number) => void;

  // Data
  spaces: StudySpace[];
  subjects: Subject[];
  topics: Topic[];
  cards: Card[];
  metrics: Metrics | null;
  calendarEvents: CalendarEvent[];
  institutions: Institution[];
  planStatus: PlanStatus | null;
  insights: Insight[];
  insightsLoading: boolean;
  insightsLastUpdated: Date | null;

  // Selection
  activeSpaceId: string | null;
  setActiveSpaceId: (id: string | null) => void;
  selectedSubject: Subject | null;
  setSelectedSubject: (s: Subject | null) => void;
  selectedTopic: Topic | null;
  setSelectedTopic: (t: Topic | null) => void;

  // Computed
  visibleSubjects: Subject[];
  visibleTopics: Topic[];

  // Study session
  activeSessionId: string | null;
  sessionCards: Card[];
  currentSessionCardIndex: number;
  isCardFlipped: boolean;
  setIsCardFlipped: (v: boolean) => void;
  sessionDone: boolean;
  sessionStats: { ratings: number[]; startTime: number } | null;
  requeuedCardIds: Set<string>;
  startStudySession: (topicId?: string, ignoreContext?: boolean) => Promise<void>;
  handleReviewCard: (rating: number) => Promise<void>;
  closeSession: () => void;

  // Calendar modal
  calendarMonth: Date;
  setCalendarMonth: (d: Date) => void;
  eventModalOpen: boolean;
  eventDraft: EventDraft;
  setEventDraft: React.Dispatch<React.SetStateAction<EventDraft>>;
  draftSaving: boolean;
  openCreateEvent: (date?: Date) => void;
  openCreateEventWithData: (draft: Partial<EventDraft>) => void;
  openEditEvent: (event: CalendarEvent) => void;
  handleSaveEvent: () => Promise<void>;
  handleDeleteEvent: (id: string) => Promise<void>;
  closeEventModal: () => void;
  quickCreateEvent: (title: string, type: string, startAt: string, allDay: boolean) => Promise<void>;

  // Upgrade modal
  upgradeModalOpen: boolean;
  setUpgradeModalOpen: (v: boolean) => void;
  checkoutLoading: boolean;
  handleCheckout: () => Promise<void>;

  // Fetchers
  fetchCalendarEvents: (year: number, month: number) => Promise<void>;
  fetchInsights: () => Promise<void>;
  handleRefreshInsights: () => Promise<void>;
  fetchInstitutions: (search?: string) => Promise<void>;
  fetchCardsForTopic: (topicId: string) => Promise<void>;
  fetchTopicsForSubject: (subjectId: string) => Promise<void>;
  fetchMetrics: () => Promise<void>;

  // CRUD
  handleCreateSpace: (name: string, color: string, icon: string) => Promise<void>;
  handleDeleteSpace: (id: string) => Promise<void>;
  handleCreateSubject: (name: string, color: string) => Promise<void>;
  handleDeleteSubject: (id: string) => Promise<void>;
  handleCreateTopic: (name: string) => Promise<void>;
  handleDeleteTopic: (id: string) => Promise<void>;
  handleCreateCard: (front: string, back: string, topicId?: string) => Promise<void>;
  handleDeleteCard: (id: string) => Promise<void>;
  handleUpdateCard: (id: string, front: string, back: string) => Promise<void>;
  fetchAllCards: () => Promise<void>;
  handleUpdateProfile: (data: Record<string, unknown>) => Promise<User>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const toastIdRef = useRef(0);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [token,       setToken]       = useState<string | null>(() => localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [emailPending,setEmailPending]= useState<string | null>(null);

  // ── Theme ─────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const s = localStorage.getItem('theme');
    if (s === 'light' || s === 'dark') return s;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);

  // ── Toasts ────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts(ts => ts.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((kind: Toast['kind'], message: string) => {
    const id = ++toastIdRef.current;
    setToasts(ts => [...ts, { id, kind, message }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4500);
  }, []);

  const showSuccess = useCallback((m: string) => addToast('success', m), [addToast]);
  const showError   = useCallback((m: string) => addToast('error',   m), [addToast]);

  // ── Data state ────────────────────────────────────────────────────────────
  const [spaces,        setSpaces]       = useState<StudySpace[]>([]);
  const [subjects,      setSubjects]     = useState<Subject[]>([]);
  const [topics,        setTopics]       = useState<Topic[]>([]);
  const [cards,         setCards]        = useState<Card[]>([]);
  const [metrics,       setMetrics]      = useState<Metrics | null>(null);
  const [calendarEvents,setCalendarEvents]= useState<CalendarEvent[]>([]);
  const [institutions,  setInstitutions] = useState<Institution[]>([]);
  const [planStatus,    setPlanStatus]   = useState<PlanStatus | null>(null);
  const [insights,            setInsights]            = useState<Insight[]>([]);
  const [insightsLoading,     setInsightsLoading]     = useState(false);
  const [insightsLastUpdated, setInsightsLastUpdated] = useState<Date | null>(null);

  // ── Selection ─────────────────────────────────────────────────────────────
  const [activeSpaceId,   setActiveSpaceId]   = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic,   setSelectedTopic]   = useState<Topic | null>(null);

  // ── Study session ─────────────────────────────────────────────────────────
  const [activeSessionId,         setActiveSessionId]         = useState<string | null>(null);
  const [sessionCards,            setSessionCards]            = useState<Card[]>([]);
  const [currentSessionCardIndex, setCurrentSessionCardIndex] = useState(0);
  const [isCardFlipped,           setIsCardFlipped]           = useState(false);
  const [sessionDone,             setSessionDone]             = useState(false);
  const [sessionStats,            setSessionStats]            = useState<{ ratings: number[]; startTime: number } | null>(null);
  const [requeuedCardIds,         setRequeuedCardIds]         = useState<Set<string>>(new Set());

  // ── Calendar modal ────────────────────────────────────────────────────────
  const [calendarMonth,  setCalendarMonth]  = useState(() => new Date());
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventDraft,     setEventDraft]     = useState<EventDraft>(blankDraft());
  const [draftSaving,    setDraftSaving]    = useState(false);

  // ── Upgrade modal ─────────────────────────────────────────────────────────
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [checkoutLoading,  setCheckoutLoading]  = useState(false);

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null); setCurrentUser(null);
    setSubjects([]); setTopics([]); setCards([]); setMetrics(null);
    setSpaces([]); setCalendarEvents([]);
    setPlanStatus(null); setInsights([]);
    setActiveSessionId(null); setSessionCards([]);
  }, []);

  // ── apiCall ───────────────────────────────────────────────────────────────
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const t = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    };
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (res.status === 401) { handleLogout(); throw new Error('Sessão expirada.'); }
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      const msg = Array.isArray(e.message) ? e.message.join(', ') : e.message || 'Erro na requisição';
      throw new Error(msg);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }, [handleLogout]);

  // ── Auth helpers ──────────────────────────────────────────────────────────
  const storeAuth = useCallback((at: string, user: User) => {
    localStorage.setItem('token', at);
    setToken(at); setCurrentUser(user);
  }, []);

  // ── Fetchers ──────────────────────────────────────────────────────────────
  const fetchUserProfile = useCallback(async () => {
    try { const u = await apiCall('/profile') as User; setCurrentUser(u); }
    catch { /* silent */ }
  }, [apiCall]);

  const fetchInstitutions = useCallback(async (search = '') => {
    try { setInstitutions(await apiCall(`/institutions?search=${encodeURIComponent(search)}`) as Institution[]); }
    catch { /* silent */ }
  }, [apiCall]);

  const fetchSpaces = useCallback(async () => {
    try { setSpaces(await apiCall('/spaces') as StudySpace[]); }
    catch { /* silent */ }
  }, [apiCall]);

  const fetchSubjects = useCallback(async () => {
    try {
      const list = await apiCall('/subjects') as Subject[];
      setSubjects(list);
      const results = await Promise.allSettled(list.map(s => apiCall(`/topics?subjectId=${s.id}`)));
      setTopics(results.flatMap(r => r.status === 'fulfilled' ? r.value as Topic[] : []));
    } catch { /* silent */ }
  }, [apiCall]);

  const fetchTopicsForSubject = useCallback(async (subjectId: string) => {
    try {
      const list = await apiCall(`/topics?subjectId=${subjectId}`) as Topic[];
      setTopics(prev => [...prev.filter(t => t.subjectId !== subjectId), ...list]);
    } catch (e) { showError((e as Error).message); }
  }, [apiCall, showError]);

  const fetchCardsForTopic = useCallback(async (topicId: string) => {
    try {
      const list = await apiCall(`/cards?topicId=${topicId}`) as Card[];
      setCards(prev => [...prev.filter(c => c.topicId !== topicId), ...list]);
    } catch (e) { showError((e as Error).message); }
  }, [apiCall, showError]);

  const fetchMetrics = useCallback(async () => {
    try { setMetrics(await apiCall('/metrics') as Metrics); }
    catch { /* silent */ }
  }, [apiCall]);

  const fetchCalendarEvents = useCallback(async (year: number, month: number) => {
    const from = new Date(year, month - 1, 1).toISOString();
    const to   = new Date(year, month + 1, 0).toISOString();
    const sp   = activeSpaceId ? `&spaceId=${activeSpaceId}` : '';
    try { setCalendarEvents(await apiCall(`/calendar/events?from=${from}&to=${to}${sp}`) as CalendarEvent[]); }
    catch { /* silent */ }
  }, [apiCall, activeSpaceId]);

  const fetchPlanStatus = useCallback(async () => {
    try { setPlanStatus(await apiCall('/billing/status') as PlanStatus); }
    catch { /* silent */ }
  }, [apiCall]);

  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const list = await apiCall('/insights') as Insight[];
      setInsights(list);
      setInsightsLastUpdated(new Date());
    }
    catch { /* silent */ }
    finally { setInsightsLoading(false); }
  }, [apiCall]);

  const handleRefreshInsights = useCallback(async () => {
    setInsightsLoading(true);
    try {
      const list = await apiCall('/insights/cache', { method: 'DELETE' }) as Insight[];
      setInsights(list);
      setInsightsLastUpdated(new Date());
    }
    catch { /* silent */ }
    finally { setInsightsLoading(false); }
  }, [apiCall]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => { if (token && !currentUser) fetchUserProfile(); }, [token, currentUser, fetchUserProfile]);
  useEffect(() => {
    if (currentUser) {
      const now = new Date();
      fetchSubjects(); fetchMetrics(); fetchInstitutions(); fetchSpaces(); fetchPlanStatus();
      fetchAllCards();
      fetchCalendarEvents(now.getFullYear(), now.getMonth() + 1);
    }
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (selectedSubject) fetchTopicsForSubject(selectedSubject.id); }, [selectedSubject, fetchTopicsForSubject]);
  useEffect(() => { if (selectedTopic)   fetchCardsForTopic(selectedTopic.id);       }, [selectedTopic,   fetchCardsForTopic]);

  // ── Computed ──────────────────────────────────────────────────────────────
  const visibleSubjects = useMemo(() =>
    activeSpaceId ? subjects.filter(s => s.spaceId === activeSpaceId) : subjects,
    [subjects, activeSpaceId]
  );

  const visibleTopics = useMemo(() =>
    activeSpaceId
      ? topics.filter(t => visibleSubjects.some(s => s.id === t.subjectId))
      : topics,
    [topics, visibleSubjects, activeSpaceId]
  );

  // ── CRUD — Spaces ─────────────────────────────────────────────────────────
  const handleCreateSpace = useCallback(async (name: string, color: string, icon: string) => {
    try {
      const created = await apiCall('/spaces', { method: 'POST', body: JSON.stringify({ name: name.trim(), color, icon }) }) as StudySpace;
      setSpaces(prev => [...prev, created]);
      showSuccess('Área criada!');
    } catch (e) { showError((e as Error).message); }
  }, [apiCall, showSuccess, showError]);

  const handleDeleteSpace = useCallback(async (id: string) => {
    if (!confirm('Excluir esta área? As matérias ficam sem área atribuída.')) return;
    try {
      await apiCall(`/spaces/${id}`, { method: 'DELETE' });
      setSpaces(prev => prev.filter(s => s.id !== id));
      if (activeSpaceId === id) setActiveSpaceId(null);
      showSuccess('Área removida.');
    } catch (e) { showError((e as Error).message); }
  }, [apiCall, activeSpaceId, showSuccess, showError]);

  // ── CRUD — Subjects ───────────────────────────────────────────────────────
  const handleCreateSubject = useCallback(async (name: string, color: string) => {
    try {
      const c = await apiCall('/subjects', { method: 'POST', body: JSON.stringify({ name, color, spaceId: activeSpaceId ?? undefined }) }) as Subject;
      setSubjects(prev => [...prev, c]);
      showSuccess('Matéria criada!');
    } catch (e) { showError((e as Error).message); }
  }, [apiCall, activeSpaceId, showSuccess, showError]);

  const handleDeleteSubject = useCallback(async (id: string) => {
    if (!confirm('Excluir matéria e todos os dados relacionados?')) return;
    try {
      await apiCall(`/subjects/${id}`, { method: 'DELETE' });
      setSubjects(prev => prev.filter(s => s.id !== id));
      setTopics(prev => prev.filter(t => t.subjectId !== id));
      if (selectedSubject?.id === id) { setSelectedSubject(null); setSelectedTopic(null); }
      showSuccess('Matéria excluída.');
    } catch (e) { showError((e as Error).message); }
  }, [apiCall, selectedSubject, showSuccess, showError]);

  // ── CRUD — Topics ─────────────────────────────────────────────────────────
  const handleCreateTopic = useCallback(async (name: string) => {
    if (!selectedSubject) return;
    try {
      const c = await apiCall('/topics', { method: 'POST', body: JSON.stringify({ name, subjectId: selectedSubject.id }) }) as Topic;
      setTopics(prev => [...prev, c]);
      showSuccess('Tópico criado!');
    } catch (e) { showError((e as Error).message); }
  }, [apiCall, selectedSubject, showSuccess, showError]);

  const handleDeleteTopic = useCallback(async (id: string) => {
    if (!confirm('Excluir tópico e todos os seus flashcards?')) return;
    try {
      await apiCall(`/topics/${id}`, { method: 'DELETE' });
      setTopics(prev => prev.filter(t => t.id !== id));
      setCards(prev => prev.filter(c => c.topicId !== id));
      if (selectedTopic?.id === id) setSelectedTopic(null);
      showSuccess('Tópico excluído.');
    } catch (e) { showError((e as Error).message); }
  }, [apiCall, selectedTopic, showSuccess, showError]);

  // ── CRUD — Cards ──────────────────────────────────────────────────────────
  const handleCreateCard = useCallback(async (front: string, back: string, topicId?: string) => {
    const tid = topicId ?? selectedTopic?.id;
    if (!tid) return;
    try {
      const c = await apiCall('/cards', { method: 'POST', body: JSON.stringify({ front, back, topicId: tid }) }) as Card;
      setCards(prev => [...prev, c]);
      showSuccess('Card criado!');
    } catch (e) { showError((e as Error).message); }
  }, [apiCall, selectedTopic, showSuccess, showError]);

  const handleDeleteCard = useCallback(async (id: string) => {
    try {
      await apiCall(`/cards/${id}`, { method: 'DELETE' });
      setCards(prev => prev.filter(c => c.id !== id));
      showSuccess('Card excluído.');
    } catch (e) { showError((e as Error).message); }
  }, [apiCall, showSuccess, showError]);

  const handleUpdateCard = useCallback(async (id: string, front: string, back: string) => {
    try {
      const updated = await apiCall(`/cards/${id}`, { method: 'PATCH', body: JSON.stringify({ front, back }) }) as Card;
      setCards(prev => prev.map(c => c.id === id ? updated : c));
      showSuccess('Card atualizado!');
    } catch (e) { showError((e as Error).message); }
  }, [apiCall, showSuccess, showError]);

  const fetchAllCards = useCallback(async () => {
    try {
      const list = await apiCall('/cards/all') as Card[];
      setCards(list);
    } catch (e) { showError((e as Error).message); }
  }, [apiCall, showError]);

  // ── Study session ─────────────────────────────────────────────────────────
  const startStudySession = useCallback(async (topicId?: string, ignoreContext = false) => {
    // Ensure cards are loaded — fetch all if state is empty
    let pool = cards;
    if (pool.length === 0) {
      try {
        const list = await apiCall('/cards/all') as Card[];
        setCards(list);
        pool = list;
      } catch { /* silent — will show "sem pendentes" below if truly empty */ }
    }

    const now = new Date();
    const due = pool.filter(c => {
      if (topicId) return c.topicId === topicId && new Date(c.nextReview) <= now;
      if (!ignoreContext && selectedTopic) return c.topicId === selectedTopic.id && new Date(c.nextReview) <= now;
      if (!ignoreContext && selectedSubject) return topics.filter(t => t.subjectId === selectedSubject.id).some(t => t.id === c.topicId) && new Date(c.nextReview) <= now;
      return new Date(c.nextReview) <= now;
    });
    if (!due.length) { showError('Não há cards pendentes!'); return; }
    try {
      const s = await apiCall('/study-sessions', { method: 'POST' }) as { id: string };
      setActiveSessionId(s.id); setSessionCards(due);
      setCurrentSessionCardIndex(0); setIsCardFlipped(false);
      setSessionDone(false); setSessionStats({ ratings: [], startTime: Date.now() });
      setRequeuedCardIds(new Set());
    } catch (e) { showError((e as Error).message); }
  }, [cards, selectedTopic, selectedSubject, topics, apiCall, showError]);

  const handleReviewCard = useCallback(async (rating: number) => {
    if (!activeSessionId || !sessionCards.length) return;
    const card = sessionCards[currentSessionCardIndex];
    try {
      await apiCall('/study-sessions/review', { method: 'POST', body: JSON.stringify({ cardId: card.id, sessionId: activeSessionId, rating }) });
      setSessionStats(prev => prev ? { ...prev, ratings: [...prev.ratings, rating] } : prev);

      // Re-fila Anki: card errado volta ao fim até ser acertado
      const willRequeue = rating === 1;
      if (willRequeue) {
        setSessionCards(prev => [...prev, card]);
        setRequeuedCardIds(prev => new Set([...prev, card.id]));
      }

      const nextIndex = currentSessionCardIndex + 1;
      const remaining = sessionCards.length - nextIndex + (willRequeue ? 1 : 0);
      if (remaining > 0) {
        setIsCardFlipped(false);
        setTimeout(() => setCurrentSessionCardIndex(nextIndex), 120);
      } else {
        setSessionDone(true);
        fetchMetrics();
      }
    } catch (e) { showError((e as Error).message); }
  }, [activeSessionId, sessionCards, currentSessionCardIndex, requeuedCardIds, apiCall, showError, fetchMetrics]);

  const closeSession = useCallback(() => {
    setActiveSessionId(null); setSessionCards([]);
    setSessionDone(false); setSessionStats(null);
    setRequeuedCardIds(new Set());
  }, []);

  // ── Calendar modal ────────────────────────────────────────────────────────
  const openCreateEvent = useCallback((date?: Date) => {
    setEventDraft(blankDraft(date)); setEventModalOpen(true);
  }, []);

  const openEditEvent = useCallback((event: CalendarEvent) => {
    const p = (n: number) => String(n).padStart(2, '0');
    const toLocal = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
    const toDate  = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; };
    setEventDraft({
      id: event.id, title: event.title, type: event.type,
      startAt: toLocal(event.startAt),
      endAt: event.endAt ? toLocal(event.endAt) : '',
      allDay: event.allDay, spaceId: event.spaceId ?? '', subjectId: event.subjectId ?? '',
      notes: event.notes ?? '', recurrenceEnabled: event.recurrenceDays.length > 0,
      recurrenceDays: event.recurrenceDays,
      recurrenceEndsAt: event.recurrenceEndsAt ? toDate(event.recurrenceEndsAt) : '',
      reminders: event.reminders.filter(r => !r.sent).map(r => ({ minutesBefore: r.minutesBefore, method: r.method })),
    });
    setEventModalOpen(true);
  }, []);

  const closeEventModal = useCallback(() => setEventModalOpen(false), []);

  const openCreateEventWithData = useCallback((draft: Partial<EventDraft>) => {
    setEventDraft({ ...blankDraft(), ...draft });
    setEventModalOpen(true);
  }, []);

  const quickCreateEvent = useCallback(async (title: string, type: string, startAt: string, allDay: boolean) => {
    if (!title.trim() || !startAt) return;
    try {
      const payload = { title: title.trim(), type, startAt: new Date(startAt).toISOString(), allDay, recurrenceDays: [], reminders: [] };
      const created = await apiCall('/calendar/events', { method: 'POST', body: JSON.stringify(payload) }) as CalendarEvent;
      setCalendarEvents(prev => [...prev, created]);
      showSuccess('Evento criado!');
    } catch (e) { showError((e as Error).message); }
  }, [apiCall, showSuccess, showError]);

  const handleSaveEvent = useCallback(async () => {
    if (!eventDraft.title.trim() || !eventDraft.startAt) return;
    setDraftSaving(true);
    try {
      const payload = {
        title: eventDraft.title.trim(), type: eventDraft.type,
        startAt: new Date(eventDraft.startAt).toISOString(),
        endAt: eventDraft.endAt ? new Date(eventDraft.endAt).toISOString() : undefined,
        allDay: eventDraft.allDay,
        spaceId: eventDraft.spaceId || undefined,
        subjectId: eventDraft.subjectId || undefined,
        notes: eventDraft.notes || undefined,
        recurrenceDays: eventDraft.recurrenceEnabled ? eventDraft.recurrenceDays : [],
        recurrenceEndsAt: (eventDraft.recurrenceEnabled && eventDraft.recurrenceEndsAt)
          ? new Date(eventDraft.recurrenceEndsAt).toISOString() : undefined,
        reminders: eventDraft.reminders,
      };
      if (eventDraft.id) {
        const updated = await apiCall(`/calendar/events/${eventDraft.id}`, { method: 'PUT', body: JSON.stringify(payload) }) as CalendarEvent;
        setCalendarEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
        showSuccess('Evento atualizado!');
      } else {
        const created = await apiCall('/calendar/events', { method: 'POST', body: JSON.stringify(payload) }) as CalendarEvent;
        setCalendarEvents(prev => [...prev, created]);
        showSuccess('Evento criado!');
      }
      setEventModalOpen(false);
    } catch (e) { showError((e as Error).message); }
    finally { setDraftSaving(false); }
  }, [eventDraft, apiCall, showSuccess, showError]);

  const handleDeleteEvent = useCallback(async (id: string) => {
    if (!confirm('Excluir este evento?')) return;
    try {
      await apiCall(`/calendar/events/${id}`, { method: 'DELETE' });
      setCalendarEvents(prev => prev.filter(e => e.id !== id));
      setEventModalOpen(false);
      showSuccess('Evento excluído.');
    } catch (e) { showError((e as Error).message); }
  }, [apiCall, showSuccess, showError]);

  // ── Billing ───────────────────────────────────────────────────────────────
  const handleCheckout = useCallback(async () => {
    setCheckoutLoading(true);
    try {
      const { invoiceUrl } = await apiCall('/billing/checkout', { method: 'POST' }) as { invoiceUrl: string };
      window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
      setUpgradeModalOpen(false);
    } catch (e) { showError((e as Error).message); }
    finally { setCheckoutLoading(false); }
  }, [apiCall, showError]);

  // ── Profile ───────────────────────────────────────────────────────────────
  const handleUpdateProfile = useCallback(async (data: Record<string, unknown>) => {
    const u = await apiCall('/profile', { method: 'PATCH', body: JSON.stringify(data) }) as User;
    setCurrentUser(u);
    return u;
  }, [apiCall]);

  // ─────────────────────────────────────────────────────────────────────────

  const value: AppContextValue = {
    token, currentUser, emailPending, setEmailPending,
    handleLogout, storeAuth, apiCall,
    theme, toggleTheme,
    toasts, showSuccess, showError, dismissToast,
    spaces, subjects, topics, cards, metrics, calendarEvents,
    institutions, planStatus, insights, insightsLoading, insightsLastUpdated,
    activeSpaceId, setActiveSpaceId,
    selectedSubject, setSelectedSubject,
    selectedTopic, setSelectedTopic,
    visibleSubjects, visibleTopics,
    activeSessionId, sessionCards, currentSessionCardIndex,
    isCardFlipped, setIsCardFlipped,
    sessionDone, sessionStats, requeuedCardIds,
    startStudySession, handleReviewCard, closeSession,
    calendarMonth, setCalendarMonth,
    eventModalOpen, eventDraft, setEventDraft, draftSaving,
    openCreateEvent, openCreateEventWithData, openEditEvent, handleSaveEvent, handleDeleteEvent, closeEventModal, quickCreateEvent,
    upgradeModalOpen, setUpgradeModalOpen, checkoutLoading, handleCheckout,
    fetchCalendarEvents, fetchInsights, handleRefreshInsights,
    fetchInstitutions, fetchCardsForTopic, fetchTopicsForSubject, fetchMetrics,
    handleCreateSpace, handleDeleteSpace,
    handleCreateSubject, handleDeleteSubject,
    handleCreateTopic, handleDeleteTopic,
    handleCreateCard, handleDeleteCard, handleUpdateCard, fetchAllCards,
    handleUpdateProfile,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
