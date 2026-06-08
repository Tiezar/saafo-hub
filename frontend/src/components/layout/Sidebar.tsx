import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Layers, Sparkles, Calendar,
  Timer, Trophy, User as UserIcon, LogOut, Sun, Moon,
  ChevronDown, Plus, Trash2, History, Shield,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface Props {
  mobileOpen?: boolean;
  onClose?: () => void;
}

const NAV_ITEMS = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/materiais', icon: BookOpen,        label: 'Matérias' },
  { to: '/cards',     icon: Layers,          label: 'Meus Cards' },
  { to: '/ia',        icon: Sparkles,        label: 'Gerador IA' },
  { to: '/calendario',icon: Calendar,        label: 'Calendário'  },
  { to: '/pomodoro',  icon: Timer,           label: 'Pomodoro'    },
  { to: '/provas',    icon: Trophy,          label: 'Provas' },
  { to: '/perfil',    icon: UserIcon,        label: 'Perfil'      },
];

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);

export default function Sidebar({ mobileOpen = false, onClose }: Props) {
  const {
    currentUser, handleLogout, theme, toggleTheme,
    spaces, activeSpaceId, setActiveSpaceId,
    handleCreateSpace, handleDeleteSpace,
    cards, subjects, startStudySession,
  } = useApp();

  const isAdmin = ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(currentUser?.email?.toLowerCase() ?? '');

  const dueCount = cards.filter(c => new Date(c.nextReview) <= new Date()).length;
  const showOnboardingDot = subjects.length === 0 && localStorage.getItem('onboarding_dismissed') !== '1';

  const [spacesOpen,   setSpacesOpen]   = React.useState(false);
  const [spaceForm,    setSpaceForm]    = React.useState(false);
  const [newName,      setNewName]      = React.useState('');
  const [newColor,     setNewColor]     = React.useState('var(--color-primary)');
  const [newIcon,      setNewIcon]      = React.useState('📚');

  async function submitSpace(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await handleCreateSpace(newName.trim(), newColor, newIcon);
    setNewName(''); setSpaceForm(false);
  }

  return (
    <aside className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <img 
          src={theme === 'dark' ? '/saafo-hub-logo-dark.png' : '/saafo-hub-logo.png'} 
          alt="SAAFO HUB" 
          style={{ height: '28px', display: 'block', objectFit: 'contain' }} 
        />
      </div>

      {/* CTA Button */}
      <div style={{ padding: '0 8px', marginBottom: 24 }}>
        <button
          onClick={() => { startStudySession(undefined, true); onClose?.(); }}
          style={{
            width: '100%',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-primary)',
            color: 'white',
            fontFamily: 'var(--font-label)',
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            transition: 'opacity var(--transition)',
          }}
          onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
          onMouseOut={e => e.currentTarget.style.opacity = '1'}
        >
          <History size={14} style={{ marginRight: 8 }} />
          Revisão Diária
        </button>
      </div>

      {/* Main Tabs */}
      <div className="sidebar-nav">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="sidebar-nav-item"
            onClick={onClose}
          >
            <Icon size={18} />
            <span>{label}</span>
            {dueCount > 0 && (to === '/cards' || to === '/materiais') && (
              <span style={{ marginLeft: 'auto', backgroundColor: 'var(--color-primary)', color: 'white', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                {dueCount}
              </span>
            )}
            {showOnboardingDot && to === '/materiais' && (
              <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />
            )}
          </NavLink>
        ))}

        {/* Admin link — only visible to admins */}
        {isAdmin && (
          <NavLink to="/admin" className="sidebar-nav-item" onClick={onClose} style={{ marginTop: 8, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
            <Shield size={18} />
            <span>Admin</span>
          </NavLink>
        )}

        {/* Collapsible Areas Section */}
        <div className="sidebar-section">
          <button className="sidebar-section-header" onClick={() => setSpacesOpen(o => !o)}>
            <span>Áreas</span>
            <ChevronDown
              size={12}
              style={{ transform: spacesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
            />
          </button>

          {spacesOpen && (
            <div className="sidebar-space-list">
              <button
                onClick={() => { setActiveSpaceId(null); onClose?.(); }}
                className={`sidebar-space-item ${!activeSpaceId ? 'active' : ''}`}
              >
                <span className="sidebar-space-dot" style={{ background: 'var(--text-muted)' }} />
                <span>Todas</span>
              </button>

              {spaces.map(s => (
                <div key={s.id} className="sidebar-space-row">
                  <button
                    onClick={() => { setActiveSpaceId(s.id); onClose?.(); }}
                    className={`sidebar-space-item ${activeSpaceId === s.id ? 'active' : ''}`}
                  >
                    <span className="sidebar-space-dot" style={{ background: s.color ?? 'var(--color-primary)' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.icon} {s.name}</span>
                  </button>
                  <button
                    onClick={() => { if (window.confirm(`Excluir a área "${s.name}"?`)) handleDeleteSpace(s.id); }}
                    className="sidebar-space-delete"
                    title="Excluir"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}

              {spaceForm ? (
                <form onSubmit={submitSpace} className="sidebar-space-form">
                  <input
                    value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="Nome da área"
                    className="input-sm"
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                      style={{ width: 24, height: 24, padding: 0, border: 'none', cursor: 'pointer' }} />
                    <input value={newIcon} onChange={e => setNewIcon(e.target.value)}
                      placeholder="Emoji" className="input-sm" style={{ width: 40, padding: '4px' }} />
                    <button type="submit" style={{ padding: '4px 8px', fontSize: 10, background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>OK</button>
                    <button type="button" style={{ padding: '4px', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setSpaceForm(false)}>✕</button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setSpaceForm(true)} className="sidebar-space-add">
                  <Plus size={12} /> Nova área
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {(currentUser?.nickname ?? currentUser?.name ?? '?')[0].toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{currentUser?.nickname ?? currentUser?.name}</span>
            <span className="sidebar-user-email">{currentUser?.email}</span>
          </div>
        </div>

        <div className="sidebar-actions">
          <button className="sidebar-icon-btn" onClick={toggleTheme} title="Alternar tema">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="sidebar-icon-btn" onClick={handleLogout} title="Sair">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
