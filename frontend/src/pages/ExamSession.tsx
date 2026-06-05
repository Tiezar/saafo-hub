import React, { useState, useCallback } from 'react';
import { Trophy, RotateCw, CheckCircle, X, SkipForward, GraduationCap, PenLine, ListChecks } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import type { QuizQuestion } from '../types';

type Difficulty = 'easy' | 'medium' | 'hard';
type Mode = 'multiple' | 'essay';

const DIFF_LABELS: Record<Difficulty, string> = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' };
const DIFF_COLORS: Record<Difficulty, string> = {
  easy: 'var(--color-success)',
  medium: 'var(--color-warning)',
  hard: 'var(--color-danger)',
};
const LETTERS = ['A', 'B', 'C', 'D'];

interface EssayEvaluation {
  score: number;
  feedback: string;
  correct: string[];
  missing: string[];
}

interface EssayQuestion {
  question: string;
  expectedAnswer: string;
}

interface EssayAnswer {
  userAnswer: string;
  evaluation: EssayEvaluation | null;
}

function scoreColor(score: number) {
  if (score >= 8) return 'var(--color-success)';
  if (score >= 5) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

export default function ExamSession() {
  const { apiCall, visibleTopics, subjects, cards, showError } = useApp();

  const [mode,       setMode]       = useState<Mode>('multiple');
  const [topicId,    setTopicId]    = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [count,      setCount]      = useState(10);
  const [loading,    setLoading]    = useState(false);
  const [finished,   setFinished]   = useState(false);

  // Multiple-choice state
  const [questions,  setQuestions]  = useState<QuizQuestion[]>([]);
  const [mcIndex,    setMcIndex]    = useState(0);
  const [selected,   setSelected]   = useState<number | null>(null);
  const [answers,    setAnswers]    = useState<boolean[]>([]);
  const [revealed,   setRevealed]   = useState(false);

  // Essay state
  const [essayQuestions, setEssayQuestions] = useState<EssayQuestion[]>([]);
  const [essayAnswers,   setEssayAnswers]   = useState<EssayAnswer[]>([]);
  const [essayIndex,     setEssayIndex]     = useState(0);
  const [essayText,      setEssayText]      = useState('');
  const [evaluating,     setEvaluating]     = useState(false);
  const [currentEval,    setCurrentEval]    = useState<EssayEvaluation | null>(null);

  const topicCards = cards.filter(c => c.topicId === topicId);
  const cardCount  = topicCards.length;

  const resetAll = () => {
    setQuestions([]); setMcIndex(0); setSelected(null); setAnswers([]); setFinished(false); setRevealed(false);
    setEssayQuestions([]); setEssayAnswers([]); setEssayIndex(0); setEssayText(''); setCurrentEval(null);
  };

  // ── Start ─────────────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    if (!topicId) return;
    resetAll();
    setLoading(true);
    try {
      if (mode === 'multiple') {
        const qs = await apiCall('/ai/quiz', {
          method: 'POST',
          body: JSON.stringify({ topicId, difficulty, count }),
        }) as QuizQuestion[];
        setQuestions(qs);
      } else {
        // Essay: shuffle topic cards and pick `count`
        const shuffled = [...topicCards].sort(() => Math.random() - 0.5).slice(0, count);
        setEssayQuestions(shuffled.map(c => ({ question: c.front, expectedAnswer: c.back })));
        setEssayAnswers(shuffled.map(() => ({ userAnswer: '', evaluation: null })));
        setEssayIndex(0);
        setEssayText('');
        setCurrentEval(null);
      }
    } catch (e) { showError((e as Error).message); }
    finally { setLoading(false); }
  }, [topicId, difficulty, count, mode, topicCards, apiCall, showError]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Multiple-choice helpers ───────────────────────────────────────────────
  const answer = (idx: number) => {
    if (revealed) return;
    setSelected(idx); setRevealed(true);
    setAnswers(prev => [...prev, idx === questions[mcIndex].correctIndex]);
  };

  const mcNext = () => {
    if (mcIndex + 1 >= questions.length) { setFinished(true); return; }
    setMcIndex(i => i + 1); setSelected(null); setRevealed(false);
  };

  // ── Essay helpers ─────────────────────────────────────────────────────────
  const handleEvaluate = useCallback(async () => {
    const q = essayQuestions[essayIndex];
    if (!q) return;
    setEvaluating(true);
    try {
      const ev = await apiCall('/ai/evaluate-essay', {
        method: 'POST',
        body: JSON.stringify({ question: q.question, expectedAnswer: q.expectedAnswer, userAnswer: essayText }),
      }) as EssayEvaluation;
      setCurrentEval(ev);
      setEssayAnswers(prev => prev.map((a, i) => i === essayIndex ? { userAnswer: essayText, evaluation: ev } : a));
    } catch (e) { showError((e as Error).message); }
    finally { setEvaluating(false); }
  }, [essayQuestions, essayIndex, essayText, apiCall, showError]);

  const essayNext = () => {
    if (essayIndex + 1 >= essayQuestions.length) { setFinished(true); return; }
    setEssayIndex(i => i + 1);
    setEssayText('');
    setCurrentEval(null);
  };

  // ── Setup screen ──────────────────────────────────────────────────────────
  const inSession = mode === 'multiple' ? questions.length > 0 : essayQuestions.length > 0;

  if (!inSession && !loading) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Sessão de Provas</h1>
            <p className="page-subtitle">Teste seu conhecimento com questões geradas pela IA</p>
          </div>
        </div>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="glass-card" style={{ padding: 32 }}>
            {/* Mode selector */}
            <div className="form-group">
              <label className="form-label">Modo</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {([
                  { value: 'multiple', icon: <ListChecks size={20} />, label: 'Múltipla Escolha', desc: 'Questões A/B/C/D geradas por IA com explicações' },
                  { value: 'essay',    icon: <PenLine size={20} />,    label: 'Dissertativo',     desc: 'Responda com suas palavras — IA avalia e dá nota' },
                ] as const).map(m => (
                  <button key={m.value} type="button"
                    onClick={() => setMode(m.value)}
                    style={{
                      padding: '16px', borderRadius: 12, textAlign: 'left',
                      border: `2px solid ${mode === m.value ? 'var(--color-primary)' : 'var(--border-color)'}`,
                      background: mode === m.value ? 'rgba(73,75,214,0.07)' : 'var(--bg-surface)',
                      cursor: 'pointer', transition: 'var(--transition)',
                    }}>
                    <div style={{ color: mode === m.value ? 'var(--color-primary-light)' : 'var(--text-muted)', marginBottom: 8 }}>
                      {m.icon}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tópico *</label>
              <select className="form-input" value={topicId} onChange={e => setTopicId(e.target.value)}>
                <option value="">Selecione um tópico...</option>
                {visibleTopics.map(t => (
                  <option key={t.id} value={t.id}>{subjects.find(s => s.id === t.subjectId)?.name} › {t.name}</option>
                ))}
              </select>
              {topicId && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {cardCount} flashcards disponíveis {mode === 'multiple' ? '(mínimo 3)' : '(mínimo 1)'}
                </div>
              )}
            </div>

            {mode === 'multiple' && (
              <div className="form-group">
                <label className="form-label">Dificuldade</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
                    <button key={d} type="button"
                      onClick={() => setDifficulty(d)}
                      style={{
                        flex: 1, padding: '10px 14px', borderRadius: 10, border: `1px solid ${DIFF_COLORS[d]}44`,
                        cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        background: difficulty === d ? `${DIFF_COLORS[d]}18` : 'transparent',
                        color: difficulty === d ? DIFF_COLORS[d] : 'var(--text-secondary)',
                      }}>
                      {d === 'easy' ? '🟢' : d === 'medium' ? '🟡' : '🔴'} {DIFF_LABELS[d]}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  {difficulty === 'easy'   && 'Definições e reconhecimento direto de conceitos.'}
                  {difficulty === 'medium' && 'Aplicação, comparação e relações entre conceitos.'}
                  {difficulty === 'hard'   && 'Análise crítica, síntese e casos complexos.'}
                </p>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Quantidade de questões: <strong>{count}</strong></label>
              <input type="range" min={mode === 'multiple' ? 3 : 1} max={mode === 'multiple' ? 20 : Math.min(20, cardCount || 20)}
                value={count} onChange={e => setCount(Number(e.target.value))} style={{ width: '100%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                <span>{mode === 'multiple' ? 3 : 1}</span>
                <span>{mode === 'multiple' ? 20 : Math.min(20, cardCount || 20)}</span>
              </div>
            </div>

            <button className="btn-primary" style={{ width: 'auto', padding: '12px 32px' }}
              onClick={start} disabled={!topicId || (mode === 'multiple' ? cardCount < 3 : cardCount < 1)}>
              <GraduationCap size={16} /> Iniciar Sessão
            </button>

            {topicId && mode === 'multiple' && cardCount < 3 && (
              <p style={{ marginTop: 12, fontSize: 13, color: 'var(--color-warning)' }}>
                Este tópico precisa de pelo menos 3 flashcards para múltipla escolha.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page">
        <div className="page-header"><div><h1 className="page-title">Sessão de Provas</h1></div></div>
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px', gap: 20 }}>
          <RotateCw size={40} className="animate-spin" style={{ color: 'var(--color-primary-light)' }} />
          <p style={{ fontWeight: 600, fontSize: 16 }}>
            {mode === 'multiple' ? `Gerando ${count} questões com Gemini 2.5 Flash...` : 'Preparando questões dissertativas...'}
          </p>
        </div>
      </div>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────
  if (finished) {
    if (mode === 'multiple') {
      const correct = answers.filter(Boolean).length;
      const pct = Math.round((correct / questions.length) * 100);
      const color = pct >= 80 ? 'var(--color-success)' : pct >= 60 ? 'var(--color-warning)' : 'var(--color-danger)';
      return (
        <div className="page">
          <div className="page-header"><div><h1 className="page-title">Resultado</h1></div></div>
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
              <Trophy size={52} style={{ color, marginBottom: 16 }} />
              <div className="quiz-score-ring" style={{ color }}>{pct}%</div>
              <p style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>{correct} de {questions.length} corretas</p>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
                {pct >= 80 ? '🎉 Excelente! Você domina este conteúdo.' : pct >= 60 ? '👍 Bom resultado! Revise os pontos errados.' : '📚 Estude mais e tente novamente.'}
              </p>
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
                {questions.map((q, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: answers[i] ? 'rgba(47,217,244,0.06)' : 'rgba(255,180,171,0.06)', border: `1px solid ${answers[i] ? 'rgba(47,217,244,0.2)' : 'rgba(255,180,171,0.2)'}` }}>
                    {answers[i] ? <CheckCircle size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} /> : <X size={16} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />}
                    <span style={{ fontSize: 13 }}>Q{i + 1}: {q.question}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 28, justifyContent: 'center' }}>
                <button className="btn-secondary" style={{ width: 'auto', padding: '10px 24px' }} onClick={resetAll}><RotateCw size={16} /> Nova Sessão</button>
                <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }} onClick={start}><SkipForward size={16} /> Repetir</button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Essay results
    const evaluated = essayAnswers.filter(a => a.evaluation);
    const avgScore = evaluated.length
      ? Math.round(evaluated.reduce((sum, a) => sum + (a.evaluation?.score ?? 0), 0) / evaluated.length * 10) / 10
      : 0;
    const avgColor = scoreColor(avgScore);

    return (
      <div className="page">
        <div className="page-header"><div><h1 className="page-title">Resultado — Dissertativo</h1></div></div>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div className="glass-card" style={{ padding: 32, textAlign: 'center', marginBottom: 20 }}>
            <Trophy size={48} style={{ color: avgColor, marginBottom: 12 }} />
            <div style={{ fontSize: 64, fontFamily: 'var(--font-display)', fontWeight: 800, color: avgColor, lineHeight: 1 }}>
              {avgScore}<span style={{ fontSize: 24, fontWeight: 400 }}>/10</span>
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>Média geral</p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
              {avgScore >= 8 ? '🎉 Excelente domínio do conteúdo!' : avgScore >= 5 ? '👍 Bom resultado! Revise os pontos faltantes.' : '📚 Estude mais e revise os conceitos.'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {essayQuestions.map((q, i) => {
              const a = essayAnswers[i];
              const ev = a?.evaluation;
              return (
                <div key={i} className="glass-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: ev ? scoreColor(ev.score) : 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'white', flexShrink: 0 }}>
                      {ev ? ev.score : '?'}
                    </div>
                    <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>Q{i + 1}: {q.question}</p>
                  </div>

                  {a?.userAnswer && (
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg-surface)', marginBottom: 10 }}>
                      <div style={{ fontSize: 10, fontFamily: 'var(--font-label)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>Sua resposta</div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{a.userAnswer}</p>
                    </div>
                  )}

                  {ev && (
                    <>
                      <p style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>{ev.feedback}</p>
                      {ev.correct.length > 0 && (
                        <div style={{ marginBottom: 6 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-success)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Acertos</div>
                          {ev.correct.map((c, ci) => <div key={ci} style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 12, marginBottom: 2 }}>✓ {c}</div>)}
                        </div>
                      )}
                      {ev.missing.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-danger)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Faltou</div>
                          {ev.missing.map((m, mi) => <div key={mi} style={{ fontSize: 12, color: 'var(--text-secondary)', paddingLeft: 12, marginBottom: 2 }}>✗ {m}</div>)}
                        </div>
                      )}
                      <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-surface)', borderLeft: '3px solid var(--color-primary)' }}>
                        <div style={{ fontSize: 10, fontFamily: 'var(--font-label)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary-light)', marginBottom: 4 }}>Gabarito</div>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{q.expectedAnswer}</p>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
            <button className="btn-secondary" style={{ width: 'auto', padding: '10px 24px' }} onClick={resetAll}><RotateCw size={16} /> Nova Sessão</button>
            <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }} onClick={start}><SkipForward size={16} /> Repetir</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Multiple choice question ───────────────────────────────────────────────
  if (mode === 'multiple' && questions.length) {
    const q = questions[mcIndex];
    const progressPct = ((mcIndex + (revealed ? 1 : 0)) / questions.length) * 100;

    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Sessão de Provas</h1>
            <p className="page-subtitle">Questão {mcIndex + 1} de {questions.length} · {DIFF_LABELS[difficulty]}</p>
          </div>
          <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={resetAll}><X size={16} /> Encerrar</button>
        </div>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div className="quiz-progress-bar" style={{ marginBottom: 20 }}>
            <div className="quiz-progress-fill" style={{ width: `${progressPct}%`, background: DIFF_COLORS[difficulty] }} />
          </div>
          <div className="glass-card" style={{ padding: 28, marginBottom: 16 }}>
            <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.55, marginBottom: 24 }}>{q.question}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {q.options.map((opt, idx) => {
                let bg = 'transparent', color = 'var(--text-primary)', borderColor = 'var(--border-subtle)';
                if (revealed) {
                  if (idx === q.correctIndex)       { bg = 'rgba(47,217,244,0.1)'; color = 'var(--color-success)'; borderColor = 'var(--color-success)'; }
                  else if (idx === selected)        { bg = 'rgba(255,180,171,0.1)'; color = 'var(--color-danger)'; borderColor = 'var(--color-danger)'; }
                }
                return (
                  <button key={idx} onClick={() => answer(idx)} disabled={revealed}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 10, border: `1px solid ${borderColor}`, background: bg, color, cursor: revealed ? 'default' : 'pointer', textAlign: 'left', fontSize: 14, fontWeight: 500, transition: 'var(--transition)' }}>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: revealed && idx === q.correctIndex ? 'var(--color-success)' : revealed && idx === selected ? 'var(--color-danger)' : 'var(--bg-overlay)', color: revealed && (idx === q.correctIndex || idx === selected) ? 'white' : 'var(--text-muted)', fontWeight: 700, fontSize: 12 }}>
                      {LETTERS[idx]}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
            {revealed && (
              <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                <strong style={{ fontSize: 13, color: 'var(--color-primary-light)' }}>Explicação: </strong>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{q.explanation}</span>
              </div>
            )}
          </div>
          {revealed && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: selected === q.correctIndex ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {selected === q.correctIndex ? '✓ Correto!' : '✗ Incorreto'}
              </div>
              <button className="btn-primary" style={{ width: 'auto', padding: '10px 28px' }} onClick={mcNext}>
                {mcIndex + 1 >= questions.length ? 'Ver resultado' : 'Próxima'} <SkipForward size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Essay question ─────────────────────────────────────────────────────────
  const eq = essayQuestions[essayIndex];
  const essayProgressPct = ((essayIndex + (currentEval ? 1 : 0)) / essayQuestions.length) * 100;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sessão Dissertativa</h1>
          <p className="page-subtitle">Questão {essayIndex + 1} de {essayQuestions.length}</p>
        </div>
        <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={resetAll}><X size={16} /> Encerrar</button>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div className="quiz-progress-bar" style={{ marginBottom: 20 }}>
          <div className="quiz-progress-fill" style={{ width: `${essayProgressPct}%` }} />
        </div>

        <div className="glass-card" style={{ padding: 28, marginBottom: 16 }}>
          <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.55, marginBottom: 20 }}>{eq.question}</p>

          <textarea
            className="form-input"
            rows={6}
            style={{ resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: 14 }}
            placeholder="Escreva sua resposta aqui..."
            value={essayText}
            onChange={e => setEssayText(e.target.value)}
            disabled={!!currentEval}
          />

          {!currentEval && (
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }}
                onClick={handleEvaluate} disabled={evaluating || !essayText.trim()}>
                {evaluating
                  ? <><RotateCw size={14} className="animate-spin" /> Avaliando com IA...</>
                  : <><GraduationCap size={14} /> Avaliar resposta</>}
              </button>
              <button type="button"
                onClick={() => { setEssayText(''); setCurrentEval(null); essayNext(); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
                Pular questão
              </button>
            </div>
          )}

          {currentEval && (
            <div style={{ marginTop: 20 }}>
              {/* Score badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div className="score-badge-anim" style={{ width: 48, height: 48, borderRadius: '50%', background: scoreColor(currentEval.score), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'white', flexShrink: 0 }}>
                  {currentEval.score}
                </div>
                <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>{currentEval.feedback}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: currentEval.correct.length && currentEval.missing.length ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 16 }}>
                {currentEval.correct.length > 0 && (
                  <div style={{ padding: '12px', borderRadius: 8, background: 'rgba(47,217,244,0.06)', border: '1px solid rgba(47,217,244,0.15)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-success)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>✓ Acertos</div>
                    {currentEval.correct.map((c, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3 }}>· {c}</div>)}
                  </div>
                )}
                {currentEval.missing.length > 0 && (
                  <div style={{ padding: '12px', borderRadius: 8, background: 'rgba(255,180,171,0.06)', border: '1px solid rgba(255,180,171,0.15)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-danger)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>✗ Faltou</div>
                    {currentEval.missing.map((m, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3 }}>· {m}</div>)}
                  </div>
                )}
              </div>

              <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--bg-surface)', borderLeft: '3px solid var(--color-primary)', marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-label)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-primary-light)', marginBottom: 4 }}>Gabarito</div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{eq.expectedAnswer}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-primary" style={{ width: 'auto', padding: '10px 28px' }} onClick={essayNext}>
                  {essayIndex + 1 >= essayQuestions.length ? 'Ver resultado' : 'Próxima'} <SkipForward size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
