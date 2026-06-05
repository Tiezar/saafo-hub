import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import {
  BookOpen, Layers, Sparkles, User as UserIcon, LogOut, TrendingUp,
  Plus, Trash2, CheckCircle, Flame, Brain, Search, RotateCw,
  ChevronRight, AlertCircle, HelpCircle, Check, Sun, Moon, Mail,
  Calendar, ChevronLeft, X, Bell, Clock, Repeat,
  Upload, FileText, Image as ImageIcon, Type,
  Play, Pause, SkipForward, Timer, Trophy, GraduationCap, Settings,
  Zap, ShieldAlert, CreditCard, Star, RefreshCw,
} from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3000';

// ─── Types ──────────────────────────────────────────────────────────────────

interface User {
  id: string; email: string; name: string;
  nickname: string | null; institutionId: string | null; phone: string | null;
}
interface Institution { id: string; name: string; sigla: string; uf: string; domains: string[] }
interface StudySpace  { id: string; userId: string; name: string; color: string | null; icon: string | null }
interface Subject     { id: string; name: string; color: string | null; spaceId: string | null }
interface Topic       { id: string; name: string; subjectId: string }
interface Card        { id: string; front: string; back: string; topicId: string; interval: number; repetition: number; efactor: number; nextReview: string }
interface EventReminderSummary { id: string; minutesBefore: number; method: string; scheduledAt: string; sent: boolean }
interface CalendarEvent {
  id: string; userId: string; title: string; type: string;
  startAt: string; endAt: string | null; allDay: boolean;
  spaceId: string | null; subjectId: string | null;
  notes: string | null; color: string | null;
  recurrenceDays: number[]; recurrenceEndsAt: string | null;
  reminders: EventReminderSummary[];
}
interface PlanStatus {
  plan: 'FREE_TRIAL' | 'STUDENT' | 'EXPIRED';
  isActive: boolean;
  trialEndsAt: string | null;
  trialDaysLeft: number;
}

