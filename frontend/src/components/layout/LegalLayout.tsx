import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, ArrowLeft } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import './LegalLayout.css';

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export default function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useApp();

  return (
    <div className="legal-container">
      <header className="legal-header">
        <div className="legal-header-inner">
          <button className="legal-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
            Voltar
          </button>
          <img
            src={theme === 'dark' ? '/saafo-hub-logo-dark.png' : '/saafo-hub-logo.png'}
            alt="SAAFO HUB"
            className="legal-logo"
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer' }}
          />
          <button
            className="legal-theme-toggle"
            onClick={toggleTheme}
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <main className="legal-main">
        <div className="legal-content">
          <div className="legal-title-block">
            <h1 className="legal-title">{title}</h1>
            <p className="legal-updated">Última atualização: {lastUpdated}</p>
          </div>
          {children}
        </div>
      </main>

      <footer className="legal-footer">
        <div className="legal-footer-inner">
          <span>© {new Date().getFullYear()} SAAFO HUB</span>
          <div className="legal-footer-links">
            <a href="/privacidade">Privacidade</a>
            <a href="/termos">Termos de Uso</a>
            <button
              className="legal-footer-btn"
              onClick={() => window.dispatchEvent(new Event('openCookieManager'))}
            >
              Gerenciar cookies
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
