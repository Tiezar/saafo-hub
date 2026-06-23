import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, History, Trophy, Calendar, 
  Sun, Moon, CheckCircle, ArrowRight 
} from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useApp();

  const handleNavToAuth = (mode?: string) => {
    if (mode === 'register') {
      navigate('/auth?mode=register');
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="lp-container">
      {/* Header */}
      <header className="lp-header">
        <div className="lp-header-inner">
          <div className="lp-brand">
            <img 
              src={theme === 'dark' ? '/saafo-hub-logo-dark.png' : '/saafo-hub-logo.png'} 
              alt="SAAFO HUB" 
              className="lp-logo"
            />
          </div>
          <nav className="lp-nav">
            <a href="#funcionalidades" className="lp-nav-link">Recursos</a>
            <a href="#como-funciona" className="lp-nav-link">Como Funciona</a>
            <a href="#planos" className="lp-nav-link">Planos</a>
          </nav>
          <div className="lp-header-actions">
            <button className="sidebar-icon-btn" onClick={toggleTheme} title="Alternar tema" style={{ width: 34, height: 34, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => handleNavToAuth()}>
              Entrar ou Registrar
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="lp-section lp-hero">
        <div className="lp-section-inner">
          <h1 className="lp-hero-title">
            Domine seus estudos com Inteligência Artificial e Memorização Ativa
          </h1>
          <p className="lp-hero-subtitle">
            Crie flashcards automaticamente a partir de PDFs ou imagens com o Gemini e revise no momento ideal usando o algoritmo cientificamente comprovado SuperMemo-2 (SM-2).
          </p>
          <div className="lp-hero-cta">
            <button className="btn btn-primary btn-lg" onClick={() => handleNavToAuth('register')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Começar Gratuitamente <ArrowRight size={18} />
            </button>
          </div>

          {/* Card Preview Mockup */}
          <div className="lp-hero-preview">
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>💡</span>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16, margin: 0 }}>
                  Exemplo de Flashcard formulado por IA
                </h3>
              </div>
              <span style={{ fontFamily: 'var(--font-label)', fontSize: 11, backgroundColor: 'var(--bg-card-high)', padding: '2px 8px', borderRadius: 4, color: 'var(--color-primary)' }}>
                SM-2 Ativo
              </span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 24, lineHeight: 1.6, color: 'var(--text-primary)' }}>
              <strong>Pergunta:</strong> Como a Curva de Esquecimento de Ebbinghaus impacta o estudo passivo tradicional e de que forma a repetição espaçada mitiga essa perda?
            </p>
            <div style={{ padding: 12, borderRadius: 6, background: 'var(--bg-base)', border: '1px dashed var(--border-color)', fontSize: 13, color: 'var(--text-muted)' }}>
              <em>Pressione Espaço ou clique para revelar o verso com a resposta ideal baseada no seu resumo acadêmico.</em>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="funcionalidades" className="lp-section" style={{ background: 'var(--bg-card-high)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="lp-section-inner">
          <h2 className="lp-section-title">Tecnologias criadas para seu aprendizado</h2>
          <p className="lp-section-subtitle">
            Unificamos as melhores metodologias em uma plataforma limpa para evitar quebras de foco e otimizar seu rendimento acadêmico.
          </p>

          <div className="lp-features-grid">
            <div className="lp-feature-card">
              <Sparkles className="lp-feature-icon" size={24} />
              <h3 className="lp-feature-title">Inteligência Artificial</h3>
              <p className="lp-feature-text">
                Formule flashcards completos carregando resumos em texto ou arquivos acadêmicos (PDFs e imagens de até 50MB) através do Google Gemini.
              </p>
            </div>

            <div className="lp-feature-card">
              <History className="lp-feature-icon" size={24} />
              <h3 className="lp-feature-title">Repetição Espaçada</h3>
              <p className="lp-feature-text">
                O algoritmo SuperMemo-2 (SM-2) calcula e agenda a data ideal de revisão para cada conteúdo dependendo do seu nível de feedback.
              </p>
            </div>

            <div className="lp-feature-card">
              <Trophy className="lp-feature-icon" size={24} />
              <h3 className="lp-feature-title">Simulador de Provas</h3>
              <p className="lp-feature-text">
                Pratique exames dissertativos ou de múltipla escolha gerados sob medida pela IA e obtenha nota explicativa e feedback imediato.
              </p>
            </div>

            <div className="lp-feature-card">
              <Calendar className="lp-feature-icon" size={24} />
              <h3 className="lp-feature-title">Foco e WhatsApp</h3>
              <p className="lp-feature-text">
                Timer Pomodoro integrado com sonorização selecionável e lembretes agendados no WhatsApp para nunca mais esquecer uma revisão.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="como-funciona" className="lp-section">
        <div className="lp-section-inner">
          <h2 className="lp-section-title">Como funciona o SAAFO HUB?</h2>
          <p className="lp-section-subtitle">
            Siga três passos simples para reter informações de longo prazo e estar sempre preparado para exames.
          </p>

          <div className="lp-steps-container">
            <div className="lp-step-item">
              <div className="lp-step-number">01</div>
              <h3 className="lp-step-title">Cadastre-se</h3>
              <p className="lp-step-text">
                Crie sua conta em segundos de forma segura por formulário ou conectando-se diretamente ao Google OAuth.
              </p>
            </div>

            <div className="lp-step-item">
              <div className="lp-step-number">02</div>
              <h3 className="lp-step-title">Alimente a IA</h3>
              <p className="lp-step-text">
                Crie matérias organizadas e faça upload do material didático (PDF de livros, apostilas ou fotos de notas).
              </p>
            </div>

            <div className="lp-step-item">
              <div className="lp-step-number">03</div>
              <h3 className="lp-step-title">Revise e Retenha</h3>
              <p className="lp-step-text">
                Estude pelo reprodutor ativo de flashcards com atalhos físicos de teclado e acompanhe suas estatísticas de progresso.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing/Plans */}
      <section id="planos" className="lp-section" style={{ background: 'var(--bg-card-high)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div className="lp-section-inner">
          <h2 className="lp-section-title">Planos Simples e Transparentes</h2>
          <p className="lp-section-subtitle">
            Comece a estudar sem custo e assine o plano premium para obter acesso completo a ferramentas de IA e alertas ilimitados.
          </p>

          <div className="lp-pricing-cards">
            {/* Free Trial */}
            <div className="lp-price-card">
              <span className="lp-price-badge">Gratuito</span>
              <h3 className="lp-price-title">Estudante Trial</h3>
              <div className="lp-price-value">Grátis</div>
              <ul className="lp-price-features">
                <li><CheckCircle size={14} style={{ color: 'var(--color-success)' }} /> Acesso completo por 7 dias</li>
                <li><CheckCircle size={14} style={{ color: 'var(--color-success)' }} /> Flashcards e repetição SM-2</li>
                <li><CheckCircle size={14} style={{ color: 'var(--color-success)' }} /> Timer Pomodoro integrado</li>
                <li><CheckCircle size={14} style={{ color: 'var(--color-success)' }} /> Até 100 flashcards por dia</li>
              </ul>
              <button className="btn btn-secondary btn-full" onClick={() => handleNavToAuth('register')}>
                Experimentar 7 dias grátis
              </button>
            </div>

            {/* Premium Plan */}
            <div className="lp-price-card premium">
              <span className="lp-price-badge">Premium</span>
              <h3 className="lp-price-title">Estudante Pro</h3>
              <div className="lp-price-value">R$ 19,90 <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/mês</span></div>
              <ul className="lp-price-features">
                <li><CheckCircle size={14} style={{ color: 'var(--color-success)' }} /> Tudo do plano Gratuito</li>
                <li><CheckCircle size={14} style={{ color: 'var(--color-success)' }} /> Geração ilimitada de cards por IA</li>
                <li><CheckCircle size={14} style={{ color: 'var(--color-success)' }} /> Simulados de provas dissertativas ilimitados</li>
                <li><CheckCircle size={14} style={{ color: 'var(--color-success)' }} /> Lembretes automáticos via WhatsApp</li>
                <li><CheckCircle size={14} style={{ color: 'var(--color-success)' }} /> Suporte prioritário da equipe</li>
              </ul>
              <button className="btn btn-primary btn-full" onClick={() => handleNavToAuth('register')}>
                Assinar Agora
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <p className="lp-footer-text">
          <strong>SAAFO HUB</strong> &copy; {new Date().getFullYear()} - Sistema de Suporte aos Estudos.<br />
          Desenvolvido pela equipe <strong>Front-Enzos</strong> para o Hackathon 3º Período de ADS - IFRO.<br />
          <em>Memorização ativa, repetição espaçada e IA em um só lugar.</em>
        </p>
      </footer>
    </div>
  );
}
