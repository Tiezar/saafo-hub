import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Trophy, RotateCw, CheckCircle, X, SkipForward,
  GraduationCap, PenLine, Trash2, Clock, Star,
  Zap, Target, FileText, Play, Timer, AlertTriangle,
  ListChecks, ChevronDown,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import type { QuizQuestion, ExamRecord } from '../types';
import './ExamSession.css';


// ── Profile definitions ───────────────────────────────────────────────────────

type ProfileId = 'quick' | 'applied' | 'contextual' | 'essay';

const PROFILES = [
  {
    id: 'quick'       as ProfileId,
    name: 'Revisão Rápida',
    desc: 'Questões curtas e diretas — reconhecimento de conceitos',
    icon: <Zap size={22} />,
    color: '#10b981',
    mode: 'multiple' as const,
    tag: 'Rápida',
  },
  {
    id: 'applied'     as ProfileId,
    name: 'Prova Aplicada',
    desc: 'Cenário curto + questão — exige aplicar o conceito',
    icon: <Target size={22} />,
    color: '#3b82f6',
    mode: 'multiple' as const,
    tag: 'Aplicada',
  },
  {
    id: 'contextual'  as ProfileId,
    name: 'Situação-Problema',
    desc: 'Texto-base longo + análise — estilo vestibular/concurso',
    icon: <FileText size={22} />,
    color: '#8b5cf6',
    mode: 'multiple' as const,
    tag: 'Contextual',
  },
  {
    id: 'essay'       as ProfileId,
    name: 'Dissertativo',
    desc: 'Resposta aberta avaliada pela IA com nota e feedback',
    icon: <PenLine size={22} />,
    color: '#f97316',
    mode: 'essay' as const,
    tag: 'Dissertativo',
  },
] as const;

const TIME_OPTIONS: { label: string; value: number | null }[] = [
  { label: '15 min', value: 15  },
  { label: '30 min', value: 30  },
  { label: '45 min', value: 45  },
  { label: '1h',     value: 60  },
  { label: '1h30',   value: 90  },
  { label: '2h',     value: 120 },
  { label: 'Livre',  value: null },
];