interface Insight {
  type: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface Metrics {
  totalReviewed: number; averageRating: number; retentionRate: number;
  dailyActivity: { date: string; count: number }[];
  subjectsPerformance: { subjectId: string; subjectName: string; totalCards: number; reviewedCards: number; averageRating: number; retentionRate: number }[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EVENT_TYPES = [
  { value: 'EXAM',          label: 'Prova',           color: '#ef4444', emoji: '📝' },
  { value: 'DEADLINE',      label: 'Entrega',          color: '#f97316', emoji: '⏰' },
  { value: 'FIXED_BLOCK',   label: 'Bloco Fixo',       color: '#3b82f6', emoji: '🔒' },
  { value: 'REMINDER',      label: 'Lembrete',         color: '#8b5cf6', emoji: '🔔' },
  { value: 'STUDY_SESSION', label: 'Sessão de Estudo', color: '#10b981', emoji: '📚' },
];

const REMINDER_PRESETS = [
  { value: 15,    label: '15 min antes' },
  { value: 30,    label: '30 min antes' },
  { value: 60,    label: '1 hora antes' },
  { value: 120,   label: '2 horas antes' },
  { value: 480,   label: '8 horas antes' },
  { value: 1440,  label: '1 dia antes'  },
  { value: 2880,  label: '2 dias antes' },
  { value: 10080, label: '1 semana antes' },
];

const DAYS_PT_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function getEventMeta(type: string) {
  return EVENT_TYPES.find(e => e.value === type) ?? EVENT_TYPES[3];
}

// ─── Calendar helpers ─────────────────────────────────────────────────────────

function getCalendarDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const days: Date[] = [];
  for (let d = first.getDay(); d > 0; d--) {
    days.push(new Date(year, month, 1 - d));
  }
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  while (days.length % 7 !== 0) {
    const last = days[days.length - 1];
    days.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
  }
  return days;
}

function eventOccursOn(event: CalendarEvent, date: Date): boolean {
  const eventStart = new Date(event.startAt);
  const dateOnly   = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const startOnly  = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
  if (event.recurrenceDays.length === 0) {
    return dateOnly.getTime() === startOnly.getTime();
  }
  if (dateOnly < startOnly) return false;
  if (event.recurrenceEndsAt && dateOnly > new Date(event.recurrenceEndsAt)) return false;
  return event.recurrenceDays.includes(date.getDay());
}

function toDatetimeLocal(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateLocal(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function formatEventTime(event: CalendarEvent): string {
  if (event.allDay) return 'Dia todo';
  const t = new Date(event.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (!event.endAt) return t;
  const te = new Date(event.endAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${t} – ${te}`;
}

// ─── Blank draft ──────────────────────────────────────────────────────────────

interface EventDraft {
  id: string | null; title: string; type: string;
  startAt: string; endAt: string; allDay: boolean;
  spaceId: string; subjectId: string; notes: string;
  recurrenceEnabled: boolean; recurrenceDays: number[]; recurrenceEndsAt: string;
  reminders: { minutesBefore: number; method: string }[];
}

function blankDraft(date?: Date): EventDraft {
  const d = date ?? new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T09:00`;
  return {
    id: null, title: '', type: 'REMINDER',
    startAt: dateStr, endAt: '', allDay: false,
    spaceId: '', subjectId: '', notes: '',
    recurrenceEnabled: false, recurrenceDays: [], recurrenceEndsAt: '',
    reminders: [],
  };
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  // Auth
  const [token,       setToken]       = useState<string | null>(() => localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard'|'subjects'|'ai'|'calendar'|'profile'|'pomodoro'|'quiz'>('dashboard');
  const [emailPending,setEmailPending]= useState<string | null>(null);
  const [authEmail,   setAuthEmail]   = useState('');
  const [authName,    setAuthName]    = useState('');
  const [authPassword,setAuthPassword]= useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [isRegistering,setIsRegistering] = useState(false);

  // Theme
  const [theme, setTheme] = useState<'light'|'dark'>(() => {
    const s = localStorage.getItem('theme');
    if (s === 'light' || s === 'dark') return s;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });
  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Data
  const [spaces,     setSpaces]    = useState<StudySpace[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [institutions,  setInstitutions]  = useState<Institution[]>([]);
  const [subjects,      setSubjects]      = useState<Subject[]>([]);
  const [topics,        setTopics]        = useState<Topic[]>([]);
  const [cards,         setCards]         = useState<Card[]>([]);
  const [metrics,       setMetrics]       = useState<Metrics | null>(null);
  const [calendarEvents,setCalendarEvents]= useState<CalendarEvent[]>([]);

  // Selection
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopic,   setSelectedTopic]   = useState<Topic | null>(null);

  // Forms
  const [newSubjectName,  setNewSubjectName]  = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#8b5cf6');
  const [newTopicName,    setNewTopicName]    = useState('');
  const [newCardFront,    setNewCardFront]    = useState('');
  const [newCardBack,     setNewCardBack]     = useState('');

  // AI
  const [aiTab,          setAiTab]          = useState<'text'|'file'>('text');
  const [aiText,         setAiText]         = useState('');
  const [aiTheme,        setAiTheme]        = useState('');
  const [aiTopicId,      setAiTopicId]      = useState('');
  const [aiFile,         setAiFile]         = useState<File | null>(null);
  const [aiDragOver,     setAiDragOver]     = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiResultCount,  setAiResultCount]  = useState<number | null>(null);

  // Profile
  const [profileName,     setProfileName]     = useState('');
  const [profileNickname, setProfileNickname] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profilePhone,    setProfilePhone]    = useState('');
  const [profileInstSearch,  setProfileInstSearch]  = useState('');
  const [selectedInstitution,setSelectedInstitution]= useState<Institution | null>(null);
  const [showInstDropdown,   setShowInstDropdown]   = useState(false);

  // Study session
  const [activeSessionId,        setActiveSessionId]        = useState<string | null>(null);
  const [sessionCards,           setSessionCards]           = useState<Card[]>([]);
  const [currentSessionCardIndex,setCurrentSessionCardIndex]= useState(0);
  const [isCardFlipped,          setIsCardFlipped]          = useState(false);

  // Calendar
  const [calendarMonth,    setCalendarMonth]    = useState(() => new Date());
  const [calendarTab,      setCalendarTab]      = useState<'month'|'agenda'>('month');
  const [eventModalOpen,   setEventModalOpen]   = useState(false);
  const [eventDraft,       setEventDraft]       = useState<EventDraft>(blankDraft());
  const [draftSaving,      setDraftSaving]      = useState(false);

  // Spaces form
  const [newSpaceName,  setNewSpaceName]  = useState('');
  const [newSpaceColor, setNewSpaceColor] = useState('#8b5cf6');
  const [newSpaceIcon,  setNewSpaceIcon]  = useState('📚');
  const [showSpaceForm, setShowSpaceForm] = useState(false);

  // Plan + Insights
  const [planStatus,       setPlanStatus]      = useState<PlanStatus | null>(null);
  const [insights,         setInsights]        = useState<Insight[]>([]);
  const [insightsLoading,  setInsightsLoading] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen]= useState(false);
  const [checkoutLoading,  setCheckoutLoading] = useState(false);

  // Pomodoro
  const [pomodoroPhase,    setPomodoroPhase]    = useState<'focus'|'short-break'|'long-break'>('focus');
  const [pomodoroRunning,  setPomodoroRunning]  = useState(false);
  const [pomodoroSeconds,  setPomodoroSeconds]  = useState(25 * 60);
  const [pomodoroRound,    setPomodoroRound]    = useState(1);
  const [pomodoroFocusMin, setPomodoroFocusMin] = useState(25);
  const [pomodoroBreakMin, setPomodoroBreakMin] = useState(5);
  const [pomodoroLongMin,  setPomodoroLongMin]  = useState(15);
  const [pomodoroSessions, setPomodoroSessions] = useState(0);
  const [pomodoroTopicId,  setPomodoroTopicId]  = useState('');
  const [pomodoroShowSettings, setPomodoroShowSettings] = useState(false);
  const pomodoroPhaseRef = useRef(pomodoroPhase);
  const pomodoroRoundRef = useRef(pomodoroRound);
  const pomodoroFocusRef = useRef(pomodoroFocusMin);
  const pomodoroBreakRef = useRef(pomodoroBreakMin);
  const pomodoroLongRef  = useRef(pomodoroLongMin);
  useEffect(() => { pomodoroPhaseRef.current = pomodoroPhase; }, [pomodoroPhase]);
  useEffect(() => { pomodoroRoundRef.current = pomodoroRound; }, [pomodoroRound]);
  useEffect(() => { pomodoroFocusRef.current = pomodoroFocusMin; }, [pomodoroFocusMin]);
  useEffect(() => { pomodoroBreakRef.current = pomodoroBreakMin; }, [pomodoroBreakMin]);
  useEffect(() => { pomodoroLongRef.current  = pomodoroLongMin;  }, [pomodoroLongMin]);

  // Quiz
  const [quizTopicId,      setQuizTopicId]      = useState('');
  const [quizDifficulty,   setQuizDifficulty]   = useState<'easy'|'medium'|'hard'>('medium');
  const [quizCount,        setQuizCount]        = useState(10);
  const [quizQuestions,    setQuizQuestions]    = useState<QuizQuestion[]>([]);
  const [quizIndex,        setQuizIndex]        = useState(0);
  const [quizSelected,     setQuizSelected]     = useState<number | null>(null);
  const [quizAnswers,      setQuizAnswers]      = useState<boolean[]>([]);
  const [quizLoading,      setQuizLoading]      = useState(false);
  const [quizFinished,     setQuizFinished]     = useState(false);
  const [quizRevealed,     setQuizRevealed]     = useState(false);

  // Notifications
  const [errorMessage,   setErrorMessage]   = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showError   = useCallback((m: string) => { setErrorMessage(m);   setTimeout(() => setErrorMessage(null), 6000); }, []);
  const showSuccess = useCallback((m: string) => { setSuccessMessage(m); setTimeout(() => setSuccessMessage(null), 4000); }, []);

  // ── Email verification redirect ────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const at = params.get('access_token');
    const authError = params.get('auth_error');
    if (at) {
      localStorage.setItem('token', at);
      setToken(at);
      if (params.get('verified')) showSuccess('Email verificado! Bem-vindo.');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (authError) {
      const msgs: Record<string, string> = {
        expired_token: 'Link expirado. Crie uma nova conta.',
        invalid_token: 'Link inválido.',
        user_not_found: 'Usuário não encontrado.',
      };
      showError(msgs[authError] ?? 'Erro na verificação.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [showError, showSuccess]);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null); setCurrentUser(null);
    setSubjects([]); setTopics([]); setCards([]); setMetrics(null);
    setSpaces([]); setCalendarEvents([]);
    setPlanStatus(null); setInsights([]);
  }, []);

  // ── API call ──────────────────────────────────────────────────────────────
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

  // ── Plan / Billing ─────────────────────────────────────────────────────────
  const fetchPlanStatus = useCallback(async () => {
    try { setPlanStatus(await apiCall('/billing/status')); }
    catch { /* silent */ }
  }, [apiCall]);

  const fetchInsights = useCallback(async () => {
    setInsightsLoading(true);
    try { setInsights(await apiCall('/insights')); }
    catch { /* silent — may be 402 if plan expired */ }
    finally { setInsightsLoading(false); }
  }, [apiCall]);

  const handleRefreshInsights = useCallback(async () => {
    setInsightsLoading(true);
    try { setInsights(await apiCall('/insights/cache', { method: 'DELETE' })); }
    catch { /* silent */ }
    finally { setInsightsLoading(false); }
  }, [apiCall]);

  const handleCheckout = useCallback(async () => {
    setCheckoutLoading(true);
    try {
      const { invoiceUrl } = await apiCall('/billing/checkout', { method: 'POST' });
      window.open(invoiceUrl, '_blank', 'noopener,noreferrer');
      setUpgradeModalOpen(false);
    } catch (e: unknown) { showError((e as Error).message); }
    finally { setCheckoutLoading(false); }
  }, [apiCall, showError]);

  const storeAuth = useCallback((at: string, user: User) => {
    localStorage.setItem('token', at); setToken(at); setCurrentUser(user);
    setProfileName(user.name); setProfileNickname(user.nickname ?? '');
    setProfilePhone(user.phone ?? '');
  }, []);

  // ── Auth ───────────────────────────────────────────────────────────────────
  const handleGoogleSuccess = useCallback(async (cr: CredentialResponse) => {
    if (!cr.credential) return;
    setAuthLoading(true);
    try {
      const d = await apiCall('/auth/google', { method: 'POST', body: JSON.stringify({ token: cr.credential }) });
      storeAuth(d.access_token, d.user);
    } catch (e: unknown) { showError((e as Error).message); }
    finally { setAuthLoading(false); }
  }, [apiCall, storeAuth, showError]);

  const handleResendEmail = useCallback(async () => {
    if (!emailPending) return;
    setResendLoading(true);
    try {
      const d = await apiCall('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: emailPending }),
      });
      showSuccess(d.message);
    } catch (e: unknown) {
      showError((e as Error).message);
    } finally {
      setResendLoading(false);
    }
  }, [emailPending, apiCall, showSuccess, showError]);

  const handleAuth = useCallback(async (e: React.FormEvent) => {
    e.preventDefault(); setAuthLoading(true);
    try {
      if (isRegistering) {
        const d = await apiCall('/auth/register', { method: 'POST', body: JSON.stringify({ email: authEmail, name: authName, password: authPassword }) });
        setEmailPending(authEmail); setAuthEmail(''); setAuthName(''); setAuthPassword('');
        showSuccess(d.message);
      } else {
        const d = await apiCall('/auth/login', { method: 'POST', body: JSON.stringify({ email: authEmail, password: authPassword }) });
        storeAuth(d.access_token, d.user);
      }
    } catch (e: unknown) {
      const msg = (e as Error).message;
      if (!isRegistering && msg && (msg.toLowerCase().includes('não verificado') || msg.toLowerCase().includes('caixa de entrada') || msg.toLowerCase().includes('verify-email'))) {
        setEmailPending(authEmail);
        setAuthEmail('');
        setAuthPassword('');
      } else {
        showError(msg);
      }
    }
    finally { setAuthLoading(false); }
  }, [isRegistering, authEmail, authName, authPassword, apiCall, storeAuth, showError, showSuccess]);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchUserProfile = useCallback(async () => {
    try {
      const u = await apiCall('/profile');
      setCurrentUser(u); setProfileName(u.name); setProfileNickname(u.nickname ?? '');
      setProfilePhone(u.phone ?? '');
    } catch (e: unknown) { showError((e as Error).message); }
  }, [apiCall, showError]);

  const fetchInstitutions = useCallback(async (search = '') => {
    try {
      const l = await apiCall(`/institutions?search=${encodeURIComponent(search)}`);
      setInstitutions(l);
    } catch { /* silent */ }
  }, [apiCall]);

  const fetchSpaces = useCallback(async () => {
    try { setSpaces(await apiCall('/spaces')); }
    catch { /* silent */ }
  }, [apiCall]);

  const fetchSubjects = useCallback(async () => {
    try {
      const list: Subject[] = await apiCall('/subjects');
      setSubjects(list);
      const results = await Promise.allSettled(list.map(s => apiCall(`/topics?subjectId=${s.id}`)));
      setTopics(results.flatMap(r => r.status === 'fulfilled' ? r.value : []));
    } catch (e: unknown) { showError((e as Error).message); }
  }, [apiCall, showError]);

  const fetchMetrics = useCallback(async () => {
    try { setMetrics(await apiCall('/metrics')); }
    catch { /* silent */ }
  }, [apiCall]);

  const fetchTopicsForSubject = useCallback(async (subjectId: string) => {
    try {
      const list = await apiCall(`/topics?subjectId=${subjectId}`);
      setTopics(prev => [...prev.filter(t => t.subjectId !== subjectId), ...list]);
    } catch (e: unknown) { showError((e as Error).message); }
  }, [apiCall, showError]);

  const fetchCardsForTopic = useCallback(async (topicId: string) => {
    try {
      const list = await apiCall(`/cards?topicId=${topicId}`);
      setCards(prev => [...prev.filter(c => c.topicId !== topicId), ...list]);
    } catch (e: unknown) { showError((e as Error).message); }
  }, [apiCall, showError]);

  const fetchCalendarEvents = useCallback(async (year: number, month: number) => {
    const from = new Date(year, month - 1, 1).toISOString();
    const to   = new Date(year, month + 1, 0).toISOString();
    const sp   = activeSpaceId ? `&spaceId=${activeSpaceId}` : '';
    try { setCalendarEvents(await apiCall(`/calendar/events?from=${from}&to=${to}${sp}`)); }
    catch { /* silent */ }
  }, [apiCall, activeSpaceId]);

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => { if (token && !currentUser) fetchUserProfile(); }, [token, currentUser, fetchUserProfile]);
  useEffect(() => {
    if (currentUser) {
      fetchSubjects(); fetchMetrics(); fetchInstitutions(); fetchSpaces();
      fetchPlanStatus();
    }
  }, [currentUser, fetchSubjects, fetchMetrics, fetchInstitutions, fetchSpaces, fetchPlanStatus]);
  useEffect(() => {
    if (currentUser && currentView === 'dashboard') fetchInsights();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, currentView]);
  useEffect(() => { if (selectedSubject) fetchTopicsForSubject(selectedSubject.id); }, [selectedSubject, fetchTopicsForSubject]);
  useEffect(() => { if (selectedTopic) fetchCardsForTopic(selectedTopic.id); }, [selectedTopic, fetchCardsForTopic]);
  useEffect(() => {
    if (currentView === 'calendar') {
      fetchCalendarEvents(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1);
    }
  }, [currentView, calendarMonth, fetchCalendarEvents]);

  // ── Computed ───────────────────────────────────────────────────────────────
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

  // ── StudySpaces CRUD ───────────────────────────────────────────────────────
  const handleCreateSpace = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;
    try {
      const created = await apiCall('/spaces', {
        method: 'POST',
        body: JSON.stringify({ name: newSpaceName.trim(), color: newSpaceColor, icon: newSpaceIcon }),
      });
      setSpaces(prev => [...prev, created]);
      setNewSpaceName(''); setShowSpaceForm(false);
      showSuccess('Área criada!');
    } catch (e: unknown) { showError((e as Error).message); }
  }, [newSpaceName, newSpaceColor, newSpaceIcon, apiCall, showSuccess, showError]);

  const handleDeleteSpace = useCallback(async (id: string) => {
    if (!confirm('Excluir esta área? As matérias ficam sem área atribuída.')) return;
    try {
      await apiCall(`/spaces/${id}`, { method: 'DELETE' });
      setSpaces(prev => prev.filter(s => s.id !== id));
      if (activeSpaceId === id) setActiveSpaceId(null);
      showSuccess('Área removida.');
    } catch (e: unknown) { showError((e as Error).message); }
  }, [apiCall, activeSpaceId, showSuccess, showError]);

  // ── Subjects CRUD ──────────────────────────────────────────────────────────
  const handleCreateSubject = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    try {
      const c = await apiCall('/subjects', {
        method: 'POST',
        body: JSON.stringify({ name: newSubjectName, color: newSubjectColor, spaceId: activeSpaceId ?? undefined }),
      });
      setSubjects(prev => [...prev, c]); setNewSubjectName(''); showSuccess('Matéria criada!');
    } catch (e: unknown) { showError((e as Error).message); }
  }, [newSubjectName, newSubjectColor, activeSpaceId, apiCall, showSuccess, showError]);

  const handleDeleteSubject = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Excluir matéria e todos os dados relacionados?')) return;
    try {
      await apiCall(`/subjects/${id}`, { method: 'DELETE' });
      setSubjects(prev => prev.filter(s => s.id !== id));
      setTopics(prev => prev.filter(t => t.subjectId !== id));
      if (selectedSubject?.id === id) { setSelectedSubject(null); setSelectedTopic(null); }
      showSuccess('Matéria excluída.');
    } catch (e: unknown) { showError((e as Error).message); }
  }, [apiCall, selectedSubject, showSuccess, showError]);

  // ── Topics CRUD ────────────────────────────────────────────────────────────
  const handleCreateTopic = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim() || !selectedSubject) return;
    try {
      const c = await apiCall('/topics', { method: 'POST', body: JSON.stringify({ name: newTopicName, subjectId: selectedSubject.id }) });
      setTopics(prev => [...prev, c]); setNewTopicName(''); showSuccess('Tópico criado!');
    } catch (e: unknown) { showError((e as Error).message); }
  }, [newTopicName, selectedSubject, apiCall, showSuccess, showError]);

  const handleDeleteTopic = useCallback(async (id: string) => {
    if (!confirm('Excluir tópico e todos os seus flashcards?')) return;
    try {
      await apiCall(`/topics/${id}`, { method: 'DELETE' });
      setTopics(prev => prev.filter(t => t.id !== id));
      setCards(prev => prev.filter(c => c.topicId !== id));
      if (selectedTopic?.id === id) setSelectedTopic(null);
      showSuccess('Tópico excluído.');
    } catch (e: unknown) { showError((e as Error).message); }
  }, [apiCall, selectedTopic, showSuccess, showError]);

  // ── Cards CRUD ─────────────────────────────────────────────────────────────
  const handleCreateCard = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardFront.trim() || !newCardBack.trim() || !selectedTopic) return;
    try {
      const c = await apiCall('/cards', { method: 'POST', body: JSON.stringify({ front: newCardFront, back: newCardBack, topicId: selectedTopic.id }) });
      setCards(prev => [...prev, c]); setNewCardFront(''); setNewCardBack(''); showSuccess('Card criado!');
    } catch (e: unknown) { showError((e as Error).message); }
  }, [newCardFront, newCardBack, selectedTopic, apiCall, showSuccess, showError]);

  const handleDeleteCard = useCallback(async (id: string) => {
    try {
      await apiCall(`/cards/${id}`, { method: 'DELETE' });
      setCards(prev => prev.filter(c => c.id !== id)); showSuccess('Card excluído.');
    } catch (e: unknown) { showError((e as Error).message); }
  }, [apiCall, showSuccess, showError]);

  // ── Study session ──────────────────────────────────────────────────────────
  const startStudySession = useCallback(async () => {
    const due = cards.filter(c => {
      if (selectedTopic) return c.topicId === selectedTopic.id;
      if (selectedSubject) return topics.filter(t => t.subjectId === selectedSubject.id).some(t => t.id === c.topicId);
      return new Date(c.nextReview) <= new Date();
    });
    if (!due.length) { showError('Não há cards pendentes!'); return; }
    try {
      const s = await apiCall('/study-sessions', { method: 'POST' });
      setActiveSessionId(s.id); setSessionCards(due); setCurrentSessionCardIndex(0); setIsCardFlipped(false);
    } catch (e: unknown) { showError((e as Error).message); }
  }, [cards, selectedTopic, selectedSubject, topics, apiCall, showError]);

  const handleReviewCard = useCallback(async (rating: number) => {
    if (!activeSessionId || !sessionCards.length) return;
    const card = sessionCards[currentSessionCardIndex];
    try {
      await apiCall('/study-sessions/review', { method: 'POST', body: JSON.stringify({ cardId: card.id, sessionId: activeSessionId, rating }) });
      if (currentSessionCardIndex + 1 < sessionCards.length) {
        setIsCardFlipped(false);
        setTimeout(() => setCurrentSessionCardIndex(i => i + 1), 150);
      } else {
        setActiveSessionId(null); setSessionCards([]); showSuccess('Sessão concluída!'); fetchMetrics();
      }
    } catch (e: unknown) { showError((e as Error).message); }
  }, [activeSessionId, sessionCards, currentSessionCardIndex, apiCall, showSuccess, showError, fetchMetrics]);

  // ── AI ─────────────────────────────────────────────────────────────────────
  const resetAiForm = useCallback(() => {
    setAiText(''); setAiTheme(''); setAiFile(null); setAiResultCount(null);
  }, []);

  const handleAiGenerateText = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiText.trim() || !aiTopicId) return;
    setIsGeneratingAi(true); setAiResultCount(null);
    try {
      const cards = await apiCall('/ai/generate', {
        method: 'POST',
        body: JSON.stringify({ text: aiText, topicId: aiTopicId, theme: aiTheme || undefined }),
      });
      setAiResultCount(cards.length);
      showSuccess(`${cards.length} flashcard${cards.length !== 1 ? 's' : ''} gerado${cards.length !== 1 ? 's' : ''} com sucesso!`);
      if (selectedTopic?.id === aiTopicId) fetchCardsForTopic(aiTopicId);
      setAiText(''); setAiTheme('');
    } catch (e: unknown) { showError((e as Error).message); }
    finally { setIsGeneratingAi(false); }
  }, [aiText, aiTheme, aiTopicId, apiCall, showSuccess, showError, selectedTopic, fetchCardsForTopic]);

  const handleAiGenerateFile = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiFile || !aiTopicId) return;
    setIsGeneratingAi(true); setAiResultCount(null);
    try {
      const fd = new FormData();
      fd.append('file', aiFile);
      fd.append('topicId', aiTopicId);
      if (aiTheme.trim()) fd.append('theme', aiTheme.trim());

      const currentToken = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/ai/generate-file`, {
        method: 'POST',
        headers: currentToken ? { Authorization: `Bearer ${currentToken}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Erro ao gerar flashcards');
      }
      const cards = await res.json();
      setAiResultCount(cards.length);
      showSuccess(`${cards.length} flashcard${cards.length !== 1 ? 's' : ''} gerado${cards.length !== 1 ? 's' : ''} com sucesso!`);
      if (selectedTopic?.id === aiTopicId) fetchCardsForTopic(aiTopicId);
      setAiFile(null); setAiTheme('');
    } catch (e: unknown) { showError((e as Error).message); }
    finally { setIsGeneratingAi(false); }
  }, [aiFile, aiTheme, aiTopicId, showSuccess, showError, selectedTopic, fetchCardsForTopic]);

  // ── Profile ────────────────────────────────────────────────────────────────
  const handleProfileUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const u = await apiCall('/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: profileName, nickname: profileNickname || undefined,
          password: profilePassword || undefined,
          institutionId: selectedInstitution?.id || undefined,
          phone: profilePhone || undefined,
        }),
      });
      setCurrentUser(u); setProfilePassword(''); showSuccess('Perfil atualizado!');
    } catch (e: unknown) { showError((e as Error).message); }
  }, [profileName, profileNickname, profilePassword, profilePhone, selectedInstitution, apiCall, showSuccess, showError]);

  // ── Calendar CRUD ──────────────────────────────────────────────────────────
  const openCreateEvent = useCallback((date?: Date) => {
    setEventDraft(blankDraft(date)); setEventModalOpen(true);
  }, []);

  const openEditEvent = useCallback((event: CalendarEvent) => {
    setEventDraft({
      id: event.id, title: event.title, type: event.type,
      startAt: toDatetimeLocal(event.startAt),
      endAt: event.endAt ? toDatetimeLocal(event.endAt) : '',
      allDay: event.allDay, spaceId: event.spaceId ?? '', subjectId: event.subjectId ?? '',
      notes: event.notes ?? '', recurrenceEnabled: event.recurrenceDays.length > 0,
      recurrenceDays: event.recurrenceDays,
      recurrenceEndsAt: event.recurrenceEndsAt ? toDateLocal(event.recurrenceEndsAt) : '',
      reminders: event.reminders.filter(r => !r.sent).map(r => ({ minutesBefore: r.minutesBefore, method: r.method })),
    });
    setEventModalOpen(true);
  }, []);

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
        const updated: CalendarEvent = await apiCall(`/calendar/events/${eventDraft.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        setCalendarEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
        showSuccess('Evento atualizado!');
      } else {
        const created: CalendarEvent = await apiCall('/calendar/events', { method: 'POST', body: JSON.stringify(payload) });
        setCalendarEvents(prev => [...prev, created]);
        showSuccess('Evento criado!');
      }
      setEventModalOpen(false);
    } catch (e: unknown) { showError((e as Error).message); }
    finally { setDraftSaving(false); }
  }, [eventDraft, apiCall, showSuccess, showError]);

  const handleDeleteEvent = useCallback(async (id: string) => {
    if (!confirm('Excluir este evento?')) return;
    try {
      await apiCall(`/calendar/events/${id}`, { method: 'DELETE' });
      setCalendarEvents(prev => prev.filter(e => e.id !== id));
      setEventModalOpen(false); showSuccess('Evento excluído.');
    } catch (e: unknown) { showError((e as Error).message); }
  }, [apiCall, showSuccess, showError]);

  // ── Pomodoro ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pomodoroRunning) return;
    const id = setInterval(() => setPomodoroSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [pomodoroRunning]);

  useEffect(() => {
    if (pomodoroSeconds !== 0 || !pomodoroRunning) return;
    setPomodoroRunning(false);
    // Beep via Web Audio API
    try {
      const ctx = new AudioContext();
      [0, 200, 400].forEach(delay => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = pomodoroPhaseRef.current === 'focus' ? 523 : 440;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + delay / 1000);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay / 1000 + 0.3);
        osc.start(ctx.currentTime + delay / 1000);
        osc.stop(ctx.currentTime + delay / 1000 + 0.35);
      });
      setTimeout(() => ctx.close(), 1200);
    } catch {}
    // Advance phase using refs (no stale closures)
    const phase = pomodoroPhaseRef.current;
    if (phase === 'focus') {
      setPomodoroSessions(s => s + 1);
      const nextRound = pomodoroRoundRef.current + 1;
      if (nextRound > 4) {
        setPomodoroRound(1);
        setPomodoroPhase('long-break');
        setPomodoroSeconds(pomodoroLongRef.current * 60);
      } else {
        setPomodoroRound(nextRound);
        setPomodoroPhase('short-break');
        setPomodoroSeconds(pomodoroBreakRef.current * 60);
      }
    } else {
      setPomodoroPhase('focus');
      setPomodoroSeconds(pomodoroFocusRef.current * 60);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoroSeconds, pomodoroRunning]);

  const resetPomodoro = useCallback(() => {
    setPomodoroRunning(false);
    setPomodoroPhase('focus');
    setPomodoroRound(1);
    setPomodoroSeconds(pomodoroFocusRef.current * 60);
    setPomodoroSessions(0);
  }, []);

  const skipPomodoroPhase = useCallback(() => {
    setPomodoroSeconds(0);
  }, []);

  // ── Quiz ───────────────────────────────────────────────────────────────────
  const handleStartQuiz = useCallback(async () => {
    if (!quizTopicId) return;
    setQuizLoading(true);
    setQuizQuestions([]); setQuizIndex(0); setQuizSelected(null);
    setQuizAnswers([]); setQuizFinished(false); setQuizRevealed(false);
    try {
      const qs: QuizQuestion[] = await apiCall('/ai/quiz', {
        method: 'POST',
        body: JSON.stringify({ topicId: quizTopicId, difficulty: quizDifficulty, count: quizCount }),
      });
      setQuizQuestions(qs);
    } catch (e: unknown) { showError((e as Error).message); }
    finally { setQuizLoading(false); }
  }, [quizTopicId, quizDifficulty, quizCount, apiCall, showError]);

  const handleQuizAnswer = useCallback((idx: number) => {
    if (quizRevealed) return;
    setQuizSelected(idx);
    setQuizRevealed(true);
    const correct = idx === quizQuestions[quizIndex].correctIndex;
    setQuizAnswers(prev => [...prev, correct]);
  }, [quizRevealed, quizQuestions, quizIndex]);

  const handleQuizNext = useCallback(() => {
    if (quizIndex + 1 >= quizQuestions.length) {
      setQuizFinished(true);
    } else {
      setQuizIndex(i => i + 1);
      setQuizSelected(null);
      setQuizRevealed(false);
    }
  }, [quizIndex, quizQuestions.length]);

  const handleQuizRestart = useCallback(() => {
    setQuizQuestions([]); setQuizIndex(0); setQuizSelected(null);
    setQuizAnswers([]); setQuizFinished(false); setQuizRevealed(false);
  }, []);

  // ── Reminder helpers ───────────────────────────────────────────────────────
  const addReminder = () => {
    setEventDraft(d => ({ ...d, reminders: [...d.reminders, { minutesBefore: 60, method: 'WHATSAPP' }] }));
  };
  const removeReminder = (i: number) => {
    setEventDraft(d => ({ ...d, reminders: d.reminders.filter((_, idx) => idx !== i) }));
  };
  const updateReminder = (i: number, patch: Partial<{ minutesBefore: number; method: string }>) => {
    setEventDraft(d => ({ ...d, reminders: d.reminders.map((r, idx) => idx === i ? { ...r, ...patch } : r) }));
  };

  // ── ── ── ── ── ── ── ── ── ── VIEWS ── ── ── ── ── ── ── ── ── ── ──

  // Email pending
  if (emailPending) {
    return (
      <div className="auth-wrapper">
        <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="theme-toggle-floating">
          {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
        </button>
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, background: 'rgba(139,92,246,0.1)', borderRadius: '50%', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
            <Mail size={26} style={{ color: 'var(--color-primary-light)' }}/>
          </div>
          <h2 className="auth-title">Verifique seu email</h2>
          <p className="auth-subtitle">Enviamos um link de ativação para:</p>
          <p style={{ fontWeight: 600, color: 'var(--color-primary-light)', marginBottom: 24, fontSize: 15 }}>{emailPending}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
            Clique no link do email para ativar sua conta.<br/>O link expira em 24 horas.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
            <button className="btn-secondary" style={{ width: 'auto', padding: '10px 20px' }}
              onClick={() => { setEmailPending(null); setIsRegistering(false); }}>
              Voltar ao login
            </button>
            <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onClick={handleResendEmail} disabled={resendLoading}>
              {resendLoading && <RotateCw size={14} className="animate-spin"/>}
              Reenviar e-mail
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Auth
  if (!token) {
    return (
      <div className="auth-wrapper">
        <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="theme-toggle-floating">
          {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
        </button>
        <div className="auth-card">
          <div className="logo-container" style={{ justifyContent: 'center', marginBottom: 24 }}>
            <div className="logo-icon"><Brain size={18}/></div>
            <div className="logo-text">SAAFO HUB</div>
          </div>
          <h2 className="auth-title">{isRegistering ? 'Criar Conta' : 'Acessar o Hub'}</h2>
          <p className="auth-subtitle">{isRegistering ? 'Cadastre-se para turbinar seus estudos' : 'Entre para gerenciar seus flashcards'}</p>
          <form onSubmit={handleAuth}>
            {isRegistering && (
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input type="text" className="form-input" value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Seu nome" required disabled={authLoading}/>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input type="email" className="form-input" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="estudante@instituicao.edu.br" required disabled={authLoading}/>
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input type="password" className="form-input" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} disabled={authLoading}/>
            </div>
            <button type="submit" className="btn-primary" disabled={authLoading}>
              {authLoading && <RotateCw size={16} className="animate-spin"/>}
              {isRegistering ? 'Criar Conta' : 'Entrar'}
              {!authLoading && <ChevronRight size={16}/>}
            </button>
          </form>
          <div className="divider">ou continue com</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => showError('Falha no login com Google.')}
              text="signin_with" shape="rectangular"
              theme={theme === 'dark' ? 'filled_black' : 'outline'} size="large"/>
          </div>
          <p style={{ marginTop: 24, fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center' }}>
            {isRegistering ? 'Já tem conta?' : 'Não tem conta?'}&nbsp;
            <span onClick={() => setIsRegistering(r => !r)} style={{ color: 'var(--color-primary-light)', cursor: 'pointer', fontWeight: 600 }}>
              {isRegistering ? 'Fazer Login' : 'Cadastre-se'}
            </span>
          </p>
          {errorMessage && (
            <div style={{ marginTop: 20, padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={16}/><span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div style={{ marginTop: 20, padding: 12, borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={16}/><span>{successMessage}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Study session overlay
  if (activeSessionId && sessionCards.length > 0) {
    const card = sessionCards[currentSessionCardIndex];
    return (
      <div className="auth-wrapper" style={{ background: 'var(--bg-deep)' }}>
        <div style={{ width: '100%', maxWidth: 600, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Card {currentSessionCardIndex + 1} de {sessionCards.length}</span>
            <button onClick={() => { setActiveSessionId(null); setSessionCards([]); }} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontWeight: 'bold' }}>Sair</button>
          </div>
          <div className={`study-card-outer ${isCardFlipped ? 'flipped' : ''}`} onClick={() => setIsCardFlipped(f => !f)}>
            <div className="study-card-inner">
              <div className="study-card-front">
                <span className="badge badge-primary" style={{ marginBottom: 16 }}>Pergunta</span>
                <p className="study-card-text">{card.front}</p>
                <div className="study-card-tip">Clique para virar</div>
              </div>
              <div className="study-card-back">
                <span className="badge badge-success" style={{ marginBottom: 16 }}>Resposta</span>
                <p className="study-card-text">{card.back}</p>
                <div className="study-card-tip">Avalie sua resposta abaixo</div>
              </div>
            </div>
          </div>
          {isCardFlipped && (
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>Quão bem você lembrou?</p>
              <div className="rating-bar">
                {[0,1,2,3,4,5].map(v => <button key={v} className="rating-btn" onClick={() => handleReviewCard(v)}>{v}</button>)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 12, color: 'var(--text-muted)', padding: '0 8px' }}>
                <span>0 = Esqueci</span><span>3 = Com dificuldade</span><span>5 = Excelente</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Event Modal ────────────────────────────────────────────────────────────
  const eventModal = eventModalOpen && (
    <div className="event-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEventModalOpen(false); }}>
      <div className="event-modal">
        <div className="event-modal-header">
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, margin: 0 }}>
            {eventDraft.id ? 'Editar Evento' : 'Novo Evento'}
          </h3>
          <button onClick={() => setEventModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20}/></button>
        </div>

        <div className="event-modal-body">
          {/* Title */}
          <div className="form-group">
            <label className="form-label">Título</label>
            <input type="text" className="form-input" value={eventDraft.title} onChange={e => setEventDraft(d => ({ ...d, title: e.target.value }))} placeholder="Nome do evento" required/>
          </div>

          {/* Type */}
          <div className="form-group">
            <label className="form-label">Tipo</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {EVENT_TYPES.map(et => (
                <button key={et.value} type="button"
                  onClick={() => setEventDraft(d => ({ ...d, type: et.value }))}
                  style={{
                    padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${eventDraft.type === et.value ? et.color : 'var(--border-color)'}`,
                    background: eventDraft.type === et.value ? `${et.color}22` : 'transparent',
                    color: eventDraft.type === et.value ? et.color : 'var(--text-secondary)',
                  }}>
                  {et.emoji} {et.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date/Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">{eventDraft.allDay ? 'Data' : 'Data e Horário'}</label>
              <input type={eventDraft.allDay ? 'date' : 'datetime-local'} className="form-input"
                value={eventDraft.allDay ? eventDraft.startAt.split('T')[0] : eventDraft.startAt}
                onChange={e => setEventDraft(d => ({ ...d, startAt: eventDraft.allDay ? e.target.value + 'T00:00' : e.target.value }))}
                required/>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={eventDraft.allDay} onChange={e => setEventDraft(d => ({ ...d, allDay: e.target.checked }))}/>
                Dia todo
              </label>
            </div>
          </div>

          {!eventDraft.allDay && (
            <div className="form-group">
              <label className="form-label">Horário de término (opcional)</label>
              <input type="datetime-local" className="form-input" value={eventDraft.endAt}
                onChange={e => setEventDraft(d => ({ ...d, endAt: e.target.value }))}/>
            </div>
          )}

          {/* Space & Subject */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Área (opcional)</label>
              <select className="form-input" value={eventDraft.spaceId} onChange={e => setEventDraft(d => ({ ...d, spaceId: e.target.value }))}>
                <option value="">Sem área</option>
                {spaces.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Matéria (opcional)</label>
              <select className="form-input" value={eventDraft.subjectId} onChange={e => setEventDraft(d => ({ ...d, subjectId: e.target.value }))}>
                <option value="">Sem matéria</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">Notas (opcional)</label>
            <textarea className="form-input" rows={2} style={{ resize: 'vertical' }} value={eventDraft.notes}
              onChange={e => setEventDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Observações..."/>
          </div>

          {/* Recurrence */}
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
              <input type="checkbox" checked={eventDraft.recurrenceEnabled}
                onChange={e => setEventDraft(d => ({ ...d, recurrenceEnabled: e.target.checked, recurrenceDays: [] }))}/>
              <Repeat size={14}/> <span style={{ fontSize: 13, fontWeight: 600 }}>Repetir semanalmente</span>
            </label>
            {eventDraft.recurrenceEnabled && (
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  {DAYS_PT_SHORT.map((day, idx) => (
                    <button key={idx} type="button"
                      onClick={() => setEventDraft(d => ({
                        ...d,
                        recurrenceDays: d.recurrenceDays.includes(idx)
                          ? d.recurrenceDays.filter(x => x !== idx)
                          : [...d.recurrenceDays, idx],
                      }))}
                      style={{
                        width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--border-color)',
                        cursor: 'pointer', fontSize: 11, fontWeight: 600,
                        background: eventDraft.recurrenceDays.includes(idx) ? 'var(--color-primary)' : 'transparent',
                        color: eventDraft.recurrenceDays.includes(idx) ? 'white' : 'var(--text-secondary)',
                      }}>
                      {day.charAt(0)}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Termina em:</span>
                  <input type="date" className="form-input" style={{ flex: 1 }} value={eventDraft.recurrenceEndsAt}
                    onChange={e => setEventDraft(d => ({ ...d, recurrenceEndsAt: e.target.value }))}/>
                </div>
              </div>
            )}
          </div>

          {/* Reminders */}
          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label className="form-label" style={{ margin: 0 }}><Bell size={12} style={{ marginRight: 4 }}/>Lembretes</label>
              <button type="button" onClick={addReminder}
                style={{ fontSize: 12, color: 'var(--color-primary-light)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                + Adicionar
              </button>
            </div>
            {eventDraft.reminders.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <select className="form-input" style={{ flex: 2 }} value={r.minutesBefore}
                  onChange={e => updateReminder(i, { minutesBefore: Number(e.target.value) })}>
                  {REMINDER_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <select className="form-input" style={{ flex: 1 }} value={r.method}
                  onChange={e => updateReminder(i, { method: e.target.value })}>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email</option>
                </select>
                <button type="button" onClick={() => removeReminder(i)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}><X size={16}/></button>
              </div>
            ))}
            {!currentUser?.phone && eventDraft.reminders.some(r => r.method === 'WHATSAPP') && (
              <p style={{ fontSize: 12, color: 'var(--color-warning)', marginTop: 4 }}>
                ⚠️ Adicione seu WhatsApp no perfil para receber lembretes.
              </p>
            )}
          </div>
        </div>

        <div className="event-modal-footer">
          {eventDraft.id && (
            <button type="button" onClick={() => handleDeleteEvent(eventDraft.id!)}
              style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              Excluir evento
            </button>
          )}
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '8px 20px' }} onClick={() => setEventModalOpen(false)}>Cancelar</button>
            <button type="button" className="btn-primary" style={{ width: 'auto', padding: '8px 20px' }} onClick={handleSaveEvent} disabled={draftSaving}>
              {draftSaving ? <RotateCw size={14} className="animate-spin"/> : <Check size={14}/>}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Upgrade Modal ─────────────────────────────────────────────────────────
  const upgradeModal = upgradeModalOpen && (
    <div className="event-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setUpgradeModalOpen(false); }}>
      <div className="event-modal" style={{ maxWidth: 480 }}>
        <div className="event-modal-header">
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={18} style={{ color: '#f59e0b' }}/> Plano Estudante
          </h3>
          <button onClick={() => setUpgradeModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20}/></button>
        </div>
        <div className="event-modal-body">
          <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
            <div style={{ fontSize: 48, fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--color-primary-light)', lineHeight: 1 }}>
              R$ 19<span style={{ fontSize: 18, fontWeight: 400 }}>/mês</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>PIX · Boleto · Cartão de Crédito</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '🤖', text: 'Geração ilimitada de flashcards com IA' },
              { icon: '📝', text: 'Quiz gerado por IA em 3 dificuldades' },
              { icon: '💡', text: 'Insights inteligentes automáticos' },
              { icon: '📱', text: 'Lembretes via WhatsApp (EvoAPI)' },
              { icon: '📄', text: 'Upload de documentos PDF e imagens' },
              { icon: '🗓️', text: 'Calendário com recorrência e alertas' },
              { icon: '🍅', text: 'Pomodoro + todos os recursos básicos' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="event-modal-footer" style={{ flexDirection: 'column', gap: 12 }}>
          <button className="btn-primary" style={{ width: '100%', padding: '14px' }} onClick={handleCheckout} disabled={checkoutLoading}>
            {checkoutLoading ? <><RotateCw size={16} className="animate-spin"/> Aguarde...</> : <><CreditCard size={16}/> Assinar agora — R$ 19/mês</>}
          </button>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
            Cancele quando quiser. Sem multas ou fidelidade.
          </p>
        </div>
      </div>
    </div>
  );

  // ── Main layout ────────────────────────────────────────────────────────────
  return (
    <div className="app-container">
      {eventModal}
      {upgradeModal}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-icon"><Brain size={18}/></div>
          <div className="logo-text">SAAFO HUB</div>
        </div>

        {/* Study Spaces selector */}
        <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingLeft: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Área de Estudo</span>
            <button onClick={() => setShowSpaceForm(f => !f)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title="Nova área">
              <Plus size={14}/>
            </button>
          </div>

          {showSpaceForm && (
            <form onSubmit={handleCreateSpace} style={{ padding: '8px', background: 'var(--bg-deep)', borderRadius: 8, marginBottom: 8 }}>
              <input type="text" className="form-input" style={{ marginBottom: 6, fontSize: 12, padding: '6px 10px' }}
                placeholder="Nome da área" value={newSpaceName} onChange={e => setNewSpaceName(e.target.value)} autoFocus/>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input type="text" className="form-input" style={{ flex: 1, fontSize: 12, padding: '6px 10px' }}
                  placeholder="🎯" value={newSpaceIcon} onChange={e => setNewSpaceIcon(e.target.value)} maxLength={4}/>
                <input type="color" style={{ width: 34, height: 34, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent' }}
                  value={newSpaceColor} onChange={e => setNewSpaceColor(e.target.value)}/>
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '6px', fontSize: 12 }}>Criar área</button>
            </form>
          )}

          <button
            onClick={() => setActiveSpaceId(null)}
            style={{
              width: '100%', textAlign: 'left', padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
              background: !activeSpaceId ? 'rgba(124,58,237,0.1)' : 'transparent',
              color: !activeSpaceId ? 'var(--color-primary-light)' : 'var(--text-secondary)',
              fontWeight: !activeSpaceId ? 600 : 400,
            }}>
            🌐 Todas as Áreas
          </button>

          {spaces.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setActiveSpaceId(s.id === activeSpaceId ? null : s.id)}
                style={{
                  flex: 1, textAlign: 'left', padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
                  background: activeSpaceId === s.id ? `${s.color ?? '#8b5cf6'}22` : 'transparent',
                  color: activeSpaceId === s.id ? (s.color ?? 'var(--color-primary-light)') : 'var(--text-secondary)',
                  fontWeight: activeSpaceId === s.id ? 600 : 400,
                  borderLeft: activeSpaceId === s.id ? `3px solid ${s.color ?? 'var(--color-primary)'}` : '3px solid transparent',
                }}>
                {s.icon ?? '📚'} {s.name}
              </button>
              <button onClick={() => handleDeleteSpace(s.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.5, padding: 4 }}>
                <X size={12}/>
              </button>
            </div>
          ))}
        </div>

        {/* Nav */}
        <ul className="nav-list">
          {([
            { view: 'dashboard', icon: <TrendingUp size={18}/>,    label: 'Desempenho' },
            { view: 'subjects',  icon: <Layers size={18}/>,        label: 'Matérias' },
            { view: 'calendar',  icon: <Calendar size={18}/>,      label: 'Calendário' },
            { view: 'pomodoro',  icon: <Timer size={18}/>,         label: 'Pomodoro' },
            { view: 'quiz',      icon: <GraduationCap size={18}/>, label: 'Quiz por IA' },
            { view: 'ai',        icon: <Sparkles size={18}/>,      label: 'Gerar por IA' },
            { view: 'profile',   icon: <UserIcon size={18}/>,      label: 'Meu Perfil' },
          ] as const).map(({ view, icon, label }) => (
            <li key={view}>
              <button className={`nav-item-btn ${currentView === view ? 'active' : ''}`} onClick={() => setCurrentView(view)}>
                {icon} {label}
              </button>
            </li>
          ))}
        </ul>

        {currentUser && (
          <div className="user-profile-summary">
            <div className="avatar">{currentUser.name.charAt(0).toUpperCase()}</div>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.email}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}>
                {theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}
              </button>
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }} title="Sair">
                <LogOut size={16}/>
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 700, margin: 0 }}>
              {currentView === 'dashboard' && 'Dashboard de Desempenho'}
              {currentView === 'subjects'  && 'Estrutura de Estudos'}
              {currentView === 'calendar'  && 'Calendário e Agenda'}
              {currentView === 'pomodoro'  && 'Pomodoro Timer'}
              {currentView === 'quiz'      && 'Quiz por Inteligência Artificial'}
              {currentView === 'ai'        && 'Geração Inteligente de Cards'}
              {currentView === 'profile'   && 'Perfil do Estudante'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
              {currentView === 'dashboard' && 'Acompanhe estatísticas e revisões pendentes'}
              {currentView === 'subjects'  && 'Navegue por Matérias, Tópicos e Flashcards'}
              {currentView === 'calendar'  && 'Organize provas, entregas e blocos de estudo'}
              {currentView === 'pomodoro'  && 'Sessões de foco com a técnica Pomodoro (25/5/15)'}
              {currentView === 'quiz'      && 'Gere questões de múltipla escolha dos seus flashcards com IA'}
              {currentView === 'ai'        && 'Transforme resumos em flashcards com Gemini 2.5 Flash'}
              {currentView === 'profile'   && 'Dados pessoais, instituição e WhatsApp'}
            </p>
          </div>
          {currentView !== 'calendar' && currentView !== 'pomodoro' && currentView !== 'quiz' && (
            <button onClick={startStudySession} className="btn-primary" style={{ width: 'auto', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <RotateCw size={16}/> Estudar Pendentes
            </button>
          )}
          {currentView === 'calendar' && (
            <button onClick={() => openCreateEvent()} className="btn-primary" style={{ width: 'auto', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={16}/> Novo Evento
            </button>
          )}
        </div>

        {/* Plan banner */}
        {planStatus && !planStatus.isActive && (
          <div style={{ marginBottom: 24, padding: '14px 18px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldAlert size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }}/>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-danger)' }}>Período gratuito encerrado</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Assine o Plano Estudante para continuar usando a IA, insights e WhatsApp.</div>
              </div>
            </div>
            <button className="btn-primary" style={{ width: 'auto', padding: '8px 20px', flexShrink: 0, background: 'var(--grad-danger)' }} onClick={() => setUpgradeModalOpen(true)}>
              <Star size={14}/> Assinar
            </button>
          </div>
        )}
        {planStatus?.plan === 'FREE_TRIAL' && planStatus.isActive && planStatus.trialDaysLeft <= 3 && (
          <div style={{ marginBottom: 24, padding: '12px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }}/>
              <span style={{ fontSize: 13, color: 'var(--color-warning)' }}>
                <strong>{planStatus.trialDaysLeft} dia{planStatus.trialDaysLeft !== 1 ? 's' : ''}</strong> restante{planStatus.trialDaysLeft !== 1 ? 's' : ''} do seu período gratuito.
              </span>
            </div>
            <button style={{ background: 'none', border: '1px solid var(--color-warning)', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: 'var(--color-warning)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setUpgradeModalOpen(true)}>
              Ver planos
            </button>
          </div>
        )}

        {errorMessage && (
          <div style={{ marginBottom: 24, padding: 14, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--color-danger)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={16}/><span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div style={{ marginBottom: 24, padding: 14, borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--color-success)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckCircle size={16}/><span>{successMessage}</span>
          </div>
        )}

        {/* ── DASHBOARD ─────────────────────────────────────────────────────── */}
        {currentView === 'dashboard' && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon"><BookOpen size={24}/></div>
                <div><div className="stat-value">{cards.length}</div><div className="stat-label">Total de Flashcards</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><RotateCw size={24}/></div>
                <div><div className="stat-value">{cards.filter(c => new Date(c.nextReview) <= new Date()).length}</div><div className="stat-label">Pendentes Hoje</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><Flame size={24} style={{ color: 'var(--color-warning)' }}/></div>
                <div><div className="stat-value">{metrics?.dailyActivity.length ?? 0} dias</div><div className="stat-label">Dias com Atividade</div></div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><CheckCircle size={24} style={{ color: 'var(--color-success)' }}/></div>
                <div><div className="stat-value">{metrics ? `${(metrics.retentionRate ?? 0).toFixed(1)}%` : '—'}</div><div className="stat-label">Taxa de Retenção</div></div>
              </div>
            </div>

            {/* Insights card */}
            <div className="glass-card" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={18} style={{ color: '#f59e0b' }}/> Análise Inteligente
                </h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {planStatus?.isActive && (
                    <button onClick={handleRefreshInsights} disabled={insightsLoading}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                      <RefreshCw size={13} className={insightsLoading ? 'animate-spin' : ''}/> Atualizar
                    </button>
                  )}
                  {!planStatus?.isActive && (
                    <button onClick={() => setUpgradeModalOpen(true)}
                      style={{ background: 'var(--grad-primary)', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 12, color: 'white', cursor: 'pointer', fontWeight: 600 }}>
                      <Star size={12}/> Assinar
                    </button>
                  )}
                </div>
              </div>

              {!planStatus?.isActive && (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                  <Zap size={32} style={{ marginBottom: 8, opacity: 0.4 }}/>
                  <p style={{ fontSize: 14, marginBottom: 4 }}>Insights disponíveis no Plano Estudante</p>
                  <p style={{ fontSize: 12 }}>A IA analisa seu histórico e gera recomendações personalizadas.</p>
                </div>
              )}

              {planStatus?.isActive && insightsLoading && !insights.length && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0', color: 'var(--text-secondary)' }}>
                  <RotateCw size={18} className="animate-spin"/>
                  <span style={{ fontSize: 14 }}>Gemini está analisando seu histórico de estudos...</span>
                </div>
              )}

              {planStatus?.isActive && !insightsLoading && !insights.length && (
                <p style={{ fontSize: 14, color: 'var(--text-muted)', padding: '8px 0' }}>
                  Nenhum insight ainda. Faça algumas revisões e volte amanhã!
                </p>
              )}

              {insights.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {insights.map((ins, i) => {
                    const priorityColor = ins.priority === 'high' ? 'var(--color-danger)' : ins.priority === 'medium' ? 'var(--color-warning)' : 'var(--color-success)';
                    const typeIcon: Record<string, string> = {
                      streak: '🔥', weak_subject: '⚠️', exam_alert: '📅',
                      overdue_cards: '😴', productivity_pattern: '⏰', focus_concentration: '🎯',
                    };
                    return (
                      <div key={i} style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--bg-surface)', border: `1px solid var(--border-color)`, borderLeft: `4px solid ${priorityColor}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 16 }}>{typeIcon[ins.type] ?? '💡'}</span>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{ins.title}</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>{ins.message}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid-2">
              <div className="glass-card">
                <h3 className="card-title" style={{ marginBottom: 16 }}>Atividade Recente</h3>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div className="heatmap-container">
                    {(metrics?.dailyActivity ?? []).slice(-28).map((day, i) => {
                      const lv = day.count === 0 ? '' : day.count < 3 ? 'level-1' : day.count < 8 ? 'level-2' : day.count < 15 ? 'level-3' : 'level-4';
                      return <div key={i} className={`heatmap-day ${lv}`} title={`${day.date}: ${day.count} revisões`}/>;
                    })}
                    {Array.from({ length: Math.max(0, 28 - (metrics?.dailyActivity.length ?? 0)) }).map((_, i) => <div key={`e${i}`} className="heatmap-day"/>)}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Frequência de estudos (últimos 28 dias)</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{metrics ? `${metrics.totalReviewed} revisões totais` : 'Sem dados'}</p>
                  </div>
                </div>
              </div>

              <div className="glass-card">
                <h3 className="card-title" style={{ marginBottom: 16 }}>Próximos Eventos</h3>
                {(() => {
                  const upcoming = calendarEvents
                    .filter(e => new Date(e.startAt) >= new Date() || e.recurrenceDays.length > 0)
                    .slice(0, 4);
                  if (!upcoming.length) return (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>Nenhum evento próximo.</p>
                      <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={() => setCurrentView('calendar')}>
                        <Calendar size={14}/> Abrir Calendário
                      </button>
                    </div>
                  );
                  return upcoming.map(ev => {
                    const meta = getEventMeta(ev.type);
                    const d = new Date(ev.startAt);
                    return (
                      <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                        onClick={() => { setCurrentView('calendar'); openEditEvent(ev); }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0 }}/>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} {ev.allDay ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            {ev.recurrenceDays.length > 0 && ' · Recorrente'}
                          </div>
                        </div>
                        <span style={{ fontSize: 10, color: meta.color, fontWeight: 600, flexShrink: 0 }}>{meta.emoji}</span>
                      </div>
                    );
                  });
                })()}
                {calendarEvents.length > 0 && (
                  <button className="btn-secondary" style={{ width: '100%', marginTop: 12, padding: '8px', fontSize: 13 }} onClick={() => setCurrentView('calendar')}>
                    Ver todos
                  </button>
                )}
              </div>
            </div>

            <div className="glass-card">
              <div className="card-header-flex"><h3 className="card-title">Desempenho por Matéria</h3></div>
              <div className="custom-table-wrapper">
                <table className="custom-table">
                  <thead><tr><th>Matéria</th><th>Cards</th><th>Revisados</th><th>Média</th><th>Retenção</th></tr></thead>
                  <tbody>
                    {metrics?.subjectsPerformance.map((s, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{s.subjectName}</td>
                        <td>{s.totalCards}</td><td>{s.reviewedCards}</td>
                        <td><span className="badge badge-cyan">★ {(s.averageRating ?? 0).toFixed(1)}</span></td>
                        <td><strong style={{ color: 'var(--color-success)' }}>{(s.retentionRate ?? 0).toFixed(1)}%</strong></td>
                      </tr>
                    ))}
                    {(!metrics || !metrics.subjectsPerformance.length) && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma revisão registrada.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── SUBJECTS ──────────────────────────────────────────────────────── */}
        {currentView === 'subjects' && (
          <div className="grid-2">
            <div>
              <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
                <h3 className="card-title" style={{ marginBottom: 16 }}>Nova Matéria {activeSpaceId && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--color-primary-light)' }}>→ {spaces.find(s => s.id === activeSpaceId)?.name}</span>}</h3>
                <form onSubmit={handleCreateSubject} style={{ display: 'flex', gap: 12 }}>
                  <input type="text" className="form-input" placeholder="Nome da matéria" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)}/>
                  <input type="color" style={{ width: 44, height: 44, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent' }} value={newSubjectColor} onChange={e => setNewSubjectColor(e.target.value)}/>
                  <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 20px' }}><Plus size={18}/></button>
                </form>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {visibleSubjects.map(sub => (
                  <div key={sub.id} className="subject-card"
                    style={{ '--subject-color': sub.color, border: selectedSubject?.id === sub.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)', background: selectedSubject?.id === sub.id ? 'rgba(139,92,246,0.05)' : 'var(--bg-card)' } as React.CSSProperties}
                    onClick={() => { setSelectedSubject(sub); setSelectedTopic(null); }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div className="subject-name">{sub.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          {topics.filter(t => t.subjectId === sub.id).length} tópicos
                          {sub.spaceId && spaces.find(s => s.id === sub.spaceId) && (
                            <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>· {spaces.find(s => s.id === sub.spaceId)?.name}</span>
                          )}
                        </div>
                      </div>
                      <button onClick={e => handleDeleteSubject(sub.id, e)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
                {!visibleSubjects.length && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '24px 0' }}>Nenhuma matéria{activeSpaceId ? ' nesta área' : ''} ainda.</p>
                )}
              </div>
            </div>

            <div>
              {selectedSubject ? (
                <div className="glass-card" style={{ padding: 24 }}>
                  <h3 className="card-title" style={{ marginBottom: 20 }}>Tópicos — {selectedSubject.name}</h3>
                  <form onSubmit={handleCreateTopic} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                    <input type="text" className="form-input" placeholder="Nome do tópico" value={newTopicName} onChange={e => setNewTopicName(e.target.value)}/>
                    <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0 20px' }}><Plus size={18}/></button>
                  </form>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                    {topics.filter(t => t.subjectId === selectedSubject.id).map(t => (
                      <span key={t.id} className="badge" style={{ padding: '8px 14px', cursor: 'pointer', border: selectedTopic?.id === t.id ? '1px solid var(--color-primary)' : '1px solid var(--border-color)', background: selectedTopic?.id === t.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.03)', color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}
                        onClick={() => setSelectedTopic(t)}>
                        {t.name}
                        <button onClick={e => { e.stopPropagation(); handleDeleteTopic(t.id); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>×</button>
                      </span>
                    ))}
                  </div>

                  {selectedTopic ? (
                    <div>
                      <h4 style={{ marginBottom: 12, fontSize: 16 }}>Cards — {selectedTopic.name}</h4>
                      <form onSubmit={handleCreateCard} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24, border: '1px dashed var(--border-color)', padding: 16, borderRadius: 8 }}>
                        <input type="text" className="form-input" placeholder="Frente (Pergunta)" value={newCardFront} onChange={e => setNewCardFront(e.target.value)}/>
                        <input type="text" className="form-input" placeholder="Verso (Resposta)" value={newCardBack} onChange={e => setNewCardBack(e.target.value)}/>
                        <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-end', width: 'auto', padding: '8px 16px' }}>Salvar Card</button>
                      </form>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {cards.filter(c => c.topicId === selectedTopic.id).map(c => (
                          <div key={c.id} style={{ padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flexGrow: 1, minWidth: 0, paddingRight: 16 }}>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.front}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{c.back}</div>
                            </div>
                            <button onClick={() => handleDeleteCard(c.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Trash2 size={14}/></button>
                          </div>
                        ))}
                        {!cards.filter(c => c.topicId === selectedTopic.id).length && (
                          <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '16px 0' }}>Nenhum card neste tópico.</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Selecione um tópico acima.</p>
                  )}
                </div>
              ) : (
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, color: 'var(--text-muted)' }}>
                  <HelpCircle size={32} style={{ marginBottom: 12 }}/>
                  Selecione uma matéria ao lado
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CALENDAR ──────────────────────────────────────────────────────── */}
        {currentView === 'calendar' && (() => {
          const year  = calendarMonth.getFullYear();
          const month = calendarMonth.getMonth();
          const days  = getCalendarDays(year, month);
          const today = new Date();

          const eventsForDay = (date: Date) =>
            calendarEvents.filter(ev => eventOccursOn(ev, date));

          if (calendarTab === 'month') {
            return (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => setCalendarMonth(new Date(year, month - 1, 1))} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px 10px' }}><ChevronLeft size={16}/></button>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, margin: 0 }}>{MONTHS_PT[month]} {year}</h2>
                    <button onClick={() => setCalendarMonth(new Date(year, month + 1, 1))} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px 10px' }}><ChevronRight size={16}/></button>
                    <button onClick={() => setCalendarMonth(new Date())} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 10px', fontSize: 12 }}>Hoje</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setCalendarTab('month')} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'var(--color-primary)', color: 'white' }}>Mês</button>
                    <button onClick={() => setCalendarTab('agenda')} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'transparent', color: 'var(--text-secondary)' }}>Agenda</button>
                  </div>
                </div>

                <div className="calendar-grid">
                  {DAYS_PT_SHORT.map(d => (
                    <div key={d} className="calendar-day-header">{d}</div>
                  ))}
                  {days.map((day, i) => {
                    const isToday   = day.toDateString() === today.toDateString();
                    const isCurrent = day.getMonth() === month;
                    const dayEvts   = eventsForDay(day);
                    return (
                      <div key={i} className={`calendar-cell ${isToday ? 'today' : ''} ${!isCurrent ? 'other-month' : ''}`}
                        onClick={() => openCreateEvent(day)}>
                        <div className="calendar-day-number">{day.getDate()}</div>
                        {dayEvts.slice(0, 3).map((ev, ei) => {
                          const meta = getEventMeta(ev.type);
                          return (
                            <div key={ei} className="event-pill"
                              style={{ background: `${meta.color}22`, color: meta.color, borderLeft: `3px solid ${meta.color}` }}
                              onClick={e => { e.stopPropagation(); openEditEvent(ev); }}>
                              {ev.title}
                            </div>
                          );
                        })}
                        {dayEvts.length > 3 && <div style={{ fontSize: 10, color: 'var(--text-muted)', paddingLeft: 4 }}>+{dayEvts.length - 3} mais</div>}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
                  {EVENT_TYPES.map(et => (
                    <div key={et.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: et.color }}/>
                      {et.emoji} {et.label}
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Agenda view
          const now = new Date();
          const agendaDays: { date: Date; events: CalendarEvent[] }[] = [];
          for (let i = 0; i < 30; i++) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
            const evts = eventsForDay(d);
            if (evts.length) agendaDays.push({ date: d, events: evts });
          }

          return (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, margin: 0 }}>Próximos 30 dias</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setCalendarTab('month')} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'transparent', color: 'var(--text-secondary)' }}>Mês</button>
                  <button onClick={() => setCalendarTab('agenda')} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'var(--color-primary)', color: 'white' }}>Agenda</button>
                </div>
              </div>

              {!agendaDays.length ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '48px 0' }}>
                  <Calendar size={40} style={{ color: 'var(--text-muted)', marginBottom: 16 }}/>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Nenhum evento nos próximos 30 dias.</p>
                  <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }} onClick={() => openCreateEvent()}><Plus size={16}/> Criar evento</button>
                </div>
              ) : agendaDays.map(({ date, events }) => (
                <div key={date.toDateString()} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: date.toDateString() === today.toDateString() ? 'var(--color-primary)' : 'var(--bg-surface)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{date.getDate()}</div>
                      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.7 }}>{DAYS_PT_SHORT[date.getDay()]}</div>
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{MONTHS_PT[date.getMonth()]}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 52 }}>
                    {events.map(ev => {
                      const meta = getEventMeta(ev.type);
                      const subj = subjects.find(s => s.id === ev.subjectId);
                      return (
                        <div key={ev.id} onClick={() => openEditEvent(ev)}
                          style={{ padding: '12px 16px', background: 'var(--bg-surface)', border: `1px solid var(--border-color)`, borderLeft: `4px solid ${meta.color}`, borderRadius: '0 8px 8px 0', cursor: 'pointer', transition: 'var(--transition)' }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = meta.color)}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{meta.emoji} {ev.title}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Clock size={10}/> {formatEventTime(ev)}
                                {ev.recurrenceDays.length > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Repeat size={10}/> recorrente</span>}
                                {subj && <span>· {subj.name}</span>}
                              </div>
                            </div>
                            <span style={{ fontSize: 10, color: meta.color, fontWeight: 700, background: `${meta.color}22`, padding: '2px 8px', borderRadius: 10 }}>{meta.label}</span>
                          </div>
                          {ev.notes && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{ev.notes}</p>}
                          {ev.reminders.filter(r => !r.sent).length > 0 && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Bell size={10}/> {ev.reminders.filter(r => !r.sent).length} lembrete(s) ativo(s)
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── AI ────────────────────────────────────────────────────────────── */}
        {currentView === 'ai' && (
          <div>
            {/* Header card with topic + theme */}
            <div className="glass-card" style={{ marginBottom: 20 }}>
              <h3 className="card-title" style={{ marginBottom: 4 }}>Geração de Flashcards com IA</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                Powered by Gemini 2.5 Flash — aceita texto, PDF, imagens e arquivos .txt
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Tópico de destino *</label>
                  <select className="form-input" value={aiTopicId} onChange={e => setAiTopicId(e.target.value)} required>
                    <option value="">Selecione o tópico...</option>
                    {visibleTopics.map(t => (
                      <option key={t.id} value={t.id}>{subjects.find(s => s.id === t.subjectId)?.name} › {t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Tema específico (opcional)</label>
                  <input type="text" className="form-input" value={aiTheme}
                    onChange={e => setAiTheme(e.target.value)}
                    placeholder="Ex: Artigo 5º da CF, Osmose celular…"
                    maxLength={200}/>
                </div>
              </div>
              {aiTheme && (
                <p style={{ fontSize: 12, color: 'var(--color-primary-light)', marginTop: 6 }}>
                  A IA vai focar em: "{aiTheme}"
                </p>
              )}
            </div>

            {/* Mode tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
              {[
                { value: 'text', label: 'Texto Livre', icon: <Type size={15}/> },
                { value: 'file', label: 'Documento / Imagem', icon: <Upload size={15}/> },
              ].map(tab => (
                <button key={tab.value} type="button"
                  onClick={() => { setAiTab(tab.value as 'text'|'file'); setAiResultCount(null); }}
                  style={{
                    flex: 1, padding: '12px 16px', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    fontSize: 14, fontWeight: 600,
                    background: aiTab === tab.value ? 'var(--color-primary)' : 'transparent',
                    color: aiTab === tab.value ? 'white' : 'var(--text-secondary)',
                    transition: 'var(--transition)',
                  }}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Text mode */}
            {aiTab === 'text' && (
              <div className="glass-card">
                <form onSubmit={handleAiGenerateText}>
                  <div className="form-group">
                    <label className="form-label">Conteúdo de Estudo</label>
                    <textarea className="form-input" rows={10} style={{ resize: 'vertical', fontFamily: 'var(--font-sans)' }}
                      value={aiText} onChange={e => setAiText(e.target.value)}
                      placeholder="Cole aqui seu resumo, anotações de aula, transcrição, ou qualquer texto de estudo.&#10;&#10;A IA vai extrair os conceitos mais importantes e transformar em flashcards prontos para revisão."
                      required/>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{aiText.length.toLocaleString()} caracteres</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '12px 28px' }} disabled={isGeneratingAi || !aiTopicId || !aiText.trim()}>
                      {isGeneratingAi
                        ? <><RotateCw size={16} className="animate-spin"/> Analisando com Gemini...</>
                        : <><Sparkles size={16}/> Gerar Flashcards</>}
                    </button>
                    {aiText && <button type="button" onClick={resetAiForm} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>Limpar</button>}
                  </div>
                </form>
              </div>
            )}

            {/* File mode */}
            {aiTab === 'file' && (
              <div className="glass-card">
                <form onSubmit={handleAiGenerateFile}>
                  <div className="form-group">
                    <label className="form-label">Arquivo (PDF, Imagem ou .txt)</label>

                    {/* Drag & drop area */}
                    <div
                      className={`ai-dropzone ${aiDragOver ? 'dragover' : ''} ${aiFile ? 'has-file' : ''}`}
                      onDragOver={e => { e.preventDefault(); setAiDragOver(true); }}
                      onDragLeave={() => setAiDragOver(false)}
                      onDrop={e => {
                        e.preventDefault(); setAiDragOver(false);
                        const f = e.dataTransfer.files[0];
                        if (f) setAiFile(f);
                      }}
                      onClick={() => document.getElementById('ai-file-input')?.click()}
                    >
                      {aiFile ? (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ marginBottom: 8 }}>
                            {aiFile.type.startsWith('image/') ? <ImageIcon size={32} style={{ color: 'var(--color-primary-light)' }}/> : <FileText size={32} style={{ color: 'var(--color-primary-light)' }}/>}
                          </div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{aiFile.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                            {(aiFile.size / 1024 / 1024).toFixed(2)} MB · {aiFile.type}
                          </div>
                          <button type="button" onClick={e => { e.stopPropagation(); setAiFile(null); }}
                            style={{ marginTop: 10, background: 'none', border: '1px solid var(--border-color)', borderRadius: 6, padding: '4px 12px', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 12 }}>
                            Remover arquivo
                          </button>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', pointerEvents: 'none' }}>
                          <Upload size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }}/>
                          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Arraste o arquivo aqui</p>
                          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>ou clique para selecionar</p>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>PDF · JPG · PNG · WEBP · TXT — máx. 50 MB</p>
                        </div>
                      )}
                    </div>

                    <input id="ai-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.txt"
                      style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) setAiFile(f); e.target.value = ''; }}/>
                  </div>

                  {/* Image preview */}
                  {aiFile?.type.startsWith('image/') && (
                    <div style={{ marginBottom: 20, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)', maxHeight: 240 }}>
                      <img src={URL.createObjectURL(aiFile)} alt="preview" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', background: 'var(--bg-deep)' }}/>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '12px 28px' }}
                      disabled={isGeneratingAi || !aiFile || !aiTopicId}>
                      {isGeneratingAi
                        ? <><RotateCw size={16} className="animate-spin"/> Processando arquivo...</>
                        : <><Sparkles size={16}/> Gerar Flashcards</>}
                    </button>
                    {aiFile && <button type="button" onClick={resetAiForm} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>Limpar</button>}
                  </div>
                </form>
              </div>
            )}

            {/* Success result */}
            {aiResultCount !== null && (
              <div style={{ marginTop: 16, padding: 20, borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: 16 }}>
                <CheckCircle size={28} style={{ color: 'var(--color-success)', flexShrink: 0 }}/>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-success)' }}>{aiResultCount} flashcards criados!</p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Salvos no tópico selecionado. Acesse{' '}
                    <button
                      onClick={() => setCurrentView('subjects')}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'var(--color-primary-light)',
                        fontWeight: 700,
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: 'inherit',
                      }}
                    >
                      Matérias
                    </button>{' '}
                    para revisar.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── POMODORO ──────────────────────────────────────────────────────── */}
        {currentView === 'pomodoro' && (() => {
          const CIRCUMFERENCE = 2 * Math.PI * 90;
          const totalSecs = pomodoroPhase === 'focus'
            ? pomodoroFocusMin * 60
            : pomodoroPhase === 'short-break'
            ? pomodoroBreakMin * 60
            : pomodoroLongMin * 60;
          const progress  = totalSecs > 0 ? pomodoroSeconds / totalSecs : 0;
          const dashOffset = CIRCUMFERENCE * (1 - progress);
          const phaseColor = pomodoroPhase === 'focus' ? '#7c3aed' : pomodoroPhase === 'short-break' ? '#10b981' : '#0891b2';
          const phaseLabel = pomodoroPhase === 'focus' ? 'Foco' : pomodoroPhase === 'short-break' ? 'Pausa Curta' : 'Pausa Longa';
          const mm = String(Math.floor(pomodoroSeconds / 60)).padStart(2, '0');
          const ss = String(pomodoroSeconds % 60).padStart(2, '0');

          return (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>
              {/* Timer */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 32px' }}>
                {/* Ring */}
                <div style={{ position: 'relative', width: 220, height: 220 }}>
                  <svg width={220} height={220} style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx={110} cy={110} r={90} className="pomodoro-ring-track"/>
                    <circle cx={110} cy={110} r={90} className="pomodoro-ring-progress"
                      stroke={phaseColor}
                      strokeDasharray={CIRCUMFERENCE}
                      strokeDashoffset={dashOffset}/>
                  </svg>
                  <div className="pomodoro-center" style={{ color: phaseColor }}>
                    <div className="pomodoro-time">{mm}:{ss}</div>
                    <div className="pomodoro-phase-label">{phaseLabel}</div>
                  </div>
                </div>

                {/* Round dots */}
                <div className="pomodoro-round-dots" style={{ color: phaseColor }}>
                  {[1,2,3,4].map(r => (
                    <div key={r} className={`pomodoro-dot ${r < pomodoroRound ? 'done' : r === pomodoroRound ? 'active' : ''}`}
                      style={r === pomodoroRound ? { color: phaseColor, background: phaseColor } : {}}/>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  Sessão {pomodoroRound} de 4 · {pomodoroSessions} concluída{pomodoroSessions !== 1 ? 's' : ''}
                </div>

                {/* Controls */}
                <div className="pomodoro-controls">
                  <button className="pomodoro-btn-icon" title="Reiniciar" onClick={resetPomodoro}><RotateCw size={16}/></button>
                  <button className="pomodoro-btn-main" onClick={() => setPomodoroRunning(r => !r)}>
                    {pomodoroRunning ? <Pause size={26}/> : <Play size={26} style={{ marginLeft: 3 }}/>}
                  </button>
                  <button className="pomodoro-btn-icon" title="Pular fase" onClick={skipPomodoroPhase}><SkipForward size={16}/></button>
                </div>

                {/* Phase selector */}
                <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
                  {([
                    { phase: 'focus',       label: 'Foco',         color: '#7c3aed' },
                    { phase: 'short-break', label: 'Pausa',        color: '#10b981' },
                    { phase: 'long-break',  label: 'Pausa Longa',  color: '#0891b2' },
                  ] as const).map(({ phase, label, color }) => (
                    <button key={phase} onClick={() => {
                      setPomodoroRunning(false); setPomodoroPhase(phase);
                      setPomodoroSeconds(phase === 'focus' ? pomodoroFocusMin * 60 : phase === 'short-break' ? pomodoroBreakMin * 60 : pomodoroLongMin * 60);
                    }}
                    style={{
                      padding: '6px 14px', borderRadius: 20, border: `1px solid ${pomodoroPhase === phase ? color : 'var(--border-color)'}`,
                      background: pomodoroPhase === phase ? `${color}22` : 'transparent', color: pomodoroPhase === phase ? color : 'var(--text-secondary)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)',
                    }}>{label}</button>
                  ))}
                </div>

                {/* Settings */}
                <button onClick={() => setPomodoroShowSettings(s => !s)}
                  style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <Settings size={14}/> Configurações
                </button>
                {pomodoroShowSettings && (
                  <div className="pomodoro-settings-panel" style={{ width: '100%', maxWidth: 360, marginTop: 16 }}>
                    {([
                      { label: 'Foco (min)', value: pomodoroFocusMin, setter: setPomodoroFocusMin, min: 5, max: 90 },
                      { label: 'Pausa (min)', value: pomodoroBreakMin, setter: setPomodoroBreakMin, min: 1, max: 30 },
                      { label: 'Pausa Longa', value: pomodoroLongMin, setter: setPomodoroLongMin, min: 5, max: 60 },
                    ]).map(({ label, value, setter, min, max }) => (
                      <div key={label}>
                        <div className="pomodoro-setting-label">{label}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="range" min={min} max={max} value={value}
                            onChange={e => { const v = Number(e.target.value); setter(v); if (!pomodoroRunning) resetPomodoro(); }}
                            style={{ flex: 1 }}/>
                          <span style={{ fontSize: 14, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Info panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Topic selector */}
                <div className="glass-card" style={{ padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estudando</div>
                  <select className="form-input" value={pomodoroTopicId} onChange={e => setPomodoroTopicId(e.target.value)}>
                    <option value="">Sessão livre</option>
                    {visibleTopics.map(t => (
                      <option key={t.id} value={t.id}>{subjects.find(s => s.id === t.subjectId)?.name} › {t.name}</option>
                    ))}
                  </select>
                  {pomodoroTopicId && (
                    <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                      Cards pendentes: <strong style={{ color: 'var(--color-primary-light)' }}>
                        {cards.filter(c => c.topicId === pomodoroTopicId && new Date(c.nextReview) <= new Date()).length}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="glass-card" style={{ padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hoje</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { label: 'Sessões concluídas', value: pomodoroSessions, icon: <CheckCircle size={16} style={{ color: 'var(--color-success)' }}/> },
                      { label: 'Tempo de foco', value: `${pomodoroSessions * pomodoroFocusMin} min`, icon: <Clock size={16} style={{ color: 'var(--color-primary-light)' }}/> },
                      { label: 'Próxima pausa', value: pomodoroPhase === 'focus' ? `em ${mm}:${ss}` : 'Em andamento', icon: <Timer size={16} style={{ color: 'var(--color-warning)' }}/> },
                    ].map(({ label, value, icon }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>{icon} {label}</div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technique info */}
                <div className="glass-card" style={{ padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Técnica Pomodoro</div>
                  {[
                    { icon: '🎯', text: `${pomodoroFocusMin} min de foco total` },
                    { icon: '☕', text: `${pomodoroBreakMin} min de pausa curta` },
                    { icon: '🛋️', text: `${pomodoroLongMin} min após 4 sessões` },
                  ].map(({ icon, text }) => (
                    <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                      <span>{icon}</span> {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── QUIZ ──────────────────────────────────────────────────────────── */}
        {currentView === 'quiz' && (() => {
          const diffColors = { easy: 'var(--color-success)', medium: 'var(--color-warning)', hard: 'var(--color-danger)' };
          const diffLabels = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' };
          const LETTERS = ['A', 'B', 'C', 'D'];

          // Setup screen
          if (!quizQuestions.length && !quizLoading) {
            return (
              <div style={{ maxWidth: 600, margin: '0 auto' }}>
                <div className="glass-card" style={{ padding: 32 }}>
                  <h3 className="card-title" style={{ marginBottom: 4 }}>Configurar Quiz</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>
                    A IA vai gerar questões de múltipla escolha baseadas nos seus flashcards.
                  </p>

                  <div className="form-group">
                    <label className="form-label">Tópico *</label>
                    <select className="form-input" value={quizTopicId} onChange={e => setQuizTopicId(e.target.value)}>
                      <option value="">Selecione um tópico...</option>
                      {visibleTopics.map(t => (
                        <option key={t.id} value={t.id}>{subjects.find(s => s.id === t.subjectId)?.name} › {t.name}</option>
                      ))}
                    </select>
                    {quizTopicId && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {cards.filter(c => c.topicId === quizTopicId).length} flashcards disponíveis (mínimo 3)
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Dificuldade</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {(['easy', 'medium', 'hard'] as const).map(d => (
                        <button key={d} type="button"
                          className={`quiz-difficulty-btn ${quizDifficulty === d ? `active-${d}` : ''}`}
                          onClick={() => setQuizDifficulty(d)}>
                          {d === 'easy' ? '🟢' : d === 'medium' ? '🟡' : '🔴'} {diffLabels[d]}
                        </button>
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                      {quizDifficulty === 'easy' && 'Definições e reconhecimento direto de conceitos.'}
                      {quizDifficulty === 'medium' && 'Aplicação, comparação e relações entre conceitos.'}
                      {quizDifficulty === 'hard' && 'Análise crítica, síntese e casos complexos.'}
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Quantidade de questões: <strong>{quizCount}</strong></label>
                    <input type="range" min={3} max={20} value={quizCount}
                      onChange={e => setQuizCount(Number(e.target.value))} style={{ width: '100%' }}/>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      <span>3</span><span>20</span>
                    </div>
                  </div>

                  <button className="btn-primary" style={{ width: 'auto', padding: '12px 32px' }}
                    onClick={handleStartQuiz}
                    disabled={!quizTopicId || cards.filter(c => c.topicId === quizTopicId).length < 3}>
                    <GraduationCap size={16}/> Gerar Quiz com IA
                  </button>

                  {quizTopicId && cards.filter(c => c.topicId === quizTopicId).length < 3 && (
                    <p style={{ marginTop: 12, fontSize: 13, color: 'var(--color-warning)' }}>
                      ⚠️ Este tópico precisa de pelo menos 3 flashcards para gerar um quiz.
                    </p>
                  )}
                </div>
              </div>
            );
          }

          // Loading
          if (quizLoading) {
            return (
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px', gap: 20 }}>
                <RotateCw size={40} className="animate-spin" style={{ color: 'var(--color-primary-light)' }}/>
                <p style={{ fontWeight: 600, fontSize: 16 }}>Gerando {quizCount} questões com Gemini 2.5 Flash...</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Dificuldade: {diffLabels[quizDifficulty]}</p>
              </div>
            );
          }

          // Finished
          if (quizFinished) {
            const correct = quizAnswers.filter(Boolean).length;
            const pct = Math.round((correct / quizQuestions.length) * 100);
            const scoreColor = pct >= 80 ? 'var(--color-success)' : pct >= 60 ? 'var(--color-warning)' : 'var(--color-danger)';
            return (
              <div style={{ maxWidth: 520, margin: '0 auto' }}>
                <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                  <Trophy size={52} style={{ color: scoreColor, marginBottom: 16 }}/>
                  <div className="quiz-score-ring" style={{ color: scoreColor }}>{pct}%</div>
                  <p style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>
                    {correct} de {quizQuestions.length} questões corretas
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {pct >= 80 ? '🎉 Excelente! Você domina este conteúdo.' : pct >= 60 ? '👍 Bom resultado! Revise os pontos errados.' : '📚 Estude mais e tente novamente.'}
                  </p>

                  {/* Breakdown */}
                  <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
                    {quizQuestions.map((q, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: quizAnswers[i] ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', border: `1px solid ${quizAnswers[i] ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                        {quizAnswers[i] ? <CheckCircle size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }}/> : <X size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }}/>}
                        <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Q{i + 1}: {q.question}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 28, justifyContent: 'center' }}>
                    <button className="btn-secondary" style={{ width: 'auto', padding: '10px 24px' }} onClick={handleQuizRestart}>
                      <RotateCw size={16}/> Novo Quiz
                    </button>
                    <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }} onClick={handleStartQuiz}>
                      <SkipForward size={16}/> Repetir
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          // Quiz in progress
          const q = quizQuestions[quizIndex];
          const progressPct = ((quizIndex + (quizRevealed ? 1 : 0)) / quizQuestions.length) * 100;

          return (
            <div style={{ maxWidth: 680, margin: '0 auto' }}>
              {/* Progress */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Questão {quizIndex + 1} de {quizQuestions.length}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: diffColors[quizDifficulty] }}>{diffLabels[quizDifficulty]}</span>
              </div>
              <div className="quiz-progress-bar">
                <div className="quiz-progress-fill" style={{ width: `${progressPct}%` }}/>
              </div>

              {/* Question card */}
              <div className="glass-card" style={{ padding: 28, marginBottom: 16 }}>
                <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.55, marginBottom: 24 }}>{q.question}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {q.options.map((opt, idx) => {
                    let cls = 'quiz-option';
                    if (quizRevealed) {
                      if (idx === q.correctIndex) cls += ' correct';
                      else if (idx === quizSelected) cls += ' selected-wrong';
                    }
                    return (
                      <button key={idx} className={cls} onClick={() => handleQuizAnswer(idx)} disabled={quizRevealed}>
                        <span className="quiz-option-letter">{LETTERS[idx]}</span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {quizRevealed && (
                  <div className="quiz-explanation">
                    <strong>Explicação:</strong> {q.explanation}
                  </div>
                )}
              </div>

              {/* Next button */}
              {quizRevealed && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 14, color: quizSelected === q.correctIndex ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
                    {quizSelected === q.correctIndex ? '✓ Correto!' : '✗ Incorreto'}
                  </div>
                  <button className="btn-primary" style={{ width: 'auto', padding: '10px 28px' }} onClick={handleQuizNext}>
                    {quizIndex + 1 >= quizQuestions.length ? <><Trophy size={16}/> Ver Resultado</> : <>Próxima <ChevronRight size={16}/></>}
                  </button>
                </div>
              )}

              {/* Score so far */}
              <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
                {quizAnswers.filter(Boolean).length} corretas · {quizAnswers.filter(b => !b).length} erradas
              </div>
            </div>
          );
        })()}

        {/* ── PROFILE ───────────────────────────────────────────────────────── */}
        {currentView === 'profile' && (
          <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Plan status card */}
          {planStatus && (
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 className="card-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CreditCard size={18}/> Plano Atual
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                      background: planStatus.plan === 'STUDENT' ? 'rgba(16,185,129,0.1)' : planStatus.isActive ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                      color: planStatus.plan === 'STUDENT' ? 'var(--color-success)' : planStatus.isActive ? 'var(--color-warning)' : 'var(--color-danger)',
                    }}>
                      {planStatus.plan === 'STUDENT' ? '⭐ Plano Estudante' : planStatus.isActive ? `🕐 Trial — ${planStatus.trialDaysLeft} dias restantes` : '❌ Trial expirado'}
                    </span>
                  </div>
                  {planStatus.plan === 'STUDENT' && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Acesso completo a todos os recursos.</p>}
                  {planStatus.plan === 'FREE_TRIAL' && planStatus.isActive && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                      Acesso completo até {planStatus.trialEndsAt ? new Date(planStatus.trialEndsAt).toLocaleDateString('pt-BR') : '—'}.
                    </p>
                  )}
                </div>
                {planStatus.plan !== 'STUDENT' && (
                  <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => setUpgradeModalOpen(true)}>
                    <Star size={14}/> {planStatus.isActive ? 'Assinar agora' : 'Renovar acesso'}
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="glass-card" style={{ maxWidth: '100%' }}>
            <h3 className="card-title" style={{ marginBottom: 24 }}>Dados da Conta</h3>
            <form onSubmit={handleProfileUpdate}>
              <div className="form-group">
                <label className="form-label">Nome Completo</label>
                <input type="text" className="form-input" value={profileName} onChange={e => setProfileName(e.target.value)} required/>
              </div>
              <div className="form-group">
                <label className="form-label">Apelido (Nickname)</label>
                <input type="text" className="form-input" value={profileNickname} onChange={e => setProfileNickname(e.target.value)} placeholder="Como gostaria de ser chamado"/>
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp (para lembretes via EvoAPI)</label>
                <input type="tel" className="form-input" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="5511999999999 (com código do país)"/>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Formato: 55 + DDD + número. Ex: 5511987654321</p>
              </div>
              <div className="form-group">
                <label className="form-label">Instituição de Ensino</label>
                <div className="autocomplete-container">
                  <div style={{ position: 'relative' }}>
                    <input type="text" className="form-input" style={{ paddingLeft: 40 }} value={profileInstSearch}
                      onChange={e => { setProfileInstSearch(e.target.value); fetchInstitutions(e.target.value); setShowInstDropdown(true); }}
                      onFocus={() => setShowInstDropdown(true)}
                      placeholder={selectedInstitution ? `${selectedInstitution.sigla} - ${selectedInstitution.name}` : 'Digite o nome da escola'}/>
                    <Search size={16} style={{ position: 'absolute', left: 14, top: 15, color: 'var(--text-muted)' }}/>
                  </div>
                  {showInstDropdown && institutions.length > 0 && (
                    <div className="autocomplete-dropdown">
                      {institutions.map(inst => (
                        <div key={inst.id} className="autocomplete-item" onClick={() => { setSelectedInstitution(inst); setProfileInstSearch(`${inst.sigla} - ${inst.name}`); setShowInstDropdown(false); }}>
                          <div className="autocomplete-item-name">{inst.sigla} - {inst.name}</div>
                          <div className="autocomplete-item-meta">{inst.uf} | {inst.domains.join(', ')}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nova Senha (deixe em branco para manter)</label>
                <input type="password" className="form-input" value={profilePassword} onChange={e => setProfilePassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6}/>
              </div>
              <button type="submit" className="btn-primary" style={{ width: 'auto', marginTop: 12 }}>
                <Check size={16}/> Salvar Configurações
              </button>
            </form>
          </div>
          </div>
        )}
      </main>
    </div>
  );
}
