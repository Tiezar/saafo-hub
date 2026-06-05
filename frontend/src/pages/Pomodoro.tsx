import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, RotateCw, CheckCircle, Clock, Timer, Settings } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

type Phase = 'focus' | 'short-break' | 'long-break';

const CIRCUMFERENCE = 2 * Math.PI * 90;

export default function Pomodoro() {
  const { cards, visibleTopics, subjects } = useApp();

  const [phase,        setPhase]        = useState<Phase>('focus');
  const [running,      setRunning]       = useState(false);
  const [seconds,      setSeconds]       = useState(25 * 60);
  const [round,        setRound]         = useState(1);
  const [sessions,     setSessions]      = useState(0);
  const [focusMin,     setFocusMinRaw]   = useState(() => Number(localStorage.getItem('pomo_focus') ?? 25));
  const [breakMin,     setBreakMinRaw]   = useState(() => Number(localStorage.getItem('pomo_break') ?? 5));
  const [longMin,      setLongMinRaw]    = useState(() => Number(localStorage.getItem('pomo_long')  ?? 15));

  const setFocusMin = (n: number) => { setFocusMinRaw(n); localStorage.setItem('pomo_focus', String(n)); };
  const setBreakMin = (n: number) => { setBreakMinRaw(n); localStorage.setItem('pomo_break', String(n)); };
  const setLongMin  = (n: number) => { setLongMinRaw(n);  localStorage.setItem('pomo_long',  String(n)); };
  const [topicId,      setTopicId]       = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Refs to avoid stale closures in the timer effect
  const phaseRef    = useRef(phase);
  const roundRef    = useRef(round);
  const focusRef    = useRef(focusMin);
  const breakRef    = useRef(breakMin);
  const longRef     = useRef(longMin);
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { roundRef.current = round; }, [round]);
  useEffect(() => { focusRef.current = focusMin; }, [focusMin]);
  useEffect(() => { breakRef.current = breakMin; }, [breakMin]);
  useEffect(() => { longRef.current  = longMin;  }, [longMin]);

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
    // Beep
    try {
      const ctx = new AudioContext();
      [0, 200, 400].forEach(delay => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = phaseRef.current === 'focus' ? 523 : 440;
        gain.gain.setValueAtTime(0.3, ctx.currentTime + delay / 1000);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay / 1000 + 0.3);
        osc.start(ctx.currentTime + delay / 1000);
        osc.stop(ctx.currentTime + delay / 1000 + 0.35);
      });
      setTimeout(() => ctx.close(), 1200);
    } catch { /* AudioContext not available */ }

    if (phaseRef.current === 'focus') {
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
    setSeconds(p === 'focus' ? focusMin * 60 : p === 'short-break' ? breakMin * 60 : longMin * 60);
  };

  const totalSecs  = phase === 'focus' ? focusMin * 60 : phase === 'short-break' ? breakMin * 60 : longMin * 60;
  const progress   = totalSecs > 0 ? seconds / totalSecs : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);
  const phaseColor = phase === 'focus' ? 'var(--color-primary)' : phase === 'short-break' ? 'var(--color-success)' : 'var(--color-tertiary)';
  const phaseLabel = phase === 'focus' ? 'Foco' : phase === 'short-break' ? 'Pausa Curta' : 'Pausa Longa';
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const dueForTopic = topicId ? cards.filter(c => c.topicId === topicId && new Date(c.nextReview) <= new Date()).length : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pomodoro Timer</h1>
          <p className="page-subtitle">Sessões de foco com a técnica Pomodoro (25/5/15)</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>
        {/* Timer */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 32px' }}>
          <div style={{ position: 'relative', width: 220, height: 220 }}>
            <svg width={220} height={220} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={110} cy={110} r={90} className="pomodoro-ring-track" />
              <circle cx={110} cy={110} r={90} className="pomodoro-ring-progress"
                stroke={phaseColor}
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset} />
            </svg>
            <div className="pomodoro-center" style={{ color: phaseColor }}>
              <div className="pomodoro-time">{mm}:{ss}</div>
              <div className="pomodoro-phase-label">{phaseLabel}</div>
            </div>
          </div>

          <div className="pomodoro-round-dots">
            {[1, 2, 3, 4].map(r => (
              <div key={r}
                className={`pomodoro-dot ${r < round ? 'done' : r === round ? 'active' : ''}`}
                style={r === round ? { background: phaseColor } : {}} />
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Sessão {round} de 4 · {sessions} concluída{sessions !== 1 ? 's' : ''}
          </div>

          <div className="pomodoro-controls">
            <button className="pomodoro-btn-icon" title="Reiniciar" onClick={reset}><RotateCw size={16} /></button>
            <button className="pomodoro-btn-main" onClick={() => setRunning(r => !r)}>
              {running ? <Pause size={26} /> : <Play size={26} style={{ marginLeft: 3 }} />}
            </button>
            <button className="pomodoro-btn-icon" title="Pular fase" onClick={skip}><SkipForward size={16} /></button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
            {([
              { phase: 'focus'       as Phase, label: 'Foco',        color: 'var(--color-primary)'  },
              { phase: 'short-break' as Phase, label: 'Pausa',       color: 'var(--color-success)'  },
              { phase: 'long-break'  as Phase, label: 'Pausa Longa', color: 'var(--color-tertiary)' },
            ]).map(({ phase: p, label, color }) => (
              <button key={p} onClick={() => switchPhase(p)}
                style={{
                  padding: '6px 14px', borderRadius: 20,
                  border: `1px solid ${phase === p ? color : 'var(--border-color)'}`,
                  background: phase === p ? `${color}22` : 'transparent',
                  color: phase === p ? color : 'var(--text-secondary)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                {label}
              </button>
            ))}
          </div>

          <button onClick={() => setShowSettings(s => !s)}
            style={{ marginTop: 16, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <Settings size={14} /> Configurações
          </button>

          {showSettings && (
            <div className="pomodoro-settings-panel" style={{ width: '100%', maxWidth: 360, marginTop: 16 }}>
              {([
                { label: 'Foco (min)', value: focusMin, setter: setFocusMin, min: 5, max: 90 },
                { label: 'Pausa (min)', value: breakMin, setter: setBreakMin, min: 1, max: 30 },
                { label: 'Pausa Longa', value: longMin, setter: setLongMin, min: 5, max: 60 },
              ] as { label: string; value: number; setter: (n: number) => void; min: number; max: number }[]).map(({ label, value, setter, min, max }) => (
                <div key={label}>
                  <div className="pomodoro-setting-label">{label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="range" min={min} max={max} value={value}
                      onChange={e => { setter(Number(e.target.value)); if (!running) reset(); }}
                      style={{ flex: 1 }} />
                    <span style={{ fontSize: 14, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{value}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Side panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="glass-card" style={{ padding: 20 }}>
            <div className="sidebar-section-label" style={{ marginBottom: 10 }}>Estudando</div>
            <select className="form-input" value={topicId} onChange={e => setTopicId(e.target.value)}>
              <option value="">Sessão livre</option>
              {visibleTopics.map(t => (
                <option key={t.id} value={t.id}>{subjects.find(s => s.id === t.subjectId)?.name} › {t.name}</option>
              ))}
            </select>
            {topicId && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                Cards pendentes: <strong style={{ color: 'var(--color-primary-light)' }}>{dueForTopic}</strong>
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: 20 }}>
            <div className="sidebar-section-label" style={{ marginBottom: 16 }}>Hoje</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Sessões concluídas', value: sessions,                icon: <CheckCircle size={16} style={{ color: 'var(--color-success)' }} /> },
                { label: 'Tempo de foco',      value: `${sessions * focusMin} min`, icon: <Clock size={16} style={{ color: 'var(--color-primary-light)' }} /> },
                { label: 'Próxima pausa',       value: phase === 'focus' ? `em ${mm}:${ss}` : 'Em andamento', icon: <Timer size={16} style={{ color: 'var(--color-warning)' }} /> },
              ].map(({ label, value, icon }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>{icon} {label}</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card" style={{ padding: 20 }}>
            <div className="sidebar-section-label" style={{ marginBottom: 10 }}>Técnica Pomodoro</div>
            {[
              { icon: '🎯', text: `${focusMin} min de foco total` },
              { icon: '☕', text: `${breakMin} min de pausa curta` },
              { icon: '🛋️', text: `${longMin} min após 4 sessões` },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span>{icon}</span> {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
