import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Users, CreditCard, Clock, AlertTriangle,
  X, ChevronLeft, ChevronRight, Shield, RefreshCw,
  CheckCircle2, XCircle, Layers, BookOpen, Trophy,
  MessageCircle, RotateCw, Send,
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import './Admin.css';
import { useIsMobile } from '../hooks/useIsMobile';

interface Usage {
  subjects: number;
  cards: number;
  studySessions: number;
  examRecords: number;
  cardsGeneratedToday: number;
  totalReviews: number;
  lastActivityAt?: string | null;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  trialEndsAt: string | null;
  createdAt: string;
  emailVerified: boolean;
  phone?: string | null;
  asaasSubscriptionId?: string | null;
  usage: Usage;
}

interface Meta { total: number; page: number; pageSize: number; pages: number }

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);

function planLabel(plan: string, trialEndsAt: string | null) {
  if (plan === 'STUDENT') return { text: 'Assinante', color: 'var(--color-success)' };
  if (trialEndsAt && new Date(trialEndsAt) >= new Date())
    return { text: 'Trial', color: 'var(--color-warning)' };
  return { text: 'Expirado', color: 'var(--color-danger)' };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Detail Modal ─────────────────────────────────────────────────────────────

function UserModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const isMobile = useIsMobile();
  const plan = planLabel(user.plan, user.trialEndsAt);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--color-primary)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, flexShrink: 0,
            }}>
              {user.name[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{user.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.email}</div>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Info Row */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <InfoCard label="Plano">
              <span style={{ color: plan.color, fontWeight: 700 }}>{plan.text}</span>
            </InfoCard>
            <InfoCard label="E-mail verificado">
              {user.emailVerified
                ? <CheckCircle2 size={16} color="var(--color-success)" />
                : <XCircle size={16} color="var(--color-danger)" />}
            </InfoCard>
            <InfoCard label="Cadastro">{fmtDate(user.createdAt)}</InfoCard>
            <InfoCard label="Trial expira">
              {user.trialEndsAt ? fmtDate(user.trialEndsAt) : '—'}
            </InfoCard>
            <InfoCard label="WhatsApp">
              {user.phone ?? <span style={{ color: 'var(--text-muted)' }}>não cadastrado</span>}
            </InfoCard>
            <InfoCard label="Assinatura Asaas">
              {user.asaasSubscriptionId
                ? <span style={{ fontSize: 11, wordBreak: 'break-all' }}>{user.asaasSubscriptionId}</span>
                : <span style={{ color: 'var(--text-muted)' }}>—</span>}
            </InfoCard>
          </div>

          {/* Usage */}
          <div>
            <p className="academic-label" style={{ marginBottom: 10 }}>Consumo</p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 8 }}>
              <UsageTile icon={<BookOpen size={14} />} label="Matérias"   value={user.usage.subjects} />
              <UsageTile icon={<Layers size={14} />}   label="Cards"      value={user.usage.cards} />
              <UsageTile icon={<RotateCw size={14} />} label="Sessões"    value={user.usage.studySessions} />
              <UsageTile icon={<MessageCircle size={14} />} label="Revisões" value={user.usage.totalReviews} />
              <UsageTile icon={<Trophy size={14} />}   label="Provas"     value={user.usage.examRecords} />
              <UsageTile icon={<RefreshCw size={14} />} label="Cards hoje" value={user.usage.cardsGeneratedToday} highlight />
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Última atividade: {fmtDateTime(user.usage.lastActivityAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius)', padding: '10px 14px', border: '1px solid var(--border-color)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>{children}</div>
    </div>
  );
}

