import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, RotateCw, CheckCircle, Clock, Timer, Settings, Target, Coffee, Zap } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import './Pomodoro.css';


type Phase = 'focus' | 'short-break' | 'long-break';

const CIRCUMFERENCE = 2 * Math.PI * 90;

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
                { label: 'Foco (min)',    value: focusMin, setter: applyFocus, min: 5,  max: 90 },
                { label: 'Pausa (min)',   value: breakMin, setter: applyBreak, min: 1,  max: 30 },
                { label: 'Pausa Longa',  value: longMin,  setter: applyLong,  min: 5,  max: 60 },
              ] as { label: string; value: number; setter: (n: number) => void; min: number; max: number }[]).map(({ label, value, setter, min, max }) => (
                <div key={label}>
                  <div className="pomodoro-setting-label">{label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="range" min={min} max={max} value={value}
                      onChange={e => setter(Number(e.target.value))}
                      style={{ flex: 1 }} />
                    <span style={{ fontSize: 14, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{value}</span>
                  </div>
                </div>
              ))}
              {running && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  Alterações terão efeito na próxima fase.
                </p>
              )}
              {'Notification' in window && Notification.permission !== 'granted' && (
                <button type="button"
                  onClick={() => Notification.requestPermission()}
                  style={{ marginTop: 12, background: 'none', border: '1px solid var(--color-primary)', borderRadius: 8, padding: '7px 14px', fontSize: 12, color: 'var(--color-primary-light)', cursor: 'pointer', fontWeight: 600, width: '100%' }}>
                  Permitir notificações do browser
                </button>
              )}
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
                { label: 'Sessões concluídas', value: sessions,                     icon: <CheckCircle size={16} style={{ color: 'var(--color-success)' }} /> },
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
              { icon: <Target size={14} color="var(--color-primary-light)" />, text: `${focusMin} min de foco total` },
              { icon: <Coffee size={14} color="var(--color-success)" />,       text: `${breakMin} min de pausa curta` },
              { icon: <Zap size={14} color="var(--color-tertiary)" />,         text: `${longMin} min após 4 sessões` },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                {icon} {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
