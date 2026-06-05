import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Layers, Sparkles, Calendar,
  Timer, Trophy, User as UserIcon, LogOut, Sun, Moon,
  ChevronDown, Plus, Trash2,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

const NAV_ITEMS = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/materiais', icon: BookOpen,        label: 'Materiais' },
  { to: '/cards',     icon: Layers,          label: 'Meus Cards' },
  { to: '/ia',        icon: Sparkles,        label: 'Gerar com IA' },
  { to: '/calendario',icon: Calendar,        label: 'Calendário'  },
  { to: '/pomodoro',  icon: Timer,           label: 'Pomodoro'    },
  { to: '/provas',    icon: Trophy,          label: 'Sessão de Provas' },
  { to: '/perfil',    icon: UserIcon,        label: 'Perfil'      },
];

export default function Sidebar() {
  const {
    currentUser, handleLogout, theme, toggleTheme,
    spaces, activeSpaceId, setActiveSpaceId,
    handleCreateSpace, handleDeleteSpace,
    cards,
  } = useApp();

  const dueCount = cards.filter(c => new Date(c.nextReview) <= new Date()).length;

  const [spacesOpen,   setSpacesOpen]   = React.useState(false);
  const [spaceForm,    setSpaceForm]    = React.useState(false);
  const [newName,      setNewName]      = React.useState('');
  const [newColor,     setNewColor]     = React.useState('#494bd6');
  const [newIcon,      setNewIcon]      = React.useState('📚');

  async function submitSpace(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await handleCreateSpace(newName.trim(), newColor, newIcon);
    setNewName(''); setSpaceForm(false);
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-brand">
        <span className="sidebar-brand-icon">✦</span>
        <span className="sidebar-brand-name">SAAFO</span>
      </div>

      {/* Areas */}
      <div className="sidebar-section">
        <button
          className="sidebar-section-header"
          onClick={() => setSpacesOpen(o => !o)}
        >
          <span>Áreas</span>
          <ChevronDown
            size={14}
            style={{ transform: spacesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}
          />
        </button>

        {spacesOpen && (
          <div className="sidebar-space-list">
            <button
              className={`sidebar-space-item ${!activeSpaceId ? 'active' : ''}`}
              onClick={() => setActiveSpaceId(null)}
            >
              <span className="sidebar-space-dot" style={{ background: 'var(--text-muted)' }} />
              <span>Todas</span>
            </button>

            {spaces.map(s => (
              <div key={s.id} className="sidebar-space-row">
                <button
                  className={`sidebar-space-item ${activeSpaceId === s.id ? 'active' : ''}`}
                  onClick={() => setActiveSpaceId(s.id)}
                >
                  <span className="sidebar-space-dot" style={{ background: s.color ?? '#494bd6' }} />
                  <span>{s.icon} {s.name}</span>
                </button>
                <button
                  className="sidebar-space-delete"
                  onClick={() => { if (window.confirm(`Excluir a área "${s.name}"?`)) handleDeleteSpace(s.id); }}
                  title="Excluir área"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {spaceForm ? (
              <form className="sidebar-space-form" onSubmit={submitSpace}>
                <input
                  value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="Nome da área" className="input-sm" autoFocus
                />
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                    style={{ width: 28, height: 28, borderRadius: 4, border: 'none', cursor: 'pointer' }} />
                  <input value={newIcon} onChange={e => setNewIcon(e.target.value)}
                    placeholder="Emoji" className="input-sm" style={{ width: 56 }} />
                  <button type="submit" className="btn-primary btn-sm">OK</button>
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setSpaceForm(false)}>✕</button>
                </div>
              </form>
            ) : (
              <button className="sidebar-space-add" onClick={() => setSpaceForm(true)}>
                <Plus size={12} /> Nova área
              </button>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
            {dueCount > 0 && (to === '/cards' || to === '/materiais') && (
              <span className="nav-item-badge">{dueCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

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
