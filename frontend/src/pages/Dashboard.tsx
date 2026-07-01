import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RotateCw, RefreshCw, ShieldAlert, Clock } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { getEventMeta } from '../lib/constants';
import GettingStartedCard from '../components/GettingStartedCard';
import './Dashboard.css';

const HEAT_DAYS = 84; // 12 weeks

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    currentUser,
    cards, metrics, insights, insightsLoading, insightsLastUpdated,
    calendarEvents, planStatus, eventTypes,
    fetchInsights, handleRefreshInsights,
    openEditEvent, startStudySession,
  } = useApp();

  useEffect(() => { fetchInsights(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isMobile = useIsMobile();
  const now = new Date();

  // Stats
  const dueCount = cards.filter(c => new Date(c.nextReview) <= now).length;
  const retention = Math.round(metrics?.retentionRate ?? 0);

  const streak = (() => {
    const days = [...(metrics?.dailyActivity ?? [])].reverse();
    let count = 0;
    for (const d of days) { if (d.count > 0) count++; else break; }
    return count;
  })();

  // Greeting
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = currentUser?.nickname || currentUser?.name?.split(' ')[0] || '';
  const formattedDate = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const dateLabel = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // Today's agenda
  const todayStr = now.toISOString().slice(0, 10);
  const todayDow = now.getDay();
  const todayEvents = calendarEvents
    .filter(e => {
      const isToday = e.startAt.slice(0, 10) === todayStr;
      const isRecurringToday = e.recurrenceDays.includes(todayDow);
      return isToday || isRecurringToday;
    })
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, 3);

  // Subject performance (top 3 by reviewed count)
  const topSubjects = [...(metrics?.subjectsPerformance ?? [])]
    .sort((a, b) => b.reviewedCards - a.reviewedCards)
    .slice(0, 3);

  // Heatmap — 84 days aligned to fill grid top-to-bottom
  const actDays = metrics?.dailyActivity ?? [];
  const heatData = Array.from({ length: HEAT_DAYS }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (HEAT_DAYS - 1 - i));
    const ds = d.toISOString().slice(0, 10);
    return actDays.find(a => a.date === ds)?.count ?? 0;
  });

  const heatStart = new Date(now);
  heatStart.setDate(heatStart.getDate() - HEAT_DAYS + 1);
  const heatLabel = `${heatStart.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()} — ${now.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}`;

  // Primary AI insight
  const topInsight = insights[0] ?? null;

  return (
    <div className="page" style={{ padding: isMobile ? '16px 16px 48px' : '28px 32px 48px' }}>
      <PlanBanner planStatus={planStatus} />
      <GettingStartedCard />

      {/* ── Header ── */}
      <div className="db-header">
        <div style={{ flex: 1 }}>
          <h2 className="db-greeting">{greeting}{firstName ? `, ${firstName}` : ''}</h2>
          <p className="db-date">{dateLabel}</p>
        </div>
        {!isMobile && (
          <button className="btn btn-primary" onClick={() => startStudySession(undefined, true)}>
            Estudar agora
          </button>
        )}
      </div>

      {/* ── Row 1: 4 stat cards ── */}
      <div className="db-row db-row-4">

        {/* Sequência */}
        <div className="db-card db-card-primary">
          <div className="db-card-label">SEQUÊNCIA 🔥</div>
          <div className="db-card-num">{streak}</div>
          <div className="db-card-sub">dias seguidos</div>
        </div>

        {/* Cards Hoje */}
        <div className="db-card">
          <div className="db-card-label">CARDS HOJE</div>
          <div className="db-card-num">{dueCount}</div>
          <div className="db-card-sub">pendentes</div>
        </div>

        {/* Retenção — donut */}
        <div className="db-card db-card-flex">
          <div
            className="db-donut"
            style={{
              background: `conic-gradient(var(--color-tertiary) ${retention}%, var(--border-subtle) 0)`,
            }}
          >
            <div className="db-donut-inner" style={{ color: 'var(--color-tertiary)' }}>
              {retention}%
            </div>
          </div>
          <div>
            <div className="db-card-label" style={{ marginBottom: 4 }}>RETENÇÃO</div>
            <div className="db-card-sub" style={{ color: 'var(--color-tertiary)' }}>média geral</div>
          </div>
        </div>

        {/* Cards Totais */}
        <div className="db-card">
          <div className="db-card-label">CARDS TOTAIS</div>
          <div className="db-card-num">{cards.length}</div>
          <div className="db-card-sub">cadastrados</div>
        </div>
      </div>

      {/* ── Row 2: Heatmap + IA Insight ── */}
      <div className="db-row db-row-2">

        {/* Heatmap */}
        <div className="db-card">
          <div className="db-card-head">
            <span className="db-card-title">Atividade</span>
            <span style={{ fontFamily: 'var(--font-label)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '.1em' }}>
              {heatLabel}
            </span>
          </div>
          <div className="db-heatmap">
            {heatData.map((count, i) => {
              const opacity = count === 0 ? 0.2 : count < 3 ? 0.35 : count < 8 ? 0.65 : 1;
              return (
                <i
                  key={i}
                  className="db-heat-cell"
                  style={{
                    backgroundColor: count === 0 ? 'var(--border-color)' : 'var(--color-primary)',
                    opacity,
                  }}
                  title={`${count} revisões`}
                />
              );
            })}
          </div>
          <div className="db-heat-legend">
            <span>menos</span>
            {[0.2, 0.35, 0.65, 1].map((op, i) => (
              <i
                key={i}
                style={{
                  width: 10, height: 10, borderRadius: 2, display: 'inline-block', flexShrink: 0,
                  backgroundColor: op === 0.2 ? 'var(--border-color)' : 'var(--color-primary)',
                  opacity: op,
                }}
              />
            ))}
            <span>mais</span>
          </div>
        </div>

        {/* IA Insight */}
        <div className="db-card db-card-dark">
          <div className="db-card-label" style={{ marginBottom: 12, opacity: 0.75 }}>◐ IA · INSIGHT</div>

          {!planStatus?.isActive ? (
            <p className="db-insight-text" style={{ opacity: 0.7 }}>
              Insights personalizados disponíveis no Plano Estudante.
            </p>
          ) : insightsLoading && !insights.length ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.7, fontSize: 13, fontFamily: 'var(--font-body)' }}>
              <RotateCw size={14} className="animate-spin" /> Analisando seus estudos…
            </div>
          ) : topInsight ? (
            <>
              <p className="db-insight-text">{topInsight.message}</p>
              <button className="db-insight-btn" onClick={handleRefreshInsights} disabled={insightsLoading}>
                {insightsLoading && <RefreshCw size={12} className="animate-spin" />}
                Revisar agora →
              </button>
            </>
          ) : (
            <p className="db-insight-text" style={{ opacity: 0.7 }}>
              Faça revisões regulares para receber insights personalizados.
            </p>
          )}

          {insightsLastUpdated && !insightsLoading && (
            <span style={{ fontFamily: 'var(--font-label)', fontSize: 10, opacity: 0.5, marginTop: 'auto', paddingTop: 12, display: 'block' }}>
              atualizado às {insightsLastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* ── Row 3: Agenda + Desempenho ── */}
      <div className="db-row db-row-2" style={{ marginBottom: 0 }}>

        {/* Agenda de hoje */}
        <div className="db-card">
          <div className="db-card-head">
            <span className="db-card-title">Agenda de hoje</span>
            <button className="db-link" onClick={() => navigate('/calendario')}>ver tudo</button>
          </div>
          {todayEvents.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0 0' }}>Nenhum evento para hoje.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayEvents.map(ev => {
                const meta = getEventMeta(ev.type, eventTypes);
                const d = new Date(ev.startAt);
                const timeStr = ev.allDay
                  ? 'dia todo'
                  : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div
                    key={ev.id}
                    className="db-agenda-item"
                    style={{ borderLeftColor: meta.color || 'var(--color-primary)' }}
                    onClick={() => { navigate('/calendario'); openEditEvent(ev); }}
                  >
                    <span className="db-agenda-time" style={{ color: meta.color || 'var(--color-primary)' }}>
                      {timeStr}
                    </span>
                    <span className="db-agenda-title">{ev.title}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Desempenho por matéria */}
        <div className="db-card">
          <div className="db-card-head">
            <span className="db-card-title">Desempenho por matéria</span>
            <button className="db-link" onClick={() => navigate('/materias')}>ver tudo</button>
          </div>
          {topSubjects.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0 0' }}>Nenhuma revisão registrada.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {topSubjects.map((s, i) => {
                const rate = Math.round(s.retentionRate ?? 0);
                const isGood = rate >= 70;
                return (
                  <div
                    key={s.subjectId}
                    className="db-session-row"
                    style={{
                      borderBottom: i < topSubjects.length - 1
                        ? '1px solid var(--border-subtle)'
                        : 'none',
                    }}
                  >
                    <span className="db-session-name">{s.subjectName}</span>
                    <span
                      className="db-session-badge"
                      style={{
                        color: isGood ? 'var(--color-tertiary)' : 'var(--color-primary)',
                        background: isGood
                          ? 'rgba(51,77,47,.12)'
                          : 'rgba(163,59,58,.12)',
                      }}
                    >
                      {rate}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Plan Banner ──────────────────────────────────────────────────────────────

function PlanBanner({
  planStatus,
}: {
  planStatus: ReturnType<typeof useApp>['planStatus'];
}) {
  if (!planStatus) return null;

  if (!planStatus.isActive) {
    return (
      <div style={{
        marginBottom: 20, padding: '14px 20px', borderRadius: 'var(--radius-md)',
        background: 'rgba(186,26,26,.08)', border: '1px solid var(--color-danger)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldAlert size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-danger)' }}>Período gratuito encerrado</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Assine o Plano Estudante para continuar usando a IA, insights e WhatsApp.</div>
          </div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>🔒 Em breve</span>
      </div>
    );
  }

  if (planStatus.plan === 'FREE_TRIAL' && planStatus.trialDaysLeft <= 3) {
    return (
      <div style={{
        marginBottom: 20, padding: '14px 20px', borderRadius: 'var(--radius-md)',
        background: 'rgba(217,119,6,.08)', border: '1px solid var(--color-warning)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={18} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            Restam <strong>{planStatus.trialDaysLeft} dia{planStatus.trialDaysLeft !== 1 ? 's' : ''}</strong> de período gratuito.
          </span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>🔒 Em breve</span>
      </div>
    );
  }

  return null;
}