const LETTERS = ['A', 'B', 'C', 'D'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return `${h}h${rem > 0 ? String(rem).padStart(2, '0') + 'm' : ''}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function scoreColor(pct: number) {
  if (pct >= 70) return 'var(--color-success)';
  if (pct >= 45) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function scoreMsg(pct: number) {
  if (pct >= 90) return 'Domínio excelente do conteúdo!';
  if (pct >= 70) return 'Bom resultado. Revise os pontos errados.';
  if (pct >= 45) return 'Progresso razoável. Foque nos tópicos mais fracos.';
  return 'Precisa de mais estudo. Revise os flashcards antes de tentar novamente.';
}

// ── Local interfaces ──────────────────────────────────────────────────────────

interface EssayQuestion { question: string; expectedAnswer: string; }
interface EssayEvaluation { score: number; feedback: string; correct: string[]; missing: string[]; }
interface EssayAnswer { userAnswer: string; evaluation: EssayEvaluation | null; }

// ── Main component ────────────────────────────────────────────────────────────

type Screen = 'setup' | 'session' | 'results';

export default function ExamSession() {
  const { apiCall, visibleTopics, subjects, cards, showError } = useApp();

  // ── Screen
  const [screen, setScreen] = useState<Screen>('setup');

  // ── Creation
  const [subjectId,  setSubjectId]  = useState('');
  const [topicIds,   setTopicIds]   = useState<string[]>([]);
  const [profileId,  setProfileId]  = useState<ProfileId>('quick');
  const [count,      setCount]      = useState(10);
  const [creating,   setCreating]   = useState(false);

  // ── History
  const [examHistory,  setExamHistory]  = useState<ExamRecord[]>([]);
  const [histLoading,  setHistLoading]  = useState(false);
  const [startingId,   setStartingId]   = useState<string | null>(null);
  const [chosenLimit,  setChosenLimit]  = useState<number | null>(null);

  // ── Active session
  const [activeRecord,  setActiveRecord]  = useState<ExamRecord | null>(null);
  const [sessionMode,   setSessionMode]   = useState<'multiple' | 'essay'>('multiple');
  const [questions,     setQuestions]     = useState<QuizQuestion[]>([]);
  const [qIdx,          setQIdx]          = useState(0);
  const [selected,      setSelected]      = useState<number | null>(null);
  const [revealed,      setRevealed]      = useState(false);
  const [answers,       setAnswers]       = useState<boolean[]>([]);

  // Essay
  const [essayQs,      setEssayQs]      = useState<EssayQuestion[]>([]);
  const [essayAnswers, setEssayAnswers]  = useState<EssayAnswer[]>([]);
  const [essayIdx,     setEssayIdx]      = useState(0);
  const [essayText,    setEssayText]     = useState('');
  const [evaluating,   setEvaluating]    = useState(false);
  const [currentEval,  setCurrentEval]   = useState<EssayEvaluation | null>(null);

  // ── Timer
  const [timeLeftSecs,  setTimeLeftSecs]  = useState<number | null>(null);
  const [timeLimitSecs, setTimeLimitSecs] = useState<number | null>(null);
  const [startedAt,     setStartedAt]     = useState(0);
  const [resultTaken,   setResultTaken]   = useState(0);
  const deadlineRef = useRef<number | null>(null);
  const timeExpiredRef = useRef(false);

  // ── Derived
  const subjectTopics    = visibleTopics.filter(t => t.subjectId === subjectId);
  const allSelected      = subjectTopics.length > 0 && topicIds.length === subjectTopics.length;
  const totalCards       = topicIds.reduce((s, tid) => s + cards.filter(c => c.topicId === tid).length, 0);
  const profile          = PROFILES.find(p => p.id === profileId)!;
  const isEssay          = profile.mode === 'essay';
  const maxCount         = isEssay ? Math.min(20, Math.max(1, totalCards)) : 40;
  const minCount         = isEssay ? 1 : 3;

  // ── Load history
  useEffect(() => {
    const load = async () => {
      setHistLoading(true);
      try {
        const records = await apiCall('/exams', { method: 'GET' }) as ExamRecord[];
        setExamHistory(records);
      } catch { /* non-critical */ }
      finally { setHistLoading(false); }
    };
    load();
  }, []); // eslint-disable-line

  // ── Timer tick
  useEffect(() => {
    if (screen !== 'session') { deadlineRef.current = null; return; }
    const id = setInterval(() => {
      if (deadlineRef.current === null) return;
      const left = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setTimeLeftSecs(left);
    }, 500);
    return () => clearInterval(id);
  }, [screen]);

  // ── Auto-finish when time hits 0
  useEffect(() => {
    if (timeLeftSecs === 0 && screen === 'session' && deadlineRef.current !== null && !timeExpiredRef.current) {
      timeExpiredRef.current = true;
      finishSession('timeout');
    }
  }, [timeLeftSecs]); // eslint-disable-line

  // ── Save attempt when entering results
  useEffect(() => {
    if (screen !== 'results' || !activeRecord) return;

    let score = 0;
    if (sessionMode === 'multiple') {
      score = questions.length > 0
        ? Math.round(answers.filter(Boolean).length / questions.length * 100) : 0;
    } else {
      const evaled = essayAnswers.filter(a => a.evaluation);
      score = evaled.length
        ? Math.round(evaled.reduce((s, a) => s + (a.evaluation!.score), 0) / evaled.length * 10) : 0;
    }

    apiCall(`/exams/${activeRecord.id}/attempts`, {
      method: 'POST',
      body: JSON.stringify({
        score,
        timeLimit: timeLimitSecs ? Math.round(timeLimitSecs / 60) : null,
        timeTaken: resultTaken,
      }),
    }).then(() => apiCall('/exams', { method: 'GET' }) as Promise<ExamRecord[]>)
      .then(updated => setExamHistory(updated))
      .catch(() => { /* non-critical */ });
  }, [screen]); // eslint-disable-line

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSubjectChange = (sid: string) => {
    setSubjectId(sid); setTopicIds([]);
  };

  const toggleTopic = (tid: string) =>
    setTopicIds(prev => prev.includes(tid) ? prev.filter(x => x !== tid) : [...prev, tid]);

  const toggleAll = () =>
    setTopicIds(allSelected ? [] : subjectTopics.map(t => t.id));

  const createExam = useCallback(async () => {
    if (topicIds.length === 0) return;
    setCreating(true);
    try {
      const subj = subjects.find(s => s.id === subjectId);
      const topicNames = topicIds.map(tid => visibleTopics.find(t => t.id === tid)?.name ?? '').filter(Boolean);
      const scopeLabel = allSelected
        ? `${subj?.name ?? 'Matéria'} — completo`
        : topicNames.length === 1
        ? `${subj?.name ?? ''} › ${topicNames[0]}`
        : `${subj?.name ?? ''} — ${topicNames.length} tópicos`;

      let questionsData: unknown;

      if (!isEssay) {
        questionsData = await apiCall('/ai/quiz', {
          method: 'POST',
          body: JSON.stringify({ topicIds, profileId, count }),
        });
      } else {
        const pool = topicIds.flatMap(tid => cards.filter(c => c.topicId === tid))
          .sort(() => Math.random() - 0.5).slice(0, count);
        questionsData = pool.map(c => ({ question: c.front, expectedAnswer: c.back }));
      }

      const saved = await apiCall('/exams', {
        method: 'POST',
        body: JSON.stringify({
          topicIds,
          topicId: topicIds[0] ?? null,
          topicName: topicNames[0] ?? scopeLabel,
          scopeLabel,
          profileId,
          mode: profile.mode,
          questions: questionsData,
        }),
      }) as ExamRecord;

      setExamHistory(prev => [saved, ...prev]);
    } catch (e) { showError((e as Error).message); }
    finally { setCreating(false); }
  }, [topicIds, profileId, count, subjectId, profile, subjects, visibleTopics, cards, allSelected, isEssay, apiCall, showError]);

  const openStart = (id: string) => {
    setStartingId(startingId === id ? null : id);
    setChosenLimit(null);
  };

  const startSession = useCallback((record: ExamRecord, limitMins: number | null) => {
    const limitSecs = limitMins !== null ? limitMins * 60 : null;
    setTimeLimitSecs(limitSecs);
    setTimeLeftSecs(limitSecs);
    deadlineRef.current = limitSecs !== null ? Date.now() + limitSecs * 1000 : null;
    timeExpiredRef.current = false;
    setStartedAt(Date.now());
    setResultTaken(0);

    setActiveRecord(record);
    const mode = record.mode as 'multiple' | 'essay';
    setSessionMode(mode);
    setQIdx(0); setSelected(null); setRevealed(false); setAnswers([]);
    setEssayIdx(0); setEssayText(''); setCurrentEval(null);

    if (mode === 'multiple') {
      setQuestions(record.questions as QuizQuestion[]);
      setEssayQs([]); setEssayAnswers([]);
    } else {
      const qs = record.questions as EssayQuestion[];
      setEssayQs(qs);
      setEssayAnswers(qs.map(() => ({ userAnswer: '', evaluation: null })));
      setQuestions([]);
    }

    setStartingId(null);
    setScreen('session');
  }, []);

  const mcAnswer = (idx: number) => {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
    setAnswers(prev => [...prev, idx === questions[qIdx].correctIndex]);
  };

  const mcNext = () => {
    if (qIdx + 1 >= questions.length) { finishSession('complete'); return; }
    setQIdx(i => i + 1); setSelected(null); setRevealed(false);
  };

  const handleEvaluate = useCallback(async () => {
    const q = essayQs[essayIdx];
    if (!q) return;
    setEvaluating(true);
    try {
      const ev = await apiCall('/ai/evaluate-essay', {
        method: 'POST',
        body: JSON.stringify({ question: q.question, expectedAnswer: q.expectedAnswer, userAnswer: essayText }),
      }) as EssayEvaluation;
      setCurrentEval(ev);
      setEssayAnswers(prev => prev.map((a, i) => i === essayIdx ? { userAnswer: essayText, evaluation: ev } : a));
    } catch (e) { showError((e as Error).message); }
    finally { setEvaluating(false); }
  }, [essayQs, essayIdx, essayText, apiCall, showError]);

  const essayNext = () => {
    if (essayIdx + 1 >= essayQs.length) { finishSession('complete'); return; }
    setEssayIdx(i => i + 1); setEssayText(''); setCurrentEval(null);
  };

  const finishSession = useCallback((reason: 'complete' | 'timeout') => {
    const taken = startedAt > 0 ? Math.round((Date.now() - startedAt) / 1000) : 0;
    setResultTaken(taken);
    if (reason === 'timeout' && sessionMode === 'multiple') {
      setAnswers(prev => {
        const padded = [...prev];
        while (padded.length < questions.length) padded.push(false);
        return padded;
      });
    }
    deadlineRef.current = null;
    setScreen('results');
  }, [startedAt, sessionMode, questions.length]);

  const resetToSetup = () => {
    setScreen('setup'); setActiveRecord(null);
    setQuestions([]); setEssayQs([]); setEssayAnswers([]); setAnswers([]);
    setTimeLeftSecs(null); setTimeLimitSecs(null); deadlineRef.current = null;
    timeExpiredRef.current = false;
  };

  const deleteRecord = useCallback(async (id: string) => {
    if (!window.confirm('Excluir esta prova do histórico?')) return;
    try {
      await apiCall(`/exams/${id}`, { method: 'DELETE' });
      setExamHistory(prev => prev.filter(r => r.id !== id));
    } catch (e) { showError((e as Error).message); }
  }, [apiCall, showError]);

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN: SETUP
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === 'setup') {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Sessão de Provas</h1>
            <p className="page-subtitle">Crie, salve e realize provas no seu tempo</p>
          </div>
        </div>

        {/* ── Creation form ─────────────────────────────────────────── */}
        <div className="glass-card" style={{ marginBottom: 32, padding: '28px 28px 24px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <GraduationCap size={16} style={{ color: 'var(--color-primary-light)' }} /> Gerar Nova Prova
          </h2>

          {/* Scope */}
          <div className="form-group">
            <label className="form-label">Matéria *</label>
            <select className="form-input" value={subjectId} onChange={e => handleSubjectChange(e.target.value)}>
              <option value="">Selecione uma matéria...</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {subjectId && subjectTopics.length > 0 && (
            <div className="form-group">
              <label className="form-label">
                Tópicos *
                <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>
                  ({topicIds.length} selecionado{topicIds.length !== 1 ? 's' : ''} · {totalCards} cards)
                </span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button type="button"
                  onClick={toggleAll}
                  style={{
                    padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${allSelected ? 'var(--color-primary)' : 'var(--border-color)'}`,
                    background: allSelected ? 'rgba(73,75,214,0.15)' : 'transparent',
                    color: allSelected ? 'var(--color-primary-light)' : 'var(--text-secondary)',
                  }}>
                  Todos
                </button>
                {subjectTopics.map(t => {
                  const sel = topicIds.includes(t.id);
                  return (
                    <button key={t.id} type="button" onClick={() => toggleTopic(t.id)}
                      style={{
                        padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${sel ? 'var(--color-primary)' : 'var(--border-color)'}`,
                        background: sel ? 'rgba(73,75,214,0.12)' : 'transparent',
                        color: sel ? 'var(--color-primary-light)' : 'var(--text-secondary)',
                      }}>
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {subjectId && subjectTopics.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--color-warning)', marginBottom: 16 }}>
              Esta matéria não possui tópicos. Crie tópicos e flashcards primeiro.
            </p>
          )}

          {/* Profile picker */}
          <div className="form-group">
            <label className="form-label">Formato da prova</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {PROFILES.map(p => (
                <button key={p.id} type="button" onClick={() => setProfileId(p.id)}
                  style={{
                    padding: '14px 16px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                    border: `2px solid ${profileId === p.id ? p.color : 'var(--border-color)'}`,
                    background: profileId === p.id ? `${p.color}14` : 'var(--bg-surface)',
                    transition: 'var(--transition)',
                  }}>
                  <div style={{ color: profileId === p.id ? p.color : 'var(--text-muted)', marginBottom: 8 }}>{p.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 3, color: profileId === p.id ? p.color : 'var(--text-primary)' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Count */}
          <div className="form-group">
            <label className="form-label">
              Questões: <strong>{Math.min(count, maxCount)}</strong>
            </label>
            <input type="range" min={minCount} max={maxCount}
              value={Math.min(count, maxCount)}
              onChange={e => setCount(Number(e.target.value))}
              style={{ width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              <span>{minCount}</span>
              <span>{maxCount}</span>
            </div>
          </div>

          {/* Validation hints */}
          {topicIds.length > 0 && !isEssay && totalCards < 3 && (
            <p style={{ fontSize: 13, color: 'var(--color-warning)', marginBottom: 12 }}>
              Adicione pelo menos 3 flashcards nos tópicos selecionados.
            </p>
          )}
          {topicIds.length > 0 && isEssay && totalCards < 1 && (
            <p style={{ fontSize: 13, color: 'var(--color-warning)', marginBottom: 12 }}>
              Adicione flashcards ao tópico selecionado.
            </p>
          )}

          <button className="btn-primary"
            style={{ width: 'auto', padding: '11px 28px' }}
            disabled={creating || topicIds.length === 0 || (!isEssay && totalCards < 3) || (isEssay && totalCards < 1)}
            onClick={createExam}>
            {creating
              ? <><RotateCw size={15} className="animate-spin" /> Gerando com IA...</>
              : <><GraduationCap size={15} /> Gerar Prova</>}
          </button>
          {creating && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              O Gemini 2.5 Flash está gerando as questões. Pode levar até 20 segundos.
            </p>
          )}
        </div>

        {/* ── History ───────────────────────────────────────────────── */}
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={15} style={{ color: 'var(--color-primary-light)' }} /> Provas Salvas
        </h2>

        {histLoading && (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            <RotateCw size={20} className="animate-spin" />
          </div>
        )}

        {!histLoading && examHistory.length === 0 && (
          <div className="glass-card" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: 14 }}>
            Nenhuma prova gerada ainda. Crie sua primeira prova acima!
          </div>
        )}

        {!histLoading && examHistory.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {examHistory.map(record => {
              const prof = PROFILES.find(p => p.id === record.profileId);
              const attempts = record.attempts ?? [];
              const scores   = attempts.map(a => a.score);
              const best     = scores.length ? Math.max(...scores) : null;
              const isOpen   = startingId === record.id;

              return (
                <div key={record.id} className="glass-card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        {prof && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
                            background: `${prof.color}20`, color: prof.color,
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                          }}>
                            {prof.tag}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(record.createdAt)}</span>
                      </div>
                      <p style={{ fontWeight: 600, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {record.scopeLabel ?? record.topicName}
                      </p>
                      {scores.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Star size={11} style={{ color: 'var(--color-warning)' }} />
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Melhor: </span>
                            <strong style={{ fontSize: 12, color: scoreColor(best!) }}>{best}%</strong>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {scores.length} tentativa{scores.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                          Ainda não realizada
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => openStart(record.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          border: `1px solid var(--color-primary)`,
                          background: isOpen ? 'rgba(73,75,214,0.15)' : 'rgba(73,75,214,0.07)',
                          color: 'var(--color-primary-light)',
                        }}>
                        <Play size={12} /> Iniciar <ChevronDown size={12} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                      </button>
                      <button onClick={() => deleteRecord(record.id)}
                        style={{
                          padding: '7px 10px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                          border: '1px solid var(--border-subtle)', background: 'transparent', color: 'var(--text-muted)',
                          display: 'flex', alignItems: 'center',
                        }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Time limit picker */}
                  {isOpen && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
                        Quanto tempo você tem para esta prova?
                      </p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                        {TIME_OPTIONS.map(opt => (
                          <button key={String(opt.value)} type="button"
                            onClick={() => setChosenLimit(opt.value)}
                            style={{
                              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                              border: `1px solid ${chosenLimit === opt.value ? 'var(--color-primary)' : 'var(--border-color)'}`,
                              background: chosenLimit === opt.value ? 'rgba(73,75,214,0.15)' : 'transparent',
                              color: chosenLimit === opt.value ? 'var(--color-primary-light)' : 'var(--text-secondary)',
                            }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <button className="btn-primary"
                        style={{ width: 'auto', padding: '9px 24px' }}
                        onClick={() => startSession(record, chosenLimit)}>
                        <Play size={13} /> Começar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN: SESSION
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === 'session') {
    const isWarning  = timeLeftSecs !== null && timeLeftSecs <= 300;
    const isCritical = timeLeftSecs !== null && timeLeftSecs <= 60;
    const timerColor = isCritical ? 'var(--color-danger)' : isWarning ? 'var(--color-warning)' : 'var(--color-success)';
    const timerPct   = (timeLimitSecs && timeLimitSecs > 0 && timeLeftSecs !== null)
      ? timeLeftSecs / timeLimitSecs * 100 : 100;

    if (sessionMode === 'multiple' && questions.length > 0) {
      const q = questions[qIdx];
      const progressPct = ((qIdx + (revealed ? 1 : 0)) / questions.length) * 100;
      const activeProf = PROFILES.find(p => p.id === activeRecord?.profileId);

      return (
        <div className="page">
          {/* Timer bar */}
          {timeLeftSecs !== null && (
            <div style={{ position: 'sticky', top: 0, zIndex: 10, marginBottom: 8 }}>
              <div style={{ height: 4, background: 'var(--border-color)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear, background 0.3s' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 3, fontSize: 12, fontWeight: 700, color: isWarning ? timerColor : 'var(--text-muted)' }}>
                {isWarning && <AlertTriangle size={11} />}
                <Timer size={11} />
                {fmtDuration(timeLeftSecs)} restantes
              </div>
            </div>
          )}

          <div className="page-header">
            <div>
              <h1 className="page-title">
                {activeProf ? activeProf.name : 'Sessão de Provas'}
              </h1>
              <p className="page-subtitle">
                Questão {qIdx + 1} de {questions.length}
                {activeRecord?.scopeLabel && ` · ${activeRecord.scopeLabel}`}
              </p>
            </div>
            <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }}
              onClick={resetToSetup}>
              <X size={16} /> Encerrar
            </button>
          </div>

          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {/* Progress bar */}
            <div className="quiz-progress-bar" style={{ marginBottom: 20 }}>
              <div className="quiz-progress-fill" style={{ width: `${progressPct}%`, background: activeProf?.color ?? 'var(--color-primary)' }} />
            </div>

            <div className="glass-card" style={{ padding: 28, marginBottom: 16 }}>
              {/* Text-base for contextual questions */}
              {q.textBase && q.textBase.trim() && (
                <div style={{
                  padding: '14px 18px', borderRadius: 10, marginBottom: 22,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
                  borderLeft: `4px solid ${activeProf?.color ?? 'var(--color-primary)'}`,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: activeProf?.color ?? 'var(--color-primary-light)', marginBottom: 10 }}>
                    Texto-base
                  </div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.75, color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {q.textBase}
                  </p>
                </div>
              )}

              <p style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.6, marginBottom: 22 }}>{q.question}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {q.options.map((opt, idx) => {
                  let bg = 'transparent', color = 'var(--text-primary)', border = 'var(--border-subtle)';
                  if (revealed) {
                    if (idx === q.correctIndex)    { bg = 'var(--bg-surface)'; color = 'var(--color-success)'; border = 'var(--color-success)'; }
                    else if (idx === selected)     { bg = 'rgba(255,100,100,0.08)'; color = 'var(--color-danger)'; border = 'var(--color-danger)'; }
                  }
                  return (
                    <button key={idx} onClick={() => mcAnswer(idx)} disabled={revealed}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px',
                        borderRadius: 10, border: `1px solid ${border}`, background: bg, color,
                        cursor: revealed ? 'default' : 'pointer', textAlign: 'left',
                        fontSize: 14, fontWeight: 500, transition: 'var(--transition)',
                      }}>
                      <span style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 12,
                        background: revealed && idx === q.correctIndex ? 'var(--color-success)'
                          : revealed && idx === selected ? 'var(--color-danger)'
                          : 'var(--bg-overlay)',
                        color: revealed && (idx === q.correctIndex || idx === selected) ? 'white' : 'var(--text-muted)',
                      }}>
                        {LETTERS[idx]}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {revealed && (
                <div style={{ marginTop: 18, padding: '12px 16px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                  <strong style={{ fontSize: 12, color: 'var(--color-primary-light)' }}>Explicação: </strong>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{q.explanation}</span>
                </div>
              )}
            </div>

            {revealed && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: selected === q.correctIndex ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  {selected === q.correctIndex ? '✓ Correto!' : '✗ Incorreto'}
                </div>
                <button className="btn-primary" style={{ width: 'auto', padding: '10px 28px' }} onClick={mcNext}>
                  {qIdx + 1 >= questions.length ? 'Ver resultado' : 'Próxima'} <SkipForward size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Essay session
    const eq = essayQs[essayIdx];
    const essayPct = ((essayIdx + (currentEval ? 1 : 0)) / essayQs.length) * 100;

    return (
      <div className="page">
        {/* Timer bar */}
        {timeLeftSecs !== null && (
          <div style={{ position: 'sticky', top: 0, zIndex: 10, marginBottom: 8 }}>
            <div style={{ height: 4, background: 'var(--border-color)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear, background 0.3s' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 3, fontSize: 12, fontWeight: 700, color: isWarning ? timerColor : 'var(--text-muted)' }}>
              {isWarning && <AlertTriangle size={11} />}
              <Timer size={11} />
              {fmtDuration(timeLeftSecs)} restantes
            </div>
          </div>
        )}

        <div className="page-header">
          <div>
            <h1 className="page-title">Dissertativo</h1>
            <p className="page-subtitle">Questão {essayIdx + 1} de {essayQs.length}{activeRecord?.scopeLabel && ` · ${activeRecord.scopeLabel}`}</p>
          </div>
          <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={resetToSetup}>
            <X size={16} /> Encerrar
          </button>
        </div>

        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="quiz-progress-bar" style={{ marginBottom: 20 }}>
            <div className="quiz-progress-fill" style={{ width: `${essayPct}%`, background: '#f97316' }} />
          </div>

          <div className="glass-card" style={{ padding: 28, marginBottom: 16 }}>
            <p style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.6, marginBottom: 18 }}>{eq?.question}</p>
            <textarea className="form-input" rows={6}
              style={{ resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: 14 }}
              placeholder="Escreva sua resposta aqui..."
              value={essayText} onChange={e => setEssayText(e.target.value)}
              disabled={!!currentEval} />

            {!currentEval && (
              <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }}
                  onClick={handleEvaluate} disabled={evaluating || !essayText.trim()}>
                  {evaluating
                    ? <><RotateCw size={14} className="animate-spin" /> Avaliando...</>
                    : <><GraduationCap size={14} /> Avaliar resposta</>}
                </button>
                <button type="button" onClick={() => { setEssayText(''); setCurrentEval(null); essayNext(); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
                  Pular questão
                </button>
              </div>
            )}

            {currentEval && (
              <div style={{ marginTop: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: scoreColor(currentEval.score * 10), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'white', flexShrink: 0 }}>
                    {currentEval.score}
                  </div>
                  <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>{currentEval.feedback}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: currentEval.correct.length && currentEval.missing.length ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 14 }}>
                  {currentEval.correct.length > 0 && (
                    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--color-success)' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-success)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>✓ Acertos</div>
                      {currentEval.correct.map((c, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3 }}>· {c}</div>)}
                    </div>
                  )}
                  {currentEval.missing.length > 0 && (
                    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,100,100,0.05)', border: '1px solid rgba(255,100,100,0.15)' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-danger)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>✗ Faltou</div>
                      {currentEval.missing.map((m, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3 }}>· {m}</div>)}
                    </div>
                  )}
                </div>
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-surface)', borderLeft: '3px solid var(--color-primary)', marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary-light)', marginBottom: 4 }}>Gabarito</div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{eq?.expectedAnswer}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn-primary" style={{ width: 'auto', padding: '10px 28px' }} onClick={essayNext}>
                    {essayIdx + 1 >= essayQs.length ? 'Ver resultado' : 'Próxima'} <SkipForward size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCREEN: RESULTS
  // ─────────────────────────────────────────────────────────────────────────
  const activeProf = PROFILES.find(p => p.id === activeRecord?.profileId);

  if (sessionMode === 'multiple') {
    const correct  = answers.filter(Boolean).length;
    const total    = questions.length;
    const pct      = total > 0 ? Math.round(correct / total * 100) : 0;
    const color    = scoreColor(pct);

    return (
      <div className="page">
        <div className="page-header"><div><h1 className="page-title">Resultado</h1></div></div>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div className="glass-card" style={{ padding: '40px 32px', textAlign: 'center' }}>
            <Trophy size={52} style={{ color, marginBottom: 16 }} />
            <div className="quiz-score-ring" style={{ color }}>{pct}%</div>
            <p style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>{correct} de {total} corretas</p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>{scoreMsg(pct)}</p>

            {/* Time info */}
            {timeLimitSecs !== null && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                <Timer size={14} />
                <span>
                  Concluído em <strong>{fmtDuration(resultTaken)}</strong>
                  {' '}/ {fmtDuration(timeLimitSecs)}
                </span>
              </div>
            )}
            {timeLimitSecs === null && resultTaken > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                <Timer size={14} /> Concluído em <strong>{fmtDuration(resultTaken)}</strong>
              </div>
            )}

            {/* Profile badge */}
            {activeProf && (
              <div style={{ marginTop: 14 }}>
                <span style={{ fontSize: 11, padding: '3px 12px', borderRadius: 20, background: `${activeProf.color}20`, color: activeProf.color, fontWeight: 700 }}>
                  {activeProf.name}
                </span>
              </div>
            )}

            {/* Question breakdown */}
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
              {questions.map((q, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8,
                  background: 'var(--bg-surface)',
                  border: `1px solid ${answers[i] ? 'var(--color-success)' : 'var(--color-danger)'}`,
                }}>
                  {answers[i]
                    ? <CheckCircle size={15} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 1 }} />
                    : <X size={15} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: 1 }} />}
                  <span style={{ fontSize: 13 }}>Q{i + 1}: {q.question}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 28, justifyContent: 'center' }}>
              <button className="btn-secondary" style={{ width: 'auto', padding: '10px 24px' }} onClick={resetToSetup}>
                <RotateCw size={15} /> Nova Prova
              </button>
              {activeRecord && (
                <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }}
                  onClick={() => openStart(activeRecord.id)}>
                  <Play size={15} /> Refazer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Essay results
  const evaluated = essayAnswers.filter(a => a.evaluation);
  const avgScore  = evaluated.length
    ? Math.round(evaluated.reduce((s, a) => s + (a.evaluation?.score ?? 0), 0) / evaluated.length * 10) / 10 : 0;
  const avgColor  = scoreColor(avgScore * 10);

  return (
    <div className="page">
      <div className="page-header"><div><h1 className="page-title">Resultado — Dissertativo</h1></div></div>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="glass-card" style={{ padding: '32px', textAlign: 'center', marginBottom: 20 }}>
          <Trophy size={48} style={{ color: avgColor, marginBottom: 12 }} />
          <div style={{ fontSize: 64, fontFamily: 'var(--font-display)', fontWeight: 800, color: avgColor, lineHeight: 1 }}>
            {avgScore}<span style={{ fontSize: 24, fontWeight: 400 }}>/10</span>
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>Média geral</p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>{scoreMsg(avgScore * 10)}</p>
          {timeLimitSecs !== null && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
              <Timer size={14} /> Concluído em <strong>{fmtDuration(resultTaken)}</strong> / {fmtDuration(timeLimitSecs)}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          {essayQs.map((q, i) => {
            const a  = essayAnswers[i];
            const ev = a?.evaluation;
            const evColor = ev ? scoreColor(ev.score * 10) : 'var(--bg-overlay)';
            return (
              <div key={i} className="glass-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: evColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'white', flexShrink: 0 }}>
                    {ev ? ev.score : '?'}
                  </div>
                  <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>Q{i + 1}: {q.question}</p>
                </div>
                {a?.userAnswer && (
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-surface)', marginBottom: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>Sua resposta</div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{a.userAnswer}</p>
                  </div>
                )}
                {ev && (
                  <>
                    <p style={{ fontSize: 13, marginBottom: 10 }}>{ev.feedback}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: ev.correct.length && ev.missing.length ? '1fr 1fr' : '1fr', gap: 10, marginBottom: 10 }}>
                      {ev.correct.length > 0 && (
                        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--color-success)' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-success)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>✓ Acertos</div>
                          {ev.correct.map((c, ci) => <div key={ci} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>· {c}</div>)}
                        </div>
                      )}
                      {ev.missing.length > 0 && (
                        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,100,100,0.05)', border: '1px solid rgba(255,100,100,0.15)' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-danger)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>✗ Faltou</div>
                          {ev.missing.map((m, mi) => <div key={mi} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>· {m}</div>)}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-surface)', borderLeft: '3px solid var(--color-primary)' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary-light)', marginBottom: 4 }}>Gabarito</div>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{q.expectedAnswer}</p>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn-secondary" style={{ width: 'auto', padding: '10px 24px' }} onClick={resetToSetup}>
            <RotateCw size={15} /> Nova Prova
          </button>
          {activeRecord && (
            <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }}
              onClick={() => { resetToSetup(); setTimeout(() => openStart(activeRecord.id), 50); }}>
              <Play size={15} /> Refazer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
