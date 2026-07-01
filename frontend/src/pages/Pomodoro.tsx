import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, RotateCw, Settings, ChevronDown, Volume2, VolumeX, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import './Pomodoro.css';
import CustomSelect from '../components/CustomSelect';

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
  const {
    cards,
    visibleTopics,
    subjects,
    playingAudio,
    selectedTrack,
    volume,
    curatedTracks,
    customTracks,
    togglePlayAudio,
    handleSelectTrack,
    addCustomTrack,
    setVolume,
  } = useApp();

  const [phase,        setPhase]        = useState<Phase>('focus');
  const [running,      setRunning]       = useState(false);
  const [seconds,      setSeconds]       = useState(25 * 60);
  const [round,        setRound]         = useState(1);
  const [sessions,     setSessions]      = useState(0);
  const [dailyGoal,    setDailyGoal]     = useState(() => Number(localStorage.getItem('pomo_daily_goal') || '8'));

  const handleGoalChange = (newGoal: number) => {
    const val = Math.max(1, Math.min(24, newGoal));
    setDailyGoal(val);
    localStorage.setItem('pomo_daily_goal', String(val));
  };

  // Durations — stored in localStorage, applied to timer when not running
  const [focusMin,  setFocusMinState]  = useState(() => Number(localStorage.getItem('pomo_focus') ?? 25));
  const [breakMin,  setBreakMinState]  = useState(() => Number(localStorage.getItem('pomo_break') ?? 5));
  const [longMin,   setLongMinState]   = useState(() => Number(localStorage.getItem('pomo_long')  ?? 15));

  const [topicId,      setTopicId]       = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Custom link modal states
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customUrl, setCustomUrl] = useState('');

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

  const onSelectTrack = (trackId: string) => {
    if (trackId === 'add_custom') {
      setShowCustomModal(true);
      return;
    }
    handleSelectTrack(trackId);
  };

  function getYoutubeId(url: string) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
  }

  const handleAddCustomTrack = () => {
    if (!customUrl.trim()) {
      alert('Por favor, informe a URL ou ID do vídeo do YouTube.');
      return;
    }
    const trackName = customName.trim() || 'Som Personalizado';
    const parsedId = getYoutubeId(customUrl.trim());
    if (!parsedId || parsedId.length !== 11) {
      alert('ID do YouTube inválido. Certifique-se de usar um link de vídeo ou ID de 11 caracteres válido.');
      return;
    }
    addCustomTrack(trackName, parsedId);
    
    setCustomName('');
    setCustomUrl('');
    setShowCustomModal(false);
  };

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
  }, [seconds, running]);

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
    if (!running && phase === 'focus') setSeconds(n * 60);
  };
  const applyBreak = (n: number) => {
    setBreakMin(n);
    if (!running && phase === 'short-break') setSeconds(n * 60);
  };
  const applyLong = (n: number) => {
    setLongMin(n);
    if (!running && phase === 'long-break') setSeconds(n * 60);
  };

  const totalSecs  = phase === 'focus' ? focusMin * 60 : phase === 'short-break' ? breakMin * 60 : longMin * 60;
  const progress   = totalSecs > 0 ? seconds / totalSecs : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const activeColor = phase === 'focus' ? 'var(--color-primary)' : phase === 'short-break' ? 'var(--color-tertiary)' : 'var(--text-muted)';

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const dueForTopic = topicId ? cards.filter(c => c.topicId === topicId && new Date(c.nextReview) <= new Date()).length : 0;



  return (
    <div className="page" style={{ padding: '24px 24px 48px' }}>
      {/* Page Header */}
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 22px' }}>
        Pomodoro
      </h2>

      {/* Bento Grid */}
      <div className="pomo-bento-grid">

        {/* Left Card - Timer (spans 2 rows) */}
        <div className="pomo-timer-card">

          {/* Segmented Control */}
          <div className="pomo-seg">
            {([
              { phase: 'focus' as Phase, label: 'Foco' },
              { phase: 'short-break' as Phase, label: 'Pausa Curta' },
              { phase: 'long-break' as Phase, label: 'Longa' },
            ]).map(p => (
              <button
                key={p.phase}
                onClick={() => switchPhase(p.phase)}
                className={phase === p.phase ? 'active' : ''}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Timer Ring */}
          <div style={{ position: 'relative', width: 'min(260px, 100%)', aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={46} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1.5" />
              <circle
                cx={50}
                cy={50}
                r={46}
                fill="none"
                stroke="rgba(254,242,228,.9)"
                strokeWidth="2.5"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                strokeLinecap="square"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10, textAlign: 'center' }}>
              {/* Phase indicator */}
              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-label)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  color: 'var(--bg-base)',
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <span style={{ width: 6, height: 6, backgroundColor: 'white', marginRight: 8, display: 'inline-block' }} />
                {phase === 'focus' ? 'Foco' : phase === 'short-break' ? 'Pausa' : 'Pausa Longa'}
              </span>

              {/* Timer digits */}
              <h2 style={{ fontSize: 'clamp(42px, 12vw, 68px)', fontFamily: 'var(--font-label)', fontWeight: 500, color: 'var(--bg-base)', margin: '0 0 14px', fontFeatureSettings: "'tnum'" }}>
                {mm}:{ss}
              </h2>

              {/* Round dots */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  {[1, 2, 3, 4].map(r => (
                    <div
                      key={r}
                      style={{
                        width: 8,
                        height: 8,
                        border: `1px solid ${r <= round ? 'white' : 'rgba(255,255,255,.4)'}`,
                        backgroundColor: r < round ? 'white' : r === round ? 'rgba(255,255,255,.55)' : 'transparent',
                        borderRadius: '1px',
                      }}
                    />
                  ))}
                </div>
                <span className="academic-label" style={{ fontSize: 9, color: 'rgba(255,255,255,.7)' }}>
                  Sessão {round} de 4
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={reset}
              title="Reiniciar"
              style={{
                background: 'rgba(255,255,255,.16)',
                border: '1px solid rgba(255,255,255,.3)',
                borderRadius: 9,
                padding: '13px 18px',
                color: 'var(--bg-base)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <RotateCw size={18} />
            </button>

            <button
              onClick={() => setRunning(r => !r)}
              style={{
                background: 'var(--bg-base)',
                color: 'var(--color-primary)',
                border: 'none',
                borderRadius: 9,
                padding: '13px 36px',
                fontFamily: 'var(--font-label)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {running ? <><Pause size={16} /> Pausar</> : <><Play size={16} style={{ marginLeft: 1 }} /> Iniciar</>}
            </button>

            <button
              onClick={skip}
              title="Pular fase"
              style={{
                background: 'rgba(255,255,255,.16)',
                border: '1px solid rgba(255,255,255,.3)',
                borderRadius: 9,
                padding: '13px 18px',
                color: 'var(--bg-base)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <SkipForward size={18} />
            </button>
          </div>
        </div>

        {/* Top-right Card - Meta do dia */}
        <div className="pomo-meta-card">
          <span className="academic-label" style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 10 }}>
            META DO DIA
          </span>
          <div style={{ fontSize: 36, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'baseline', gap: 4 }}>
            {sessions}
            <span style={{ fontSize: 20, color: 'var(--text-muted)', fontWeight: 400 }}>/</span>
            <input
              type="number"
              min="1"
              max="24"
              value={dailyGoal}
              onChange={e => handleGoalChange(Number(e.target.value))}
              style={{
                width: '42px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                padding: '1px 4px',
                fontSize: '20px',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                color: 'var(--text-primary)',
                textAlign: 'center',
                outline: 'none',
                cursor: 'pointer',
              }}
              title="Alterar meta diária"
            />
          </div>

          {/* Progress bars */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {Array.from({ length: dailyGoal }, (_, i) => i + 1).map(s => (
              <div
                key={s}
                style={{
                  flex: '1 0 auto',
                  minWidth: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: s <= sessions ? 'var(--color-primary)' : 'var(--border-subtle)',
                  transition: 'background-color 0.3s ease',
                }}
              />
            ))}
          </div>

          {sessions >= dailyGoal && (
            <span style={{
              display: 'inline-block',
              marginTop: 10,
              fontSize: 10,
              color: 'var(--color-success)',
              fontWeight: 700,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              padding: '2px 8px',
              borderRadius: 4,
            }}>
              Meta Concluída! 🎉
            </span>
          )}
        </div>

        {/* Bottom-right Card - Som Ambiente */}
        <div className="pomo-sound-card">
          <span style={{ fontSize: 10, fontFamily: 'var(--font-label)', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.75, display: 'block', marginBottom: 14 }}>
            ♪ SOM AMBIENTE
          </span>

          {/* Track selector */}
          <div style={{ marginBottom: 14 }}>
            <CustomSelect
              variant="default"
              style={{ width: '100%' }}
              value={selectedTrack?.youtubeId ?? ''}
              onChange={onSelectTrack}
              placeholder="Selecione um som..."
              options={[
                ...curatedTracks.map(t => ({ value: t.youtubeId, label: t.name })),
                ...customTracks.map(t => ({ value: t.youtubeId, label: `[Meu] ${t.name}` })),
                { value: 'add_custom', label: '+ Adicionar link personalizado...' },
              ]}
            />
          </div>

          {/* Player Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={togglePlayAudio}
              disabled={!selectedTrack}
              style={{
                width: 36,
                height: 36,
                backgroundColor: 'rgba(255,255,255,.2)',
                color: '#f5ede3',
                border: '1px solid rgba(255,255,255,.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: '6px',
                opacity: selectedTrack ? 1 : 0.5,
                flexShrink: 0,
              }}
              title={playingAudio ? 'Pausar áudio' : 'Tocar áudio'}
            >
              {playingAudio ? <Pause size={15} /> : <Play size={15} style={{ marginLeft: 1 }} />}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <button
                onClick={() => setVolume(volume === 0 ? 50 : 0)}
                style={{ background: 'none', border: 'none', color: '#f5ede3', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, opacity: 0.8 }}
              >
                {volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={e => setVolume(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#f5ede3' }}
              />
              <span style={{ fontSize: 11, color: 'rgba(245,237,227,.75)', minWidth: 28, textAlign: 'right' }}>{volume}%</span>
            </div>
          </div>
        </div>

      </div>

      {/* Contexto de Estudo */}
      <div style={{ marginBottom: 24 }}>
        <label className="academic-label" style={{ fontSize: 10, display: 'block', marginBottom: 8 }}>Contexto de Estudo</label>
        <CustomSelect
          variant="notebook"
          style={{ width: '100%' }}
          value={topicId}
          onChange={setTopicId}
          options={[
            { value: '', label: 'Sessão livre' },
            ...visibleTopics.map(t => ({
              value: t.id,
              label: `${subjects.find(s => s.id === t.subjectId)?.name ?? ''} › ${t.name}`,
            })),
          ]}
        />
        {topicId && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', marginTop: 12, borderRadius: '6px' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Cards pendentes nesta matéria</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)' }}>{dueForTopic}</span>
          </div>
        )}
      </div>

      {/* Retractable Settings */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 24 }}>
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
            letterSpacing: '0.1em',
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
              { label: 'Foco (min)',   value: focusMin, setter: applyFocus, min: 5,  max: 90 },
              { label: 'Pausa (min)', value: breakMin, setter: applyBreak, min: 1,  max: 30 },
              { label: 'Pausa Longa', value: longMin,  setter: applyLong,  min: 5,  max: 60 },
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

      {/* Add Custom Track Modal */}
      {showCustomModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCustomModal(false); }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--color-primary)' }}>Adicionar Link do YouTube</h3>
              <button className="btn-ghost btn-icon" onClick={() => setShowCustomModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="academic-label" style={{ fontSize: 9, display: 'block', marginBottom: 6 }}>Nome do Som</label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="Ex: Minha Playlist de Foco"
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label className="academic-label" style={{ fontSize: 9, display: 'block', marginBottom: 6 }}>URL ou ID do YouTube</label>
                <input
                  type="text"
                  value={customUrl}
                  onChange={e => setCustomUrl(e.target.value)}
                  placeholder="Ex: https://www.youtube.com/watch?v=..."
                  style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <button
                className="btn-primary"
                onClick={handleAddCustomTrack}
                style={{ width: '100%', padding: '10px 24px', marginTop: 8 }}
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
