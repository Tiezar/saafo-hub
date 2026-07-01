import React, { useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Layers, Sparkles, Calendar,
  Timer, Trophy, LogOut, Sun, Moon,
  History, Shield, ChevronUp, User, Clock,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';

interface Props {
  mobileOpen?: boolean;
  onClose?: () => void;
}

const APRENDER_ITEMS = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'        },
  { to: '/materiais',  icon: BookOpen,        label: 'Matérias'         },
  { to: '/cards',      icon: Layers,          label: 'Meus Cards'       },
  { to: '/ia',         icon: Sparkles,        label: 'Gerador de Cards' },
];

const AVALIAR_ITEMS = [
  { to: '/provas',     icon: Trophy,          label: 'Provas'           },
];

const ORGANIZAR_ITEMS = [
  { to: '/cronograma', icon: Clock,           label: 'Cronograma'       },
  { to: '/calendario', icon: Calendar,        label: 'Calendário'       },
  { to: '/pomodoro',   icon: Timer,           label: 'Pomodoro'         },
];

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);

const PALETTES = [
  { id: 'marginalia' as const, label: 'Marginália', light: '#a33b3a', dark: '#e24a46' },
  { id: 'cobalt'     as const, label: 'Cobalto',    light: '#1a56db', dark: '#4d82f0' },
  { id: 'musgo'      as const, label: 'Musgo',      light: '#4a7c3f', dark: '#72b562' },
];

export default function Sidebar({ mobileOpen = false, onClose }: Props) {
  const navigate = useNavigate();
  const {
    currentUser, handleLogout, theme, toggleTheme, palette, setPalette,
    cards, subjects, startStudySession, updateAvailable,
    activeArea, myAreas, handleSwitchArea,
  } = useApp();

  const isAdmin = ADMIN_EMAILS.includes(currentUser?.email?.toLowerCase() ?? '') || currentUser?.role === 'ADMIN';

  const dueCount = cards.filter(c => new Date(c.nextReview) <= new Date()).length;
  const showOnboardingDot = subjects.length === 0 && localStorage.getItem('onboarding_dismissed') !== '1';

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
    if (updateAvailable) {
      e.preventDefault();
      window.location.assign(to);
    } else {
      onClose?.();
    }
  };

  // Popup menu
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const userName  = currentUser?.nickname ?? currentUser?.name ?? '?';
  const userEmail = currentUser?.email ?? '';
  const userAvatar = userName[0].toUpperCase();

  return (
    <aside className={`sidebar${mobileOpen ? ' sidebar-open' : ''}`}>

      {/* ── Brand ── */}
      <div className="sb-brand" style={{ justifyContent: 'center' }}>
        <img
          src={theme === 'dark' ? '/saafo-hub-logo-dark.png' : '/saafo-hub-logo.png'}
          alt="SAAFO HUB"
          style={{ height: 28, display: 'block', objectFit: 'contain' }}
        />
      </div>
 
      {/* ── Area Switcher ── */}
      {myAreas.length > 0 && (
        <div style={{ padding: '0 8px', marginBottom: 12 }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600, paddingLeft: '8px' }}>
            Área de Foco
          </div>
          <select
            value={activeArea?.id || ''}
            onChange={(e) => {
              if (e.target.value === 'new') {
                navigate('/onboarding');
              } else {
                handleSwitchArea(e.target.value);
              }
            }}
            style={{
              width: '100%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {myAreas.map((ma) => (
              <option key={ma.id} value={ma.id}>
                {ma.area.name}
              </option>
            ))}
            <option value="new">+ Adicionar foco</option>
          </select>
        </div>
      )}

      {/* ── Study CTA ── */}
      <div style={{ padding: '0 8px', marginBottom: 20 }}>
        <button
          className="sb-cta"
          onClick={() => { startStudySession(undefined, true); onClose?.(); }}
        >
          <History size={13} />
          Revisão Diária
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="sb-nav">

        {/* APRENDER */}
        <p className="sb-group-label">Aprender</p>
        {APRENDER_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className="sb-item"
            onClick={(e) => handleNavClick(e, to)}
          >
            <Icon size={16} />
            <span>{label}</span>
            {dueCount > 0 && (to === '/cards' || to === '/materiais') && (
              <span className="sb-badge">{dueCount}</span>
            )}
            {showOnboardingDot && to === '/materiais' && (
              <span className="sb-dot" />
            )}
          </NavLink>
        ))}

        {/* AVALIAR */}
        <p className="sb-group-label" style={{ marginTop: 16 }}>Avaliar</p>
        {AVALIAR_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className="sb-item"
            onClick={(e) => handleNavClick(e, to)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}

        {/* ORGANIZAR */}
        <p className="sb-group-label" style={{ marginTop: 16 }}>Organizar</p>
        {ORGANIZAR_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className="sb-item"
            onClick={(e) => handleNavClick(e, to)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}

        {/* Admin */}
        {isAdmin && (
          <>
            <p className="sb-group-label" style={{ marginTop: 16 }}>Admin</p>
            <NavLink to="/admin" className="sb-item" onClick={(e) => handleNavClick(e, '/admin')}>
              <Shield size={16} />
              <span>Admin</span>
            </NavLink>
          </>
        )}

      </nav>

      {/* ── Footer user button + popup ── */}
      <div className="sb-footer" ref={menuRef}>
        {menuOpen && (
          <div className="sb-popup">
            {/* Palettes */}
            <p className="sb-popup-label">Paleta de cores</p>
            <div className="sb-palette-row">
              {PALETTES.map(p => {
                const color = theme === 'dark' ? p.dark : p.light;
                const active = palette === p.id;
                return (
                  <button
                    key={p.id}
                    className={`sb-palette-btn${active ? ' active' : ''}`}
                    onClick={() => setPalette(p.id)}
                    title={p.label}
                  >
                    <span className="sb-palette-swatch" style={{ background: color }} />
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="sb-popup-divider" />

            {/* Theme toggle */}
            <button className="sb-popup-item" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              <span>{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
            </button>

            {/* Profile */}
            <button className="sb-popup-item" onClick={() => { navigate('/perfil'); setMenuOpen(false); onClose?.(); }}>
              <User size={14} />
              <span>Meu perfil</span>
            </button>

            <div className="sb-popup-divider" />

            {/* Logout */}
            <button className="sb-popup-item sb-popup-danger" onClick={handleLogout}>
              <LogOut size={14} />
              <span>Sair</span>
            </button>
          </div>
        )}

        <button
          className="sb-user-btn"
          onClick={() => setMenuOpen(o => !o)}
          aria-expanded={menuOpen}
        >
          <div className="sb-avatar">{userAvatar}</div>
          <div className="sb-user-info">
            <span className="sb-user-name">{userName}</span>
            <span className="sb-user-email">{userEmail}</span>
          </div>
          <ChevronUp
            size={14}
            className="sb-chevron"
            style={{ transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>
      </div>
    </aside>
  );
}
