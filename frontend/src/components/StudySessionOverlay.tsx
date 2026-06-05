import React, { useEffect } from 'react';
import { X, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

const RATINGS = [
  { value: 1, label: 'Não lembrei', key: '1', color: 'var(--color-danger)' },
  { value: 3, label: 'Difícil',     key: '2', color: 'var(--color-warning)' },
  { value: 4, label: 'Boa',         key: '3', color: 'var(--color-tertiary)' },
  { value: 5, label: 'Fácil',       key: '4', color: 'var(--color-success)' },
];

export default function StudySessionOverlay() {
  const {
    sessionCards, currentSessionCardIndex,
    isCardFlipped, setIsCardFlipped,
    sessionDone, sessionStats, requeuedCardIds,
    handleReviewCard, closeSession,
  } = useApp();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeSession(); return; }
      if (sessionDone) return;
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsCardFlipped(f => !f);
        return;
      }
      if (isCardFlipped) {
        const idx = ['1','2','3','4'].indexOf(e.key);
        if (idx !== -1) handleReviewCard(RATINGS[idx].value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isCardFlipped, sessionDone, setIsCardFlipped, handleReviewCard, closeSession]);

  if (sessionDone && sessionStats) {
    const elapsed = Math.round((Date.now() - sessionStats.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const total = sessionStats.ratings.length;
    const counts = RATINGS.map(r => ({
      ...r,
      count: sessionStats.ratings.filter(v => v === r.value).length,
    }));

    return (
      <div className="study-overlay">
        <div className="study-overlay-inner" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <CheckCircle2 size={48} style={{ color: 'var(--color-success)' }} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', margin: 0 }}>Sessão concluída!</h2>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              {total} card{total !== 1 ? 's' : ''} · {mins}m {secs.toString().padStart(2,'0')}s
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
            {counts.map(r => (
              <div key={r.value} style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius)',
                padding: '0.875rem',
                borderLeft: `3px solid ${r.color}`,
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: r.color }}>{r.count}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {r.key} · {r.label}
                </div>
              </div>
            ))}
          </div>

          <button className="btn-primary" style={{ width: '100%' }} onClick={closeSession}>
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const card = sessionCards[currentSessionCardIndex];
  if (!card) return null;

  const isRequeued = requeuedCardIds.has(card.id);
  const progress = Math.round(((currentSessionCardIndex + 1) / sessionCards.length) * 100);

  return (
    <div className="study-overlay">
      <div className="study-overlay-inner">
        {/* Header */}
        <div className="study-overlay-header">
          <div className="study-overlay-progress-wrap">
            <div className="study-overlay-progress-bar">
              <div className="study-overlay-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="study-overlay-counter">
              {currentSessionCardIndex + 1} / {sessionCards.length}
            </span>
          </div>
          <button className="btn-ghost btn-icon" onClick={closeSession} title="Fechar (Esc)">
            <X size={18} />
          </button>
        </div>

        {/* Re-queue badge */}
        {isRequeued && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,180,171,0.12)', border: '1px solid rgba(255,180,171,0.3)',
            borderRadius: 8, padding: '6px 12px', fontSize: 12,
            color: 'var(--color-danger)', alignSelf: 'stretch',
          }}>
            <AlertCircle size={14} />
            Revisando novamente — você errou este card antes
          </div>
        )}

        {/* Card */}
        <div
          className={`study-card-flip ${isCardFlipped ? 'flipped' : ''}`}
          onClick={() => setIsCardFlipped(!isCardFlipped)}
        >
          <div className="study-card-front">
            <p className="study-card-side-label">Frente</p>
            <p className="study-card-text">{card.front}</p>
            <p className="study-card-hint">Clique ou pressione Espaço</p>
          </div>
          <div className="study-card-back">
            <p className="study-card-side-label">Verso</p>
            <p className="study-card-text">{card.back}</p>
          </div>
        </div>

        {/* Actions */}
        {isCardFlipped && (
          <div className="study-rating-row">
            {RATINGS.map(r => (
              <button
                key={r.value}
                className="study-rating-btn"
                style={{ '--rating-color': r.color } as React.CSSProperties}
                onClick={() => handleReviewCard(r.value)}
                title={`Tecla ${r.key}`}
              >
                <span className="study-rating-key">{r.key}</span>
                {r.label}
              </button>
            ))}
          </div>
        )}

        {!isCardFlipped && (
          <button
            className="btn-primary"
            style={{ alignSelf: 'center', marginTop: '1rem' }}
            onClick={() => setIsCardFlipped(true)}
          >
            <RotateCcw size={16} /> Revelar
          </button>
        )}

        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
          Espaço = virar · 1–4 = avaliar · Esc = fechar
        </p>
      </div>
    </div>
  );
}
