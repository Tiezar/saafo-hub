import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import type { UserWeeklyRoutine } from '../types';
import TimeInput from '../components/TimeInput';
import './Onboarding.css';

// ── Helpers de rotina ─────────────────────────────────────────────────────────
const DAY_START_MIN = 6 * 60;   // 06:00
const DAY_END_MIN   = 23 * 60;  // 23:00
const DAY_WINDOW    = DAY_END_MIN - DAY_START_MIN; // 1020 min



function parseTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}



function getOccupiedMins(day: number, routines: UserWeeklyRoutine[]) {
  let total = 0;
  for (const r of routines) {
    if (!r.days.includes(day)) continue;
    for (const s of r.slots) {
      const start = Math.max(parseTime(s.startTime), DAY_START_MIN);
      const end   = Math.min(parseTime(s.endTime),   DAY_END_MIN);
      if (end > start) total += end - start;
    }
  }
  return total;
}



function fmtMins(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

const DAY_LABELS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const DAY_ORDER   = [1, 2, 3, 4, 5, 6, 0]; // Seg → Dom


interface AreaTemplate {
  id: string;
  name: string;
  type: string;
  banca?: { name: string } | null;
  subjects: {
    id: string;
    name: string;
    color: string;
  }[];
}

interface DiagnosticQuestion {
  id: string;
  subjectName: string;
  topicName: string;
  statement: string;
  options: string[];
}

interface ScheduleItem {
  id: string;
  dayOfWeek: number;
  duration: number;
  priority: number;
  subject: {
    id: string;
    name: string;
    color: string;
  };
  topic?: {
    id: string;
    name: string;
  } | null;
  startTime?: string | null;
}

const AREA_DESCRIPTIONS: Record<string, { desc: string; popular?: boolean }> = {
  'ENEM — Ensino Médio':              { desc: 'Vestibular nacional · 4 grandes áreas + Redação', popular: true },
  'OAB — Exame de Ordem':             { desc: 'Aprovação na OAB · 8 disciplinas jurídicas' },
  'Polícia Civil — Agente / Escrivão': { desc: 'Concurso policial · Direito, Português e mais' },
  'Revalida / Residência Médica':     { desc: 'Medicina · Clínica, Cirurgia, Pediatria e mais' },
};

const INITIAL_VISIBLE = 6;

type FilterType = 'all' | 'VESTIBULAR' | 'CONCURSO';

export default function Onboarding() {
  const { apiCall, token, storeAuth, currentUser, handleLogout, showSuccess, showError, weeklyRoutines, createWeeklyRoutine, deleteWeeklyRoutine } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(() => {
    const s = parseInt(searchParams.get('step') || '1', 10);
    return isNaN(s) ? 1 : s;
  });
  const [loading, setLoading] = useState(false);

  // Step 1: Area Selection
  const [templates, setTemplates] = useState<AreaTemplate[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showAll, setShowAll] = useState(false);
  const [showAIForm, setShowAIForm] = useState(false);
  const [customAreaName, setCustomAreaName] = useState('');


  // Filtered templates based on search + type filter
  const filteredTemplates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return templates.filter(t => {
      const matchesType = activeFilter === 'all' || t.type === activeFilter;
      if (!matchesType) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.banca?.name ?? '').toLowerCase().includes(q) ||
        t.subjects.some(s => s.name.toLowerCase().includes(q))
      );
    });
  }, [templates, searchQuery, activeFilter]);

  const visibleTemplates = showAll ? filteredTemplates : filteredTemplates.slice(0, INITIAL_VISIBLE);
  const hasResults = filteredTemplates.length > 0;

  // Step 2: Routine builder
  const [showRoutineForm, setShowRoutineForm] = useState(false);
  const [routineLabel,    setRoutineLabel]    = useState('');
  const [routineColor,    setRoutineColor]    = useState('#6366f1');
  const [routineDays,     setRoutineDays]     = useState<number[]>([]);
  const [routineSlots,    setRoutineSlots]    = useState([{ startTime: '08:00', endTime: '12:00' }]);
  const [routineSaving,   setRoutineSaving]   = useState(false);

  const toggleRoutineDay = (day: number) =>
    setRoutineDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());

  const handleAddRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineLabel.trim()) { showError('Digite o nome do compromisso.'); return; }
    if (routineDays.length === 0) { showError('Selecione ao menos um dia.'); return; }
    for (const s of routineSlots) {
      if (s.startTime >= s.endTime) { showError(`Horário inválido: ${s.startTime}–${s.endTime}`); return; }
    }
    setRoutineSaving(true);
    try {
      await createWeeklyRoutine({ label: routineLabel.trim(), color: routineColor, days: routineDays, slots: routineSlots });
      setRoutineLabel(''); setRoutineColor('#6366f1'); setRoutineDays([]);
      setRoutineSlots([{ startTime: '08:00', endTime: '12:00' }]);
      setShowRoutineForm(false);
    } catch (err) { showError((err as Error).message); }
    finally { setRoutineSaving(false); }
  };

  // Step 3: Diagnostic Test
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [questionId: string]: number }>({});
  const [submittingDiag, setSubmittingDiag] = useState(false);

  // Step 4: Schedule Customization (cronograma)
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [editingDuration, setEditingDuration] = useState<number>(50);

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const data = (await apiCall('/areas/templates')) as AreaTemplate[];
        setTemplates(data);
      } catch {
        showError('Erro ao carregar opções de estudo.');
      }
    };
    loadTemplates();
  }, [apiCall, showError]);

  // Load schedule items if starting on step 4
  useEffect(() => {
    if (step === 4) {
      const loadSchedule = async () => {
        try {
          const sched = (await apiCall('/areas/schedule')) as { items: ScheduleItem[] };
          setScheduleItems(sched?.items || []);
        } catch {
          showError('Erro ao carregar o cronograma.');
        }
      };
      loadSchedule();
    }
  }, [step, apiCall, showError]);

  // Step 1 → Step 2 (template pré-definido)
  const handleSelectTemplate = async (areaId: string) => {
    setLoading(true);
    try {
      await apiCall('/areas/select', {
        method: 'POST',
        body: JSON.stringify({ areaId }),
      });
      setSelectedAreaId(areaId);
      showSuccess('Foco selecionado com sucesso!');
      setStep(2);
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Step 1 → Step 2 (área customizada via IA)
  const handleCreateCustomArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAreaName.trim()) return;
    setLoading(true);
    try {
      await apiCall('/areas/custom', {
        method: 'POST',
        body: JSON.stringify({ name: customAreaName.trim() }),
      });
      showSuccess('Área personalizada criada com I.A!');
      setStep(2);
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2 -> Step 3 (rotina → nivelamento)
  const handleConfirmRoutine = () => setStep(3);

  // Step 3: load diagnostic questions (no step change)
  const handleStartDiagnostics = async () => {
    setLoading(true);
    try {
      const res = (await apiCall('/areas/diagnostics/start', { method: 'POST' })) as { testId: string; questions: DiagnosticQuestion[] };
      setQuestions(res.questions);
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: skip both nivelamento and cronograma
  const handleSkipDiagnostics = async () => {
    setLoading(true);
    try {
      localStorage.setItem('saafo_skip_diag', '1');
      await apiCall('/areas/schedule/update', { method: 'POST', body: JSON.stringify({ items: [] }) });
      const freshUser = await apiCall('/profile') as import('../types').User;
      if (token) storeAuth(token, freshUser);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: user completed diagnostics but skips cronograma
  const handleSkipSchedule = async () => {
    setLoading(true);
    try {
      localStorage.setItem('saafo_skip_sched', '1');
      await apiCall('/areas/schedule/update', { method: 'POST', body: JSON.stringify({ items: [] }) });
      const freshUser = await apiCall('/profile') as import('../types').User;
      if (token) storeAuth(token, freshUser);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3 -> Step 4
  const handleAnswerSelect = (optionIdx: number) => {
    const currentQ = questions[currentQuestionIdx];
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionIdx,
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx((prev) => prev - 1);
    }
  };

  const handleSubmitDiagnostics = async () => {
    // Check if all answered
    if (Object.keys(selectedAnswers).length < questions.length) {
      showError('Por favor, responda todas as questões do teste de nivelamento.');
      return;
    }

    setSubmittingDiag(true);
    const answersPayload = Object.keys(selectedAnswers).map((qId) => ({
      questionId: qId,
      selectedIdx: selectedAnswers[qId],
    }));

    try {
      const res = (await apiCall('/areas/diagnostics/submit', {
        method: 'POST',
        body: JSON.stringify({ answers: answersPayload }),
      })) as { score: number; correctCount: number; totalQuestions: number };

      showSuccess(`Diagnóstico avaliado! Pontuação: ${res.score}% (${res.correctCount}/${res.totalQuestions} acertos).`);
      localStorage.setItem('saafo_diag_done', '1');

      // Load generated schedule items
      const sched = (await apiCall('/areas/schedule')) as { items: ScheduleItem[] };
      setScheduleItems(sched?.items || []);
      setStep(4);
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setSubmittingDiag(false);
    }
  };

  // Step 4 actions: Customise Schedule Slots
  const handleSaveSlotDuration = async (slotId: string) => {
    // Update local items array
    const updated = scheduleItems.map((item) => {
      if (item.id === slotId) {
        return { ...item, duration: editingDuration };
      }
      return item;
    });

    setScheduleItems(updated);
    setEditingSlotId(null);
  };

  const handleDeleteSlot = (slotId: string) => {
    setScheduleItems(prev => prev.filter(item => item.id !== slotId));
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    try {
      const formattedItems = scheduleItems.map((item) => ({
        dayOfWeek: item.dayOfWeek,
        subjectId: item.subject.id,
        topicId: item.topic?.id || undefined,
        duration: item.duration,
        priority: item.priority,
        startTime: item.startTime || undefined,
      }));

      await apiCall('/areas/schedule/update', {
        method: 'POST',
        body: JSON.stringify({ items: formattedItems }),
      });

      // Refresh currentUser so canAccess() sees onboardingStatus = 'COMPLETED'
      // before the route change — avoids the race condition from a full reload.
      const freshUser = await apiCall('/profile') as import('../types').User;
      if (token) storeAuth(token, freshUser);

      localStorage.setItem('saafo_sched_done', '1');
      showSuccess('Onboarding concluído! Bem-vindo ao SAAFO HUB.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      showError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getDayName = (day: number) => {
    const names = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return names[day];
  };

  return (
    <div className="onboarding-layout">
      {/* NAVBAR */}
      <header className="onboarding-navbar">
        <div className="onboarding-logo">
          <div className="onboarding-logo-icon">S</div>
          SAAFO HUB
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {currentUser?.onboardingStatus === 'COMPLETED' && (
            <button className="onboarding-exit-btn" onClick={() => navigate('/dashboard')}>
              ← Voltar ao app
            </button>
          )}
          <button className="onboarding-logout-btn" onClick={handleLogout}>
            Sair da conta
          </button>
        </div>
      </header>

      <main className="onboarding-container">
        {/* PROGRESS STEPPER */}
        <div className="onboarding-stepper">
          <div className="onboarding-stepper-progress" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
          <div className={`onboarding-step-node ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
            <div className="onboarding-step-circle">1</div>
            <div className="onboarding-step-label">Objetivo</div>
          </div>
          <div className={`onboarding-step-node ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
            <div className="onboarding-step-circle">2</div>
            <div className="onboarding-step-label">Rotina</div>
          </div>
          <div className={`onboarding-step-node ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>
            <div className="onboarding-step-circle">3</div>
            <div className="onboarding-step-label">Nivelamento</div>
          </div>
          <div className={`onboarding-step-node ${step === 4 ? 'active' : step > 4 ? 'completed' : ''}`}>
            <div className="onboarding-step-circle">4</div>
            <div className="onboarding-step-label">Cronograma</div>
          </div>
        </div>

        {/* STEP CARDS */}
        <div className="onboarding-card">
          {currentUser?.onboardingStatus === 'COMPLETED' && (
            <div className="onboarding-info-banner" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '24px',
              fontSize: '13px',
              gap: 16
            }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Você já possui um foco de estudos ativo. Deseja cancelar e voltar ao painel?
              </span>
              <button 
                className="btn-secondary btn-sm" 
                style={{ flexShrink: 0 }} 
                onClick={() => navigate('/dashboard')}
              >
                Voltar ao Painel
              </button>
            </div>
          )}
          {/* STEP 1: SELECT AREA */}
          {step === 1 && (
            <div>
              <h1 className="onboarding-title">Qual é o seu objetivo?</h1>
              <p className="onboarding-subtitle">
                Escolha seu foco de estudos. A grade curricular é gerada automaticamente.
              </p>

              {/* Search */}
              <div className="area-search-wrapper">
                <svg className="area-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  className="area-search-input"
                  placeholder="Buscar por prova, banca ou disciplina..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  disabled={loading}
                />
                {searchQuery && (
                  <button className="area-search-clear" onClick={() => setSearchQuery('')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Filters */}
              <div className="area-filter-bar">
                {([
                  { key: 'all',        label: 'Todos' },
                  { key: 'VESTIBULAR', label: 'Vestibulares' },
                  { key: 'CONCURSO',   label: 'Concursos' },
                ] as { key: FilterType; label: string }[]).map(f => (
                  <button
                    key={f.key}
                    className={`area-filter-pill ${activeFilter === f.key ? 'active' : ''}`}
                    onClick={() => { setActiveFilter(f.key); setShowAll(false); }}
                  >
                    {f.label}
                    <span className="area-filter-count">
                      {f.key === 'all'
                        ? templates.length
                        : templates.filter(t => t.type === f.key).length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Cards grid */}
              {hasResults ? (
                <>
                  <div className="area-grid">
                    {visibleTemplates.map((tpl) => {
                      const meta = AREA_DESCRIPTIONS[tpl.name];
                      const accentColor = tpl.subjects[0]?.color ?? 'var(--color-primary)';
                      const typeLabel = tpl.type === 'VESTIBULAR' ? 'Vestibular'
                        : tpl.type === 'CONCURSO' ? 'Concurso' : 'Personalizado';
                      return (
                        <div
                          key={tpl.id}
                          className={`area-option-card ${selectedAreaId === tpl.id ? 'selected' : ''}`}
                          onClick={() => !loading && handleSelectTemplate(tpl.id)}
                          style={{ cursor: loading ? 'wait' : 'pointer', borderTop: `3px solid ${accentColor}` }}
                        >
                          <div className="area-card-header">
                            <span className={`area-type-badge area-type-${tpl.type.toLowerCase()}`}>{typeLabel}</span>
                            {meta?.popular && <span className="area-popular-badge">Mais popular</span>}
                          </div>
                          <h2 className="area-name">{tpl.name}</h2>
                          {tpl.banca && <p className="area-banca">{tpl.banca.name}</p>}
                          <p className="area-desc">
                            {meta?.desc ?? `${tpl.subjects.length} disciplinas`}
                          </p>
                          <div className="area-subjects-preview">
                            {tpl.subjects.slice(0, 3).map((sub) => (
                              <span key={sub.id} className="area-subject-tag" style={{ borderLeftColor: sub.color }}>
                                {sub.name.length > 26 ? sub.name.slice(0, 25) + '...' : sub.name}
                              </span>
                            ))}
                            {tpl.subjects.length > 3 && (
                              <span className="area-subject-tag area-subject-more">
                                +{tpl.subjects.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {filteredTemplates.length > INITIAL_VISIBLE && !showAll && (
                    <button className="area-show-more-btn" onClick={() => setShowAll(true)}>
                      Ver mais {filteredTemplates.length - INITIAL_VISIBLE} {filteredTemplates.length - INITIAL_VISIBLE === 1 ? 'opção' : 'opções'}
                    </button>
                  )}
                </>
              ) : (
                <div className="area-empty-state">
                  <p className="area-empty-title">Nenhum resultado para "{searchQuery}"</p>
                  <p className="area-empty-hint">Tente um termo diferente ou crie uma área personalizada abaixo.</p>
                </div>
              )}

              {/* AI option — always at bottom, discrete */}
              <div className="area-ai-section">
                {!showAIForm ? (
                  <button className="area-ai-trigger" onClick={() => setShowAIForm(true)}>
                    Não encontrou o que procura? Criar área personalizada com I.A.
                  </button>
                ) : (
                  <div className="area-ai-form-wrapper">
                    <p className="area-ai-label">Descreva o concurso, vestibular ou objetivo — a I.A. monta o currículo completo.</p>
                    <form className="area-ai-form" onSubmit={handleCreateCustomArea}>
                      <input
                        type="text"
                        className="custom-area-input"
                        placeholder="Ex: Concurso Banco do Brasil 2026, FUVEST, IELTS..."
                        value={customAreaName}
                        onChange={e => setCustomAreaName(e.target.value)}
                        disabled={loading}
                        autoFocus
                      />
                      <div className="area-ai-actions">
                        <button type="button" className="btn-secondary" onClick={() => setShowAIForm(false)} disabled={loading}>
                          Cancelar
                        </button>
                        <button type="submit" className="btn-primary" disabled={loading || !customAreaName.trim()}>
                          {loading ? 'Gerando...' : 'Gerar com I.A.'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: ROTINA SEMANAL */}
          {step === 2 && (
            <div>
              <h1 className="onboarding-title">Sua Rotina Semanal</h1>
              <p className="onboarding-subtitle">
                Adicione seus compromissos fixos para mapearmos seus horários livres para estudo.
              </p>

              {/* Timeline visual */}
              <div className="avail-week-grid">
                {DAY_ORDER.map((day) => {
                  const daySlots = weeklyRoutines
                    .filter(r => r.days.includes(day))
                    .flatMap(r => r.slots.map(s => ({ ...s, label: r.label, color: r.color })));
                  const freeMins = Math.max(0, DAY_WINDOW - getOccupiedMins(day, weeklyRoutines));
                  return (
                    <div key={day} className="avail-day-col">
                      <div className="avail-day-label">{DAY_LABELS[day]}</div>
                      <div className="avail-timeline">
                        {daySlots.map((s, i) => {
                          const startMin  = Math.max(parseTime(s.startTime), DAY_START_MIN);
                          const endMin    = Math.min(parseTime(s.endTime),   DAY_END_MIN);
                          if (endMin <= startMin) return null;
                          return (
                            <div key={i} className="avail-block"
                              style={{ top: `${((startMin - DAY_START_MIN) / DAY_WINDOW) * 100}%`, height: `${((endMin - startMin) / DAY_WINDOW) * 100}%`, background: s.color }}
                              title={`${s.label}: ${s.startTime}–${s.endTime}`}
                            />
                          );
                        })}
                      </div>
                      <div className={`avail-free-label ${freeMins >= 120 ? 'good' : freeMins > 0 ? 'tight' : 'none'}`}>
                        {weeklyRoutines.length === 0 ? '—' : freeMins > 0 ? fmtMins(freeMins) : 'Lotado'}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Compromissos adicionados */}
              {weeklyRoutines.length > 0 && (
                <div className="routine-list">
                  {weeklyRoutines.map(r => (
                    <div key={r.id} className="routine-list-item">
                      <span className="routine-list-dot" style={{ background: r.color }} />
                      <span className="routine-list-label">{r.label}</span>
                      <span className="routine-list-meta">
                        {r.days.map(d => DAY_LABELS[d]).join(', ')}
                        {' · '}
                        {r.slots.map(s => `${s.startTime}–${s.endTime}`).join(', ')}
                      </span>
                      <button className="routine-list-delete" onClick={() => deleteWeeklyRoutine(r.id)} title="Remover">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulário inline de novo compromisso */}
              {showRoutineForm ? (
                <form className="routine-form" onSubmit={handleAddRoutine}>
                  <div className="routine-form-row">
                    <input
                      className="routine-form-name"
                      placeholder="Nome do compromisso (ex: Trabalho, Escola)"
                      value={routineLabel}
                      onChange={e => setRoutineLabel(e.target.value)}
                      autoFocus
                    />
                    <input type="color" value={routineColor} onChange={e => setRoutineColor(e.target.value)}
                      className="routine-form-color" title="Cor" />
                  </div>

                  <div className="routine-form-days">
                    {DAY_ORDER.map(d => (
                      <button key={d} type="button"
                        className={`routine-day-pill ${routineDays.includes(d) ? 'active' : ''}`}
                        onClick={() => toggleRoutineDay(d)}
                        style={routineDays.includes(d) ? { background: routineColor, borderColor: routineColor } : {}}
                      >
                        {DAY_LABELS[d].slice(0, 3)}
                      </button>
                    ))}
                  </div>

                  {routineSlots.map((slot, i) => (
                    <div key={i} className="routine-slot-row">
                      <TimeInput value={slot.startTime}
                        onChange={v => setRoutineSlots(prev => prev.map((s, j) => j === i ? { ...s, startTime: v } : s))} />
                      <span className="routine-slot-sep">até</span>
                      <TimeInput value={slot.endTime}
                        onChange={v => setRoutineSlots(prev => prev.map((s, j) => j === i ? { ...s, endTime: v } : s))} />
                      {routineSlots.length > 1 && (
                        <button type="button" className="routine-slot-remove"
                          onClick={() => setRoutineSlots(prev => prev.filter((_, j) => j !== i))}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      )}
                    </div>
                  ))}

                  <button type="button" className="routine-add-slot"
                    onClick={() => setRoutineSlots(prev => [...prev, { startTime: '14:00', endTime: '18:00' }])}>
                    + Outro horário no mesmo dia
                  </button>

                  <div className="routine-form-actions">
                    <button type="button" className="btn-secondary" onClick={() => setShowRoutineForm(false)} disabled={routineSaving}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary" disabled={routineSaving}>
                      {routineSaving ? 'Salvando...' : 'Adicionar'}
                    </button>
                  </div>
                </form>
              ) : (
                <button className="routine-add-trigger" onClick={() => setShowRoutineForm(true)}>
                  + Adicionar compromisso
                </button>
              )}

              {weeklyRoutines.length === 0 && !showRoutineForm && (
                <p className="avail-skip-note">
                  Sem compromissos, o sistema considerará sua agenda completamente livre.
                  Você pode pular esta etapa e configurar depois no perfil.
                </p>
              )}

              <div className="stepper-actions">
                <button className="btn-secondary" onClick={() => setStep(1)} disabled={loading}>
                  Voltar
                </button>
                <button className="btn-primary" onClick={handleConfirmRoutine}>
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: NIVELAMENTO */}
          {step === 3 && (
            <div>
              {submittingDiag ? (
                <div className="diagnosis-loading-overlay">
                  <div className="spinner-ring"></div>
                  <h2>Analisando suas respostas...</h2>
                  <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
                    Nossa inteligência artificial está identificando suas maiores fraquezas acadêmicas para construir a melhor grade horária adaptativa.
                  </p>
                </div>
              ) : loading && questions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div className="spinner-ring" />
                  <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>Preparando o simulado...</p>
                </div>
              ) : questions.length === 0 ? (
                <div>
                  <h1 className="onboarding-title">Teste de Nivelamento</h1>
                  <p className="onboarding-subtitle">
                    Responda algumas questões para calibrarmos seu nível e montar o cronograma mais eficiente para você.
                  </p>
                  <div className="diag-intro-card">
                    <div className="diag-intro-icon">🎯</div>
                    <ul className="diag-intro-list">
                      <li>~10 questões de múltipla escolha</li>
                      <li>Identifica seus pontos fortes e fracos</li>
                      <li>Personaliza seu cronograma de estudos</li>
                    </ul>
                  </div>
                  <div className="stepper-actions">
                    <button className="btn-secondary" onClick={handleSkipDiagnostics} disabled={loading}>
                      Pular por agora
                    </button>
                    <button className="btn-primary" onClick={handleStartDiagnostics} disabled={loading}>
                      {loading ? 'Carregando...' : 'Iniciar simulado'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="exam-header">
                    <span>Questão {currentQuestionIdx + 1} de {questions.length}</span>
                    <div className="exam-progress-bar">
                      <div className="exam-progress-fill" style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }}></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="exam-subject-badge">
                      {questions[currentQuestionIdx].subjectName} › {questions[currentQuestionIdx].topicName}
                    </span>
                    <h2 className="exam-statement">{questions[currentQuestionIdx].statement}</h2>

                    <div className="exam-options-list">
                      {questions[currentQuestionIdx].options.map((opt, optIdx) => {
                        const optionLetters = ['A', 'B', 'C', 'D', 'E'];
                        const isSelected = selectedAnswers[questions[currentQuestionIdx].id] === optIdx;
                        return (
                          <div
                            key={optIdx}
                            className={`exam-option-item ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleAnswerSelect(optIdx)}
                          >
                            <div className="exam-option-circle">{optionLetters[optIdx]}</div>
                            <span>{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="stepper-actions">
                    <button
                      className="btn-secondary"
                      onClick={handlePrevQuestion}
                      disabled={currentQuestionIdx === 0}
                    >
                      Voltar
                    </button>
                    {currentQuestionIdx < questions.length - 1 ? (
                      <button
                        className="btn-primary"
                        onClick={handleNextQuestion}
                        disabled={selectedAnswers[questions[currentQuestionIdx].id] === undefined}
                      >
                        Próxima Questão
                      </button>
                    ) : (
                      <button
                        className="btn-primary"
                        onClick={handleSubmitDiagnostics}
                        disabled={selectedAnswers[questions[currentQuestionIdx].id] === undefined}
                      >
                        Finalizar Diagnóstico
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: SCHEDULE TUNING */}
          {step === 4 && (
            <div>
              <h1 className="onboarding-title">Seu Cronograma Adaptativo</h1>
              <p className="onboarding-subtitle">
                A I.A. gerou sua grade semanal priorizando os tópicos com menor aproveitamento no teste. Personalize como preferir.
              </p>

              <div className="schedule-confirmation-container">
                <div className="schedule-grid-week">
                  {[1, 2, 3, 4, 5].map((day) => {
                    const slots = scheduleItems.filter((s) => s.dayOfWeek === day);
                    return (
                      <div key={day} className="schedule-day-column">
                        <div className="schedule-day-name">{getDayName(day)}</div>
                        <div className="schedule-slots-stack">
                          {slots.length === 0 ? (
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Sem horários de estudos sugeridos para este dia.</p>
                          ) : (
                            slots.map((slot) => (
                              <div
                                key={slot.id}
                                className="schedule-slot-card"
                                style={{ backgroundColor: slot.subject.color || '#4F46E5' }}
                              >
                                <div>
                                  <div style={{ fontWeight: 700 }}>{slot.subject.name}</div>
                                  {slot.topic && (
                                    <div style={{ fontSize: '11px', opacity: 0.9, fontWeight: 500 }}>
                                      {slot.topic.name}
                                    </div>
                                  )}
                                  {slot.startTime && (
                                    <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px', fontWeight: 500 }}>
                                      🕒 {slot.startTime}
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {editingSlotId === slot.id ? (
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <input
                                        type="number"
                                        style={{ width: '50px', padding: '2px 4px', borderRadius: '4px', border: 'none', color: 'black' }}
                                        value={editingDuration}
                                        onChange={(e) => setEditingDuration(Number(e.target.value))}
                                      />
                                      <button
                                        style={{ border: 'none', background: 'green', color: 'white', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                                        onClick={() => handleSaveSlotDuration(slot.id)}
                                      >
                                        ok
                                      </button>
                                    </div>
                                  ) : (
                                    <span
                                      className="schedule-slot-time"
                                      onClick={() => {
                                        setEditingSlotId(slot.id);
                                        setEditingDuration(slot.duration);
                                      }}
                                      style={{ cursor: 'pointer' }}
                                    >
                                      {slot.duration} min
                                    </span>
                                  )}
                                  <button
                                    onClick={() => handleDeleteSlot(slot.id)}
                                    style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                                  >
                                    &times;
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="schedule-summary-box">
                  <h3 className="schedule-summary-title">Resumo do Cronograma</h3>
                  <div className="schedule-summary-row">
                    <span>Carga Semanal:</span>
                    <span className="schedule-summary-val">
                      {scheduleItems.reduce((acc, item) => acc + item.duration, 0) / 60} horas
                    </span>
                  </div>
                  <div className="schedule-summary-row">
                    <span>Matérias no Foco:</span>
                    <span className="schedule-summary-val">
                      {new Set(scheduleItems.map((item) => item.subject.id)).size} disciplinas
                    </span>
                  </div>
                  <div className="schedule-summary-row" style={{ display: 'block', marginTop: '16px' }}>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', margin: 0 }}>
                      * Você poderá arrastar, editar, incluir novos blocos de estudo e configurar o player de cartões na sua aba de matérias a qualquer momento.
                    </p>
                  </div>
                </div>
              </div>

              <div className="stepper-actions" style={{ marginTop: '40px' }}>
                <button className="btn-secondary" onClick={handleSkipSchedule} disabled={loading}>
                  Pular por agora
                </button>
                <button className="btn-primary" onClick={handleCompleteOnboarding} disabled={loading}>
                  Começar a Estudar!
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
