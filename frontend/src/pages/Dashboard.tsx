import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RotateCw, Star, Calendar, ShieldAlert, Clock, Zap, RefreshCw,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { getEventMeta } from '../lib/constants';
import { EventIcon } from '../components/EventIcon';
import GettingStartedCard from '../components/GettingStartedCard';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    cards, metrics, insights, insightsLoading, insightsLastUpdated,
    calendarEvents, planStatus, eventTypes,
    fetchInsights, handleRefreshInsights,
    setUpgradeModalOpen,
    openEditEvent, startStudySession,
  } = useApp();

  useEffect(() => {
    fetchInsights();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dueCount = cards.filter(c => new Date(c.nextReview) <= new Date()).length;

  const streak = (() => {
    const days = [...(metrics?.dailyActivity ?? [])].reverse();
    let count = 0;
    for (const d of days) {
      if (d.count > 0) count++;
      else break;
    }
    return count;
  })();

  const upcoming = calendarEvents
    .filter(e => new Date(e.startAt) >= new Date() || e.recurrenceDays.length > 0)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .slice(0, 4);

  return (
    <div className="page" style={{ padding: '24px 24px 48px' }}>
      {/* Page Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, borderBottom: '1px solid var(--border-color)', paddingBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 300, color: 'var(--text-primary)', margin: 0 }}>Dashboard</h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--text-muted)', marginTop: 8, maxWidth: 500, lineHeight: 1.5 }}>
            Visão geral do seu progresso acadêmico. Mantenha o foco na retenção e revisão regular.
          </p>
        </div>
      </header>

      {/* Plan banners */}
      <PlanBanner planStatus={planStatus} onUpgrade={() => setUpgradeModalOpen(true)} />

      <GettingStartedCard />

      {/* Stats Grid (Swiss Grid Pattern) */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', borderBottom: '1px solid var(--border-color)', marginBottom: 40, paddingBottom: 24, gap: 24 }}>
        {/* Stat 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid var(--border-color)', paddingRight: 16 }}>
          <span className="academic-label" style={{ marginBottom: 12 }}>Cards Totais</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 300, color: 'var(--text-primary)' }}>
            {cards.length}
          </div>
        </div>
        {/* Stat 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid var(--border-color)', paddingRight: 16 }}>
          <span className="academic-label" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            Agendados
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'inline-block' }}></span>
          </span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 300, color: 'var(--text-primary)' }}>
            {dueCount}
          </div>
        </div>
        {/* Stat 3 */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid var(--border-color)', paddingRight: 16 }}>
          <span className="academic-label" style={{ marginBottom: 12 }}>Streak Atual</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 300, color: 'var(--text-primary)' }}>
            {streak} <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>dias</span>
          </div>
        </div>
        {/* Stat 4 */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <span className="academic-label" style={{ marginBottom: 12 }}>Retenção Média</span>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 300, color: 'var(--text-primary)' }}>
            {metrics ? (metrics.retentionRate ?? 0).toFixed(1) : '0.0'} <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>%</span>
          </div>
        </div>
      </section>

      {/* Bento Grid: Middle Section */}
      <section className="bento-grid">
        {/* Heatmap (Span 8) */}
        <div className="bento-col-8" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>Atividade (28 dias)</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontFamily: 'var(--font-label)', color: 'var(--text-secondary)' }}>
              <span>menos</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, border: '1px solid var(--border-color)', backgroundColor: 'transparent' }}></div>
                <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'var(--color-primary)', opacity: 0.3 }}></div>
                <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'var(--color-primary)', opacity: 0.6 }}></div>
                <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: 'var(--color-primary)', opacity: 1 }}></div>
              </div>
              <span>mais</span>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, width: '100%', maxWidth: 360 }}>
              {/* Week Days Headers */}
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                <div key={idx} style={{ fontFamily: 'var(--font-label)', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 4 }}>
                  {day}
                </div>
              ))}
              {/* Row cells */}
              {(metrics?.dailyActivity ?? []).slice(-28).map((day, i) => {
                const lv = day.count === 0 ? 0 : day.count < 3 ? 0.3 : day.count < 8 ? 0.6 : 1;
                return (
                  <div
                    key={i}
                    style={{
                      aspectRatio: 1,
                      borderRadius: 3,
                      border: day.count === 0 ? '1px solid var(--border-color)' : 'none',
                      backgroundColor: day.count === 0 ? 'transparent' : 'var(--color-primary)',
                      opacity: day.count === 0 ? 1 : lv,
                      transition: 'background-color var(--transition)',
                    }}
                    title={`${day.date}: ${day.count} revisões`}
                  />
                );
              })}
              {Array.from({ length: Math.max(0, 28 - (metrics?.dailyActivity.length ?? 0)) }).map((_, i) => (
                <div
                  key={`e${i}`}
                  style={{
                    aspectRatio: 1,
                    borderRadius: 3,
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'transparent',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* AI Insights Panel (Span 4) */}
        <div className="bento-col-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <h3 className="academic-label" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <Zap size={14} style={{ color: 'var(--color-primary-text)' }} /> Insights da IA
          </h3>

          {!planStatus?.isActive ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Zap size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>Insights no Plano Estudante</p>
              <p style={{ fontSize: 12, marginBottom: 16 }}>A IA analisa seu histórico e gera recomendações personalizadas.</p>
              <button onClick={() => setUpgradeModalOpen(true)} className="btn-oxblood" style={{ width: '100%' }}>
                <Star size={12} /> Assinar
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                {insightsLastUpdated && !insightsLoading && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    atualizado às {insightsLastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                <button onClick={handleRefreshInsights} disabled={insightsLoading}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, marginLeft: 'auto' }}>
                  <RefreshCw size={12} className={insightsLoading ? 'animate-spin' : ''} /> Atualizar
                </button>
              </div>

              {insightsLoading && !insights.length && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '24px 0', color: 'var(--text-secondary)' }}>
                  <RotateCw size={16} className="animate-spin" />
                  <span style={{ fontSize: 13 }}>Analisando estudos...</span>
                </div>
              )}

              {!insightsLoading && !insights.length && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '16px 0', textAlign: 'center' }}>
                  Nenhum insight ainda. Faça revisões regulares!
                </p>
              )}

              {insights.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--border-color)', overflowY: 'auto', maxH: '250px' }}>
                  {insights.slice(0, 3).map((ins, i) => {
                    return (
                      <li key={i} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'start', gap: 10 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: ins.priority === 'high' ? 'var(--color-danger)' : 'var(--color-primary)', marginTop: 8, flexShrink: 0 }}></span>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px' }}>{ins.title}</p>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{ins.message}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </div>
      </section>

      {/* Bottom Section: Performance & Upcoming Events split layout */}
      <div className="bento-grid" style={{ marginBottom: 0 }}>
        {/* Performance Table Section (Span 8) */}
        <div className="bento-col-8" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>Desempenho por Matéria</h3>
            <button
              onClick={() => navigate('/materias')}
              style={{
                fontFamily: 'var(--font-label)', fontSize: 12, color: 'var(--text-muted)',
                cursor: 'pointer', background: 'none', border: 'none', textDecoration: 'underline',
                textUnderlineOffset: '4px'
              }}
            >
              Ver Todas as Matérias
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', borderRadius: 'var(--radius-md)' }}>
            {/* Table Header */}
            <div className="perf-table-header">
              <div>Matéria / Disciplina</div>
              <div style={{ textAlign: 'right' }}>Cards Totais</div>
              <div style={{ textAlign: 'right' }}>Revisados</div>
              <div style={{ textAlign: 'right' }}>Taxa de Retenção</div>
            </div>

            {/* Rows */}
            {metrics?.subjectsPerformance.map((s, i) => {
              const retention = s.retentionRate ?? 0;
              return (
                <div key={i} className="perf-table-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--color-primary)' }}></div>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{s.subjectName}</span>
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-label)', fontSize: 13 }}>{s.totalCards}</div>
                  <div style={{ textAlign: 'right', fontFamily: 'var(--font-label)', fontSize: 13 }}>{s.reviewedCards}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-label)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {retention.toFixed(1)}%
                    </span>
                    <div style={{ width: 64, height: 4, backgroundColor: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', backgroundColor: 'var(--color-primary)', width: `${Math.min(100, retention)}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}

            {(!metrics || !metrics.subjectsPerformance.length) && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                Nenhuma revisão registrada ainda.
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Events Section (Span 4) */}
        <div className="bento-col-4" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 24, display: 'flex', flexDirection: 'column' }}>
          <h3 className="academic-label" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <Calendar size={14} style={{ color: 'var(--color-primary-text)' }} /> Próximos Eventos
          </h3>

          {!upcoming.length ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
              <p style={{ fontSize: 13, margin: 0 }}>Nenhum evento agendado.</p>
              <button className="btn-outline-custom" style={{ width: '100%' }} onClick={() => navigate('/calendario')}>
                Abrir Calendário
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {upcoming.map(ev => {
                const meta = getEventMeta(ev.type, eventTypes);
                const d = new Date(ev.startAt);
                return (
                  <div key={ev.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                    onClick={() => { navigate('/calendario'); openEditEvent(ev); }}
                    onMouseOver={e => e.currentTarget.style.opacity = '0.8'}
                    onMouseOut={e => e.currentTarget.style.opacity = '1'}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: meta.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        {!ev.allDay && ` às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                      </div>
                    </div>
                    <EventIcon name={meta.icon} size={13} color={meta.color} />
                  </div>
                );
              })}
              <button className="btn-outline-custom" style={{ marginTop: 8, width: '100%' }}
                onClick={() => navigate('/calendario')}>
                Ver Calendário Completo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PlanBanner({ planStatus, onUpgrade }: { planStatus: ReturnType<typeof useApp>['planStatus']; onUpgrade: () => void }) {
  if (!planStatus) return null;
  if (!planStatus.isActive) {
    return (
      <div style={{
        marginBottom: 24, padding: '16px 24px', borderRadius: 'var(--radius-md)',
        backgroundColor: 'rgba(186, 26, 26, 0.1)', border: '1px solid var(--color-danger)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ShieldAlert size={20} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-danger)' }}>Período gratuito encerrado</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Assine o Plano Estudante para continuar usando a IA, insights e WhatsApp.</div>
          </div>
        </div>
        <button className="btn-oxblood" style={{ backgroundColor: 'var(--color-danger)' }} onClick={onUpgrade}>
          <Star size={14} /> Assinar
        </button>
      </div>
    );
  }
  if (planStatus.plan === 'FREE_TRIAL' && planStatus.trialDaysLeft <= 3) {
    return (
      <div style={{
        marginBottom: 24, padding: '16px 24px', borderRadius: 'var(--radius-md)',
        backgroundColor: 'rgba(217, 119, 6, 0.1)', border: '1px solid var(--color-warning)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Clock size={20} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            Restam <strong>{planStatus.trialDaysLeft} dia{planStatus.trialDaysLeft !== 1 ? 's' : ''}</strong> de período gratuito.
          </span>
        </div>
        <button className="btn-outline-custom" onClick={onUpgrade}>
          Ver planos
        </button>
      </div>
    );
  }
  return null;
}
