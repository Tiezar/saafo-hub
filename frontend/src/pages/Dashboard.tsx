import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, RotateCw, Flame, CheckCircle, Zap, RefreshCw,
  Star, Calendar, ShieldAlert, Clock, CreditCard,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { getEventMeta } from '../lib/constants';

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    cards, metrics, insights, insightsLoading, insightsLastUpdated,
    calendarEvents, planStatus,
    fetchInsights, handleRefreshInsights,
    setUpgradeModalOpen, handleCheckout, checkoutLoading,
    openEditEvent, startStudySession,
  } = useApp();

  useEffect(() => { fetchInsights(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dueCount = cards.filter(c => new Date(c.nextReview) <= new Date()).length;
  const upcoming = calendarEvents
    .filter(e => new Date(e.startAt) >= new Date() || e.recurrenceDays.length > 0)
    .slice(0, 4);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Acompanhe estatísticas e revisões pendentes</p>
        </div>
        <button className="btn-primary" onClick={() => startStudySession(undefined, true)}>
          <RotateCw size={16} /> Estudar Pendentes
        </button>
      </div>

      {/* Plan banners */}
      <PlanBanner planStatus={planStatus} onUpgrade={() => setUpgradeModalOpen(true)} />

      {/* Stats */}
      <div className="stats-grid">
        <StatCard icon={<BookOpen size={22} />} value={cards.length} label="Total de Flashcards" />
        <StatCard icon={<RotateCw size={22} />} value={dueCount} label="Pendentes Hoje" />
        <StatCard icon={<Flame size={22} color="var(--color-warning)" />}
          value={`${metrics?.dailyActivity.length ?? 0} dias`} label="Dias com Atividade" />
        <StatCard icon={<CheckCircle size={22} color="var(--color-success)" />}
          value={metrics ? `${(metrics.retentionRate ?? 0).toFixed(1)}%` : '—'}
          label="Taxa de Retenção" />
      </div>

      {/* Insights */}
      <div className="glass-card" style={{ marginBottom: 24 }}>
        <div className="card-header-flex" style={{ marginBottom: 16 }}>
          <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} style={{ color: '#f59e0b' }} /> Análise Inteligente
          </h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {planStatus?.isActive && (
              <>
                {insightsLastUpdated && !insightsLoading && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    atualizado às {insightsLastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                <button onClick={handleRefreshInsights} disabled={insightsLoading}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <RefreshCw size={13} className={insightsLoading ? 'animate-spin' : ''} /> Atualizar
                </button>
              </>
            )}
            {!planStatus?.isActive && (
              <button onClick={() => setUpgradeModalOpen(true)}
                style={{ background: 'var(--grad-primary)', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 12, color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Star size={12} /> Assinar
              </button>
            )}
          </div>
        </div>

        {!planStatus?.isActive && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
            <Zap size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
            <p style={{ fontSize: 14, marginBottom: 4 }}>Insights disponíveis no Plano Estudante</p>
            <p style={{ fontSize: 12 }}>A IA analisa seu histórico e gera recomendações personalizadas.</p>
          </div>
        )}

        {planStatus?.isActive && insightsLoading && !insights.length && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0', color: 'var(--text-secondary)' }}>
            <RotateCw size={18} className="animate-spin" />
            <span style={{ fontSize: 14 }}>Gemini está analisando seu histórico de estudos...</span>
          </div>
        )}

        {planStatus?.isActive && !insightsLoading && !insights.length && (
          <p style={{ fontSize: 14, color: 'var(--text-muted)', padding: '8px 0' }}>
            Nenhum insight ainda. Faça algumas revisões e volte amanhã!
          </p>
        )}

        {insights.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {insights.map((ins, i) => {
              const priorityColor = ins.priority === 'high'
                ? 'var(--color-danger)'
                : ins.priority === 'medium'
                ? 'var(--color-warning)'
                : 'var(--color-success)';
              const typeIcon: Record<string, string> = {
                streak: '🔥', weak_subject: '⚠️', exam_alert: '📅',
                overdue_cards: '😴', productivity_pattern: '⏰', focus_concentration: '🎯',
              };
              return (
                <div key={i} style={{
                  padding: '14px 16px', borderRadius: 10, background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)', borderLeft: `4px solid ${priorityColor}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>{typeIcon[ins.type] ?? '💡'}</span>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{ins.title}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                    {ins.message}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid-2">
        {/* Heatmap */}
        <div className="glass-card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>Atividade Recente</h3>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div className="heatmap-container">
              {(metrics?.dailyActivity ?? []).slice(-28).map((day, i) => {
                const lv = day.count === 0 ? '' : day.count < 3 ? 'level-1' : day.count < 8 ? 'level-2' : day.count < 15 ? 'level-3' : 'level-4';
                return <div key={i} className={`heatmap-day ${lv}`} title={`${day.date}: ${day.count} revisões`} />;
              })}
              {Array.from({ length: Math.max(0, 28 - (metrics?.dailyActivity.length ?? 0)) }).map((_, i) => (
                <div key={`e${i}`} className="heatmap-day" />
              ))}
            </div>
            <div>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Frequência de estudos (últimos 28 dias)
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {metrics ? `${metrics.totalReviewed} revisões totais` : 'Sem dados'}
              </p>
            </div>
          </div>
        </div>

        {/* Upcoming events */}
        <div className="glass-card">
          <h3 className="card-title" style={{ marginBottom: 16 }}>Próximos Eventos</h3>
          {!upcoming.length ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>Nenhum evento próximo.</p>
              <button className="btn-secondary" style={{ width: 'auto', padding: '8px 16px' }}
                onClick={() => navigate('/calendario')}>
                <Calendar size={14} /> Abrir Calendário
              </button>
            </div>
          ) : (
            <>
              {upcoming.map(ev => {
                const meta = getEventMeta(ev.type);
                const d = new Date(ev.startAt);
                return (
                  <div key={ev.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                    onClick={() => { navigate('/calendario'); openEditEvent(ev); }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        {!ev.allDay && ` ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                        {ev.recurrenceDays.length > 0 && ' · Recorrente'}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: meta.color, fontWeight: 600, flexShrink: 0 }}>{meta.emoji}</span>
                  </div>
                );
              })}
              <button className="btn-secondary" style={{ width: '100%', marginTop: 12, padding: '8px', fontSize: 13 }}
                onClick={() => navigate('/calendario')}>
                Ver todos
              </button>
            </>
          )}
        </div>
      </div>

      {/* Performance table */}
      <div className="glass-card">
        <div className="card-header-flex"><h3 className="card-title">Desempenho por Matéria</h3></div>
        <div className="custom-table-wrapper">
          <table className="custom-table">
            <thead><tr><th>Matéria</th><th>Cards</th><th>Revisados</th><th>Média</th><th>Retenção</th></tr></thead>
            <tbody>
              {metrics?.subjectsPerformance.map((s, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{s.subjectName}</td>
                  <td>{s.totalCards}</td>
                  <td>{s.reviewedCards}</td>
                  <td><span className="badge badge-cyan">★ {(s.averageRating ?? 0).toFixed(1)}</span></td>
                  <td><strong style={{ color: 'var(--color-success)' }}>{(s.retentionRate ?? 0).toFixed(1)}%</strong></td>
                </tr>
              ))}
              {(!metrics || !metrics.subjectsPerformance.length) && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma revisão registrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upgrade modal (inline) */}
      <UpgradeModal
        open={false}
        onClose={() => setUpgradeModalOpen(false)}
        onCheckout={handleCheckout}
        loading={checkoutLoading}
      />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function PlanBanner({ planStatus, onUpgrade }: { planStatus: ReturnType<typeof useApp>['planStatus']; onUpgrade: () => void }) {
  if (!planStatus) return null;
  if (!planStatus.isActive) {
    return (
      <div className="plan-banner plan-banner-danger" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldAlert size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-danger)' }}>Período gratuito encerrado</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Assine o Plano Estudante para continuar usando a IA, insights e WhatsApp.</div>
          </div>
        </div>
        <button className="btn-primary" style={{ width: 'auto', padding: '8px 20px', flexShrink: 0 }} onClick={onUpgrade}>
          <Star size={14} /> Assinar
        </button>
      </div>
    );
  }
  if (planStatus.plan === 'FREE_TRIAL' && planStatus.trialDaysLeft <= 3) {
    return (
      <div className="plan-banner plan-banner-warning" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--color-warning)' }}>
            <strong>{planStatus.trialDaysLeft} dia{planStatus.trialDaysLeft !== 1 ? 's' : ''}</strong>{' '}
            restante{planStatus.trialDaysLeft !== 1 ? 's' : ''} do seu período gratuito.
          </span>
        </div>
        <button style={{ background: 'none', border: '1px solid var(--color-warning)', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: 'var(--color-warning)', cursor: 'pointer', fontWeight: 600 }} onClick={onUpgrade}>
          Ver planos
        </button>
      </div>
    );
  }
  return null;
}

function UpgradeModal({ open, onClose, onCheckout, loading }: { open: boolean; onClose: () => void; onCheckout: () => void; loading: boolean }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={18} style={{ color: '#f59e0b' }} /> Plano Estudante
          </h3>
          <button onClick={onClose} className="btn-ghost btn-icon">×</button>
        </div>
        <div className="modal-body">
          <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
            <div style={{ fontSize: 48, fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--color-primary-light)', lineHeight: 1 }}>
              R$ 19<span style={{ fontSize: 18, fontWeight: 400 }}>/mês</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>PIX · Boleto · Cartão de Crédito</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              '🤖 Geração ilimitada de flashcards com IA',
              '📝 Sessão de Provas com IA (múltipla escolha + dissertativo)',
              '💡 Insights inteligentes automáticos',
              '📱 Lembretes via WhatsApp',
              '📄 Upload de documentos PDF e imagens',
              '🗓️ Calendário com recorrência e alertas',
              '🍅 Pomodoro + todos os recursos básicos',
            ].map(text => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer" style={{ flexDirection: 'column', gap: 12 }}>
          <button className="btn-primary" style={{ width: '100%', padding: '14px' }} onClick={onCheckout} disabled={loading}>
            {loading
              ? <><RotateCw size={16} className="animate-spin" /> Aguarde...</>
              : <><CreditCard size={16} /> Assinar agora — R$ 19/mês</>}
          </button>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
            Cancele quando quiser. Sem multas ou fidelidade.
          </p>
        </div>
      </div>
    </div>
  );
}
