import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, RotateCw, Clock, Coffee, Settings, ChevronDown } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import './Pomodoro.css';

type Phase = 'focus' | 'short-break' | 'long-break';

const CIRCUMFERENCE = 2 * Math.PI * 46;

function playSound(phase: Phase, volume = 0.35) {
  try {
    const ctx = new AudioContext();
    const configs: Record<Phase, { freqs: number[]; gap: number }> = {
      'focus':       { freqs: [880, 1100, 880], gap: 160 },
      'short-break': { freqs: [523, 659, 784],  gap: 120 },
      'long-break':  { freqs: [392, 494, 587, 740], gap: 100 },
    };
    const { freqs, gap } = configs[phase];
    freqs.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      const t = ctx.currentTime + (i * gap) / 1000;
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.start(t);
      osc.stop(t + 0.38);
    });
    setTimeout(() => ctx.close(), freqs.length * gap + 600);
  } catch { /* AudioContext not available */ }
}

function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico', silent: true });
  }
}

export default function Pomodoro() {
  const { cards, visibleTopics, subjects } = useApp();

  const [phase,        setPhase]        = useState<Phase>('focus');
  const [running,      setRunning]       = useState(false);
  const [seconds,      setSeconds]       = useState(25 * 60);
  const [round,        setRound]         = useState(1);
  const [sessions,     setSessions]      = useState(0);

  // Durations — stored in localStorage, applied to timer when not running
  const [focusMin,  setFocusMinState]  = useState(() => Number(localStorage.getItem('pomo_focus') ?? 25));
  const [breakMin,  setBreakMinState]  = useState(() => Number(localStorage.getItem('pomo_break') ?? 5));
  const [longMin,   setLongMinState]   = useState(() => Number(localStorage.getItem('pomo_long')  ?? 15));

  const [topicId,      setTopicId]       = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Refs to avoid stale closures in the timer effect
  const phaseRef   = useRef(phase);
  const roundRef   = useRef(round);
  const focusRef   = useRef(focusMin);
  const breakRef   = useRef(breakMin);
  const longRef    = useRef(longMin);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { focusRef.current = focusMin; }, [focusMin]);
  useEffect(() => { breakRef.current = breakMin; }, [breakMin]);
  useEffect(() => { longRef.current  = longMin;  }, [longMin]);

  // Setters that persist to localStorage — do NOT reset timer mid-session
  const setFocusMin = (n: number) => { setFocusMinState(n); localStorage.setItem('pomo_focus', String(n)); };
  const setBreakMin = (n: number) => { setBreakMinState(n); localStorage.setItem('pomo_break', String(n)); };
  const setLongMin  = (n: number) => { setLongMinState(n);  localStorage.setItem('pomo_long',  String(n)); };

  // Ask notification permission once on mount
  useEffect(() => { requestNotifPermission(); }, []);

  // Tick
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Phase end
  useEffect(() => {
    if (seconds !== 0 || !running) return;
    setRunning(false);

    const finishedPhase = phaseRef.current;
    playSound(finishedPhase);

    const messages: Record<Phase, { title: string; body: string }> = {
      'focus':       { title: 'Foco concluído!',       body: 'Hora de descansar um pouco.' },
      'short-break': { title: 'Pausa curta encerrada!', body: 'Bora focar de novo.' },
      'long-break':  { title: 'Pausa longa encerrada!', body: 'Nova rodada de estudos.' },
    };
    sendNotification(messages[finishedPhase].title, messages[finishedPhase].body);

    if (finishedPhase === 'focus') {
      setSessions(s => s + 1);
      const nextRound = roundRef.current + 1;
      if (nextRound > 4) {
        setRound(1); setPhase('long-break'); setSeconds(longRef.current * 60);
      } else {
        setRound(nextRound); setPhase('short-break'); setSeconds(breakRef.current * 60);
      }
    } else {
      setPhase('focus'); setSeconds(focusRef.current * 60);
    }
  }, [seconds, running]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => {
    setRunning(false); setPhase('focus'); setRound(1);
    setSeconds(focusRef.current * 60); setSessions(0);
  }, []);

  const skip = () => setSeconds(0);

  const switchPhase = (p: Phase) => {
    setRunning(false); setPhase(p);
    setSeconds(p === 'focus' ? focusRef.current * 60 : p === 'short-break' ? breakRef.current * 60 : longRef.current * 60);
  };

  // Apply duration change: if not running, reset seconds to new duration for current phase
  const applyFocus = (n: number) => {
    setFocusMin(n);
    if (!running && phaseRef.current === 'focus') setSeconds(n * 60);
  };
  const applyBreak = (n: number) => {
    setBreakMin(n);
    if (!running && phaseRef.current === 'short-break') setSeconds(n * 60);
  };
  const applyLong = (n: number) => {
    setLongMin(n);
    if (!running && phaseRef.current === 'long-break') setSeconds(n * 60);
  };

  const totalSecs  = phase === 'focus' ? focusMin * 60 : phase === 'short-break' ? breakMin * 60 : longMin * 60;
  const progress   = totalSecs > 0 ? seconds / totalSecs : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const activeColor = phase === 'focus' ? 'var(--color-primary)' : phase === 'short-break' ? 'var(--color-tertiary)' : 'var(--text-muted)';

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const dueForTopic = topicId ? cards.filter(c => c.topicId === topicId && new Date(c.nextReview) <= new Date()).length : 0;

  // Marginalia side note texts dynamically computed
  const sideNoteTitle = phase === 'focus' ? '01. Foco' : phase === 'short-break' ? '02. Pausa' : '03. Pausa Longa';
  const sideNoteDesc = phase === 'focus'
    ? 'Mantenha a concentração plena durante este período. Evite interrupções externas.'
    : phase === 'short-break'
    ? 'Hora de afastar-se da tela. Beba água, faça um alongamento leve ou relaxe a mente.'
    : 'Um descanso maior para consolidação da memória após várias sessões intensas.';

  return (
    <div className="page" style={{ padding: '24px 24px 48px' }}>
      {/* Page Header */}
      <header style={{ marginBottom: 40, borderBottom: '1px solid var(--border-color)', paddingBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 300, color: 'var(--text-primary)', margin: 0 }}>Pomodoro</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--text-muted)', marginTop: 8 }}>
          Sessões de foco alternadas com intervalos para otimização da absorção e retenção.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 48, alignItems: 'start' }}>
        {/* Left Column: Timer & Controls */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', borderRight: '1px solid var(--border-color)', paddingRight: 32 }}>
          {/* Marginalia Note */}
          <div style={{ position: 'absolute', top: 0, left: 0, maxWidth: 140, display: 'flex', flexDirection: 'column', gap: 4 }} className="pomo-sidenote">
            <span className="academic-label" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{sideNoteTitle}</span>
            <p className="academic-label" style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 'normal', lineHeight: 1.4 }}>
              {sideNoteDesc}
            </p>
          </div>

          {/* Segmented Control */}
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', padding: 2, marginBottom: 48, marginTop: 8, borderRadius: '6px' }}>
            {([
              { phase: 'focus' as Phase, label: 'Foco' },
              { phase: 'short-break' as Phase, label: 'Pausa' },
              { phase: 'long-break' as Phase, label: 'Pausa Longa' }
            ]).map(p => (
              <button
                key={p.phase}
                onClick={() => switchPhase(p.phase)}
                style={{
                  padding: '8px 20px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontFamily: 'var(--font-label)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderRadius: '6px',
                  backgroundColor: phase === p.phase ? activeColor : 'transparent',
                  color: phase === p.phase ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Timer Ring */}
          <div style={{ position: 'relative', width: 280, height: 280, display: 'flex', alignItems: 'center', justifyOrigin: 'center', justifyContent: 'center', marginBottom: 40 }}>
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={46} fill="none" stroke="var(--border-subtle)" strokeWidth="1.5" />
              <circle
                cx={50}
                cy={50}
                r={46}
                fill="none"
                stroke={activeColor}
                strokeWidth="2.5"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                strokeLinecap="square"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10, textAlign: 'center' }}>
              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-label)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  color: activeColor,
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 8
                }}
              >
                <span style={{ width: 6, height: 6, backgroundColor: activeColor, marginRight: 8, display: 'inline-block' }} />
                {phase === 'focus' ? 'Foco' : phase === 'short-break' ? 'Pausa' : 'Pausa Longa'}
              </span>
              <h2 style={{ fontSize: 72, fontFamily: 'var(--font-label)', fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 16px', fontFeatureSettings: "'tnum'" }}>
                {mm}:{ss}
              </h2>

              {/* Round indicators */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {[1, 2, 3, 4].map(r => (
                    <div
                      key={r}
                      style={{
                        width: 8,
                        height: 8,
                        border: `1px solid ${r <= round ? activeColor : 'var(--border-color)'}`,
                        backgroundColor: r < round ? activeColor : r === round ? `${activeColor}55` : 'transparent',
                        borderRadius: '1px'
                      }}
                    />
                  ))}
                </div>
                <span className="academic-label" style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                  Sessão {round} de 4
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 48 }}>
            <button
              onClick={reset}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Reiniciar"
            >
              <RotateCw size={20} />
            </button>
            <button
              onClick={() => setRunning(r => !r)}
              style={{
                width: 56,
                height: 56,
                backgroundColor: activeColor,
                color: '#fff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: '6px',
                boxShadow: 'none',
              }}
            >
              {running ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: 2 }} />}
            </button>
            <button
              onClick={skip}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Pular fase"
            >
              <SkipForward size={20} />
            </button>
          </div>

          {/* Retractable Settings */}
          <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: 24 }}>
            <button
              onClick={() => setShowSettings(s => !s)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-label)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Settings size={14} /> Configurações de tempo
              </span>
              <ChevronDown size={14} style={{ transform: showSettings ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {showSettings && (
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {([
                  { label: 'Foco (min)',    value: focusMin, setter: applyFocus, min: 5,  max: 90 },
                  { label: 'Pausa (min)',   value: breakMin, setter: applyBreak, min: 1,  max: 30 },
                  { label: 'Pausa Longa',  value: longMin,  setter: applyLong,  min: 5,  max: 60 },
                ] as { label: string; value: number; setter: (n: number) => void; min: number; max: number }[]).map(({ label, value, setter, min, max }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label className="academic-label" style={{ fontSize: 9 }}>{label}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        value={value}
                        onChange={e => setter(Number(e.target.value))}
                        style={{ flex: 1, accentColor: activeColor }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 600, minWidth: 24, textAlign: 'center' }}>{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Context & Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {/* Study Selector */}
          <div>
            <label className="academic-label" style={{ fontSize: 10, display: 'block', marginBottom: 8 }}>Contexto de Estudo</label>
            <select
              className="input-notebook"
              value={topicId}
              onChange={e => setTopicId(e.target.value)}
              style={{ width: '100%', padding: '10px 28px 10px 0', borderBottom: '1px solid var(--border-color)', outline: 'none' }}
            >
              <option value="">Sessão livre</option>
              {visibleTopics.map(t => (
                <option key={t.id} value={t.id}>
                  {subjects.find(s => s.id === t.subjectId)?.name} › {t.name}
                </option>
              ))}
            </select>
            {topicId && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', marginTop: 16, borderRadius: '6px' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cards pendentes nesta matéria</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)' }}>{dueForTopic}</span>
              </div>
            )}
          </div>

          {/* Daily Activity Metrics */}
          <div>
            <h3 className="academic-label" style={{ fontSize: 10, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', paddingBottom: 8, marginBottom: 16 }}>
              Atividade Diária
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Metric 1 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <span className="academic-label" style={{ fontSize: 9, display: 'block', marginBottom: 4 }}>Sessões concluídas</span>
                  <span style={{ fontSize: 24, fontWeight: 600, fontFamily: 'var(--font-label)' }}>
                    {sessions} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/ 8</span>
                  </span>
                </div>
                {/* Visual blocks */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                    <div
                      key={s}
                      style={{
                        width: 10,
                        height: 20,
                        backgroundColor: s <= sessions ? activeColor : 'var(--border-color)',
                        borderRadius: '2px'
                      }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ height: 1, backgroundColor: 'var(--border-subtle)' }} />

              {/* Metric 2 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="academic-label" style={{ fontSize: 9, display: 'block', marginBottom: 4 }}>Tempo de foco acumulado</span>
                  <span style={{ fontSize: 24, fontWeight: 600, fontFamily: 'var(--font-label)' }}>
                    {sessions * focusMin} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>min</span>
                  </span>
                </div>
                <Clock size={20} style={{ color: 'var(--text-muted)' }} />
              </div>
              <div style={{ height: 1, backgroundColor: 'var(--border-subtle)' }} />

              {/* Metric 3 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="academic-label" style={{ fontSize: 9, display: 'block', marginBottom: 4 }}>Próxima pausa em</span>
                  <span style={{ fontSize: 24, fontWeight: 600, fontFamily: 'var(--font-label)' }}>
                    {phase === 'focus' ? `${mm}:${ss}` : 'Em pausa'}
                  </span>
                </div>
                <Coffee size={20} style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>
          </div>

          {/* Explanatory Panel */}
          <div style={{ padding: 24, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', marginTop: 'auto', borderRadius: '6px' }}>
            <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, margin: '0 0 12px' }}>Resumo do Ciclo</h4>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 16px' }}>
              Seu método atual baseia-se em blocos de <strong>{focusMin} minutos</strong> de foco intenso, seguidos por breves pausas de <strong>{breakMin} minutos</strong> para assimilação.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li style={{ display: 'flex', alignItems: 'center', fontSize: 10, fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                <span style={{ width: 8, height: 8, backgroundColor: 'var(--color-primary)', marginRight: 12, borderRadius: '1px' }} />
                Foco: {focusMin} min
              </li>
              <li style={{ display: 'flex', alignItems: 'center', fontSize: 10, fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                <span style={{ width: 8, height: 8, backgroundColor: 'var(--color-tertiary)', marginRight: 12, borderRadius: '1px' }} />
                Pausa Curta: {breakMin} min
              </li>
              <li style={{ display: 'flex', alignItems: 'center', fontSize: 10, fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                <span style={{ width: 8, height: 8, backgroundColor: 'var(--text-muted)', marginRight: 12, borderRadius: '1px' }} />
                Pausa Longa (após 4 sessões): {longMin} min
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