function UsageTile({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: highlight ? 'var(--color-primary)' : 'var(--text-muted)' }}>
        {icon}
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 300, color: highlight ? 'var(--color-primary)' : 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Admin() {
  const isMobile = useIsMobile();
  const { apiCall, currentUser } = useApp();
  const navigate = useNavigate();

  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [meta, setMeta]       = useState<Meta>({ total: 0, page: 1, pageSize: 50, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [search, setSearch]   = useState('');
  const [plan, setPlan]       = useState('');
  const [page, setPage]       = useState(1);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [waSending, setWaSending] = useState(false);
  const [waResult, setWaResult]   = useState<{ ok: boolean; msg: string } | null>(null);

  const isAdmin = ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(currentUser?.email?.toLowerCase() ?? '');

  async function testWhatsApp() {
    setWaSending(true);
    setWaResult(null);
    try {
      await apiCall('/admin/test-whatsapp', { method: 'POST' });
      setWaResult({ ok: true, msg: 'Mensagem enviada! Verifique seu WhatsApp.' });
    } catch (err) {
      setWaResult({ ok: false, msg: (err as Error).message });
    } finally {
      setWaSending(false);
    }
  }

  const load = useCallback(async (p: number, s: string, pl: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (s)  params.set('search', s);
      if (pl) params.set('plan', pl);
      const res = await apiCall(`/admin/users?${params}`) as { data: AdminUser[]; meta: Meta };
      setUsers(res.data);
      setMeta(res.meta);
      setForbidden(false);
    } catch (err) {
      if ((err as Error).message?.includes('403') || (err as Error).message?.includes('Forbidden') || (err as Error).message?.includes('Acesso')) {
        setForbidden(true);
      }
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => {
    if (!isAdmin) { setForbidden(true); setLoading(false); return; }
    load(page, search, plan);
  }, [page, plan]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce search
  useEffect(() => {
    if (!isAdmin) return;
    const t = setTimeout(() => { setPage(1); load(1, search, plan); }, 400);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  // Summary derived from current page — for totals use meta
  const students  = users.filter(u => u.plan === 'STUDENT').length;
  const trials    = users.filter(u => u.plan === 'FREE_TRIAL' && u.trialEndsAt && new Date(u.trialEndsAt) >= new Date()).length;
  const expiring  = users.filter(u => {
    if (u.plan !== 'FREE_TRIAL' || !u.trialEndsAt) return false;
    const diff = (new Date(u.trialEndsAt).getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff <= 3;
  }).length;

  if (forbidden) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <Shield size={48} style={{ color: 'var(--color-danger)', opacity: 0.5 }} />
        <p style={{ fontWeight: 700, fontSize: 18 }}>Acesso restrito</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Você não tem permissão para acessar o painel de administração.</p>
        <button className="btn-primary" style={{ width: 'auto', padding: '10px 24px' }} onClick={() => navigate('/')}>Voltar ao início</button>
      </div>
    );
  }

  return (
    <div className="page" style={{ padding: '24px 24px 48px' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, borderBottom: '1px solid var(--border-color)', paddingBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Shield size={20} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 26 : 36, fontWeight: 300, margin: 0 }}>Admin</h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
            Usuários cadastrados e seus consumos
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={testWhatsApp}
              disabled={waSending}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--color-success)', background: 'transparent', color: 'var(--color-success)', cursor: waSending ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600, opacity: waSending ? 0.7 : 1 }}
            >
              {waSending ? <RotateCw size={14} className="animate-spin" /> : <Send size={14} />}
              Testar WhatsApp
            </button>
            <button
              onClick={() => load(page, search, plan)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}
            >
              <RefreshCw size={14} /> Atualizar
            </button>
          </div>
          {waResult && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: waResult.ok ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {waResult.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {waResult.msg}
            </div>
          )}
        </div>
      </header>

      {/* Summary stats */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 0, borderBottom: '1px solid var(--border-color)', marginBottom: 32, paddingBottom: 24 }}>
        <StatBox icon={<Users size={16} />}       label="Total de usuários" value={meta.total} />
        <StatBox icon={<CreditCard size={16} />}  label="Assinantes"        value={students} color="var(--color-success)" />
        <StatBox icon={<Clock size={16} />}        label="Em trial"          value={trials}   color="var(--color-warning)" />
        <StatBox icon={<AlertTriangle size={16} />} label="Trial expirando"  value={expiring} color="var(--color-danger)" />
      </section>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flexGrow: 1, minWidth: isMobile ? 0 : 220, width: isMobile ? '100%' : undefined }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail…"
            style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', fontSize: 13, color: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <select
          value={plan}
          onChange={e => { setPlan(e.target.value); setPage(1); }}
          style={{ padding: '9px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius)', fontSize: 13, color: 'inherit', cursor: 'pointer', outline: 'none' }}
        >
          <option value="">Todos os planos</option>
          <option value="STUDENT">Assinante</option>
          <option value="FREE_TRIAL">Trial</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <RotateCw size={20} className="animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Nenhum usuário encontrado.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Plano</th>
                <th title="Cards totais">Cards</th>
                <th title="Sessões de estudo">Sessões</th>
                <th title="Total de revisões">Revisões</th>
                <th title="Cards gerados hoje">Hoje</th>
                <th>Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const p = planLabel(u.plan, u.trialEndsAt);
                return (
                  <tr key={u.id} onClick={() => setSelected(u)} className="admin-table-row">
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 700, color: p.color, background: `${p.color}18`, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                        {p.text}
                      </span>
                    </td>
                    <td className="admin-num">{u.usage.cards}</td>
                    <td className="admin-num">{u.usage.studySessions}</td>
                    <td className="admin-num">{u.usage.totalReviews}</td>
                    <td className="admin-num" style={{ color: u.usage.cardsGeneratedToday > 0 ? 'var(--color-primary)' : 'var(--text-muted)', fontWeight: u.usage.cardsGeneratedToday > 0 ? 700 : 400 }}>
                      {u.usage.cardsGeneratedToday}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(u.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta.pages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ padding: '6px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'transparent', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1, color: 'inherit' }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Página {page} de {meta.pages} · {meta.total} usuário{meta.total !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setPage(p => Math.min(meta.pages, p + 1))}
            disabled={page >= meta.pages}
            style={{ padding: '6px 10px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'transparent', cursor: page >= meta.pages ? 'not-allowed' : 'pointer', opacity: page >= meta.pages ? 0.4 : 1, color: 'inherit' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {selected && <UserModal user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function StatBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderRight: '1px solid var(--border-color)', paddingRight: 16, paddingLeft: 4, gap: 8 }}>
      <span className="academic-label" style={{ display: 'flex', alignItems: 'center', gap: 6, color: color ?? 'var(--text-muted)' }}>
        {icon} {label}
      </span>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, fontWeight: 300, color: color ?? 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  );
}
