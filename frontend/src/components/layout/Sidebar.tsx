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
  { to: '/materiais', icon: BookOpen,        label: 'Matérias' },
  { to: '/cards',     icon: Layers,          label: 'Meus Cards' },
  { to: '/ia',        icon: Sparkles,        label: 'Gerador IA' },
  { to: '/calendario',icon: Calendar,        label: 'Calendário'  },
  { to: '/pomodoro',  icon: Timer,           label: 'Pomodoro'    },
  { to: '/provas',    icon: Trophy,          label: 'Provas' },
  { to: '/perfil',    icon: UserIcon,        label: 'Perfil'      },
];

export default function Sidebar() {
  const {
    currentUser, handleLogout, theme, toggleTheme,
    spaces, activeSpaceId, setActiveSpaceId,
    handleCreateSpace, handleDeleteSpace,
    cards, subjects, startStudySession,
  } = useApp();

  const dueCount = cards.filter(c => new Date(c.nextReview) <= new Date()).length;
  const showOnboardingDot = subjects.length === 0 && localStorage.getItem('onboarding_dismissed') !== '1';

  const [spacesOpen,   setSpacesOpen]   = React.useState(false);
  const [spaceForm,    setSpaceForm]    = React.useState(false);
  const [newName,      setNewName]      = React.useState('');
  const [newColor,     setNewColor]     = React.useState('#8E2C2C');
  const [newIcon,      setNewIcon]      = React.useState('📚');

  async function submitSpace(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await handleCreateSpace(newName.trim(), newColor, newIcon);
    setNewName(''); setSpaceForm(false);
  }

  return (
    <nav 
      className="hidden md:flex h-screen w-[280px] flex-col sticky top-0 bg-[#F4F1EA] py-8 px-4 z-50 border-r border-outline-variant"
      style={{ borderRight: '1px solid var(--border-color)', flexShrink: 0 }}
    >
      {/* Header */}
      <div style={{ marginBottom: 32, paddingLeft: 12, paddingRight: 12 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: '0 0 4px' }}>SAAFO HUB</h1>
        <p className="academic-label" style={{ fontSize: 9, color: 'var(--text-secondary)', letterSpacing: '0.15em' }}>Ciclo de Estudos</p>
      </div>

      {/* CTA Button */}
      <div style={{ marginBottom: 32, paddingLeft: 12, paddingRight: 12 }}>
        <button
          onClick={() => startStudySession(undefined, true)}
          style={{
            width: '100%',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#8E2C2C',
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
          <span className="material-symbols-outlined" style={{ marginRight: 8, fontSize: 16 }}>history_edu</span>
          Revisão Diária
        </button>
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto' }}>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center px-4 py-2.5 transition-colors ${
                isActive
                  ? 'text-[#8E2C2C] font-semibold border-r-2 border-[#8E2C2C] bg-[#EBE7E0]'
                  : 'text-on-surface-variant font-body-md hover:bg-[#EBE7E0] rounded-r-lg mr-4'
              }`
            }
            style={({ isActive }) => isActive ? {} : { borderRadius: '6px' }}
          >
            <Icon size={18} style={{ marginRight: 16 }} />
            <span style={{ fontSize: 14 }}>{label}</span>
            {dueCount > 0 && (to === '/cards' || to === '/materiais') && (
              <span style={{ marginLeft: 'auto', backgroundColor: '#8E2C2C', color: 'white', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                {dueCount}
              </span>
            )}
            {showOnboardingDot && to === '/materiais' && (
              <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', backgroundColor: '#8E2C2C' }} />
            )}
          </NavLink>
        ))}

        {/* Collapsible Areas Section */}
        <div style={{ marginTop: 12, paddingLeft: 16, paddingRight: 16 }}>
          <button
            onClick={() => setSpacesOpen(o => !o)}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 0',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-label)',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            <span>Áreas</span>
            <ChevronDown
              size={12}
              style={{ transform: spacesOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}
            />
          </button>

          {spacesOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
              <button
                onClick={() => setActiveSpaceId(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: 'none',
                  background: !activeSpaceId ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)' }} />
                <span>Todas</span>
              </button>

              {spaces.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyOrigin: 'center', justifyContent: 'space-between' }}>
                  <button
                    onClick={() => setActiveSpaceId(s.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: activeSpaceId === s.id ? 'rgba(0, 0, 0, 0.05)' : 'transparent',
                      color: 'var(--text-secondary)',
                      fontSize: 12,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color ?? '#8E2C2C' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.icon} {s.name}</span>
                  </button>
                  <button
                    onClick={() => { if (window.confirm(`Excluir a área "${s.name}"?`)) handleDeleteSpace(s.id); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                    title="Excluir"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}

              {spaceForm ? (
                <form onSubmit={submitSpace} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8, backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: '6px', marginTop: 4 }}>
                  <input
                    value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="Nome da área"
                    style={{ width: '100%', padding: '4px 8px', fontSize: 11, border: '1px solid var(--border-color)', borderRadius: '6px' }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                      style={{ width: 24, height: 24, padding: 0, border: 'none', cursor: 'pointer' }} />
                    <input value={newIcon} onChange={e => setNewIcon(e.target.value)}
                      placeholder="Emoji" style={{ width: 40, padding: '4px', fontSize: 11, border: '1px solid var(--border-color)', borderRadius: '6px' }} />
                    <button type="submit" style={{ padding: '4px 8px', fontSize: 10, background: '#8E2C2C', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>OK</button>
                    <button type="button" style={{ padding: '4px', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setSpaceForm(false)}>✕</button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setSpaceForm(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: 11,
                    padding: '6px 8px',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Plus size={12} /> Nova área
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Tabs */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 4, pt: 16, borderTop: '1px solid var(--border-color)', marginRight: 16 }}>
        <button
          className="flex items-center px-4 py-2 text-on-surface-variant font-body-md hover:bg-[#EBE7E0] transition-colors rounded-r-lg"
          onClick={toggleTheme}
          style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', borderRadius: '6px' }}
        >
          {theme === 'dark' ? <Sun size={18} style={{ marginRight: 16 }} /> : <Moon size={18} style={{ marginRight: 16 }} />}
          <span style={{ fontSize: 13 }}>{theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}</span>
        </button>
        <button
          className="flex items-center px-4 py-2 text-on-surface-variant font-body-md hover:bg-[#EBE7E0] transition-colors rounded-r-lg"
          onClick={handleLogout}
          style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', borderRadius: '6px' }}
        >
          <LogOut size={18} style={{ marginRight: 16 }} />
          <span style={{ fontSize: 13 }}>Sair</span>
        </button>
      </div>
    </nav>
  );
}
