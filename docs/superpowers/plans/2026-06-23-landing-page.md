# Landing Page SAAFO HUB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar uma landing page de alta conversão estruturada com menu superior, Hero, grid de recursos, guia de como funciona, planos de preços e rodapé acadêmico, respeitando o design token e o fluxo de autenticação existentes.

**Architecture:** O roteador no `App.tsx` será reorganizado para expor rotas públicas (`/` para a landing page, `/auth` para login/cadastro) e rotas privadas protegidas (dashboard e ferramentas acadêmicas). Modificamos os links de dashboard para `/dashboard` no menu e na barra mobile, e ajustamos a tela de autenticação para detectar quando deve iniciar diretamente no formulário de cadastro.

**Tech Stack:** React (Vite), TypeScript, React Router DOM, Vanilla CSS, Lucide React icons.

---

### Task 1: Reestruturar Rotas Públicas e Privadas

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Modificar as rotas no App.tsx**

Substitua o componente `AppShell` no arquivo `frontend/src/App.tsx` para encapsular toda a estrutura de rotas dentro do `<BrowserRouter>` e aplicar a lógica de visibilidade de rotas baseadas no `token`.

```typescript
function AppShell() {
  const { token, initializing, checkoutOpen, setCheckoutOpen, planSelectionOpen, setPlanSelectionOpen } = useApp();
  const updateAvailable = useVersionCheck();

  if (initializing) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="logo-icon" style={{ width: 48, height: 48, margin: '0 auto 16px', fontSize: 24, display: 'grid', placeItems: 'center', animation: 'pulse 1.5s infinite ease-in-out' }}>S</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Carregando SAAFO HUB...</div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        <Route path="/auth" element={token ? <Navigate to="/dashboard" replace /> : <Auth />} />

        {/* Rotas Privadas (dentro do Layout com Sidebar) */}
        <Route element={token ? <AppLayout /> : <Navigate to="/auth" replace />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="materiais" element={<Materials />} />
          <Route path="cards"     element={<MyCards />} />
          <Route path="ia"        element={<AIGenerator />} />
          <Route path="calendario" element={<CalendarPage />} />
          <Route path="pomodoro"  element={<Pomodoro />} />
          <Route path="provas"    element={<ExamSession />} />
          <Route path="perfil"    element={<Profile />} />
          <Route path="admin"     element={<Admin />} />
        </Route>

        {/* Redirecionamento de Fallback */}
        <Route path="*" element={<Navigate to={token ? "/dashboard" : "/"} replace />} />
      </Routes>
      <UpdateBanner visible={updateAvailable} />
      <UpgradeModal />
      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
      <PlanSelectionModal
        open={planSelectionOpen}
        onTrial={() => setPlanSelectionOpen(false)}
        onSubscribe={() => { setPlanSelectionOpen(false); setCheckoutOpen(true); }}
      />
    </BrowserRouter>
  );
}
```

*Nota: Certifique-se de importar o componente `LandingPage` no topo de `frontend/src/App.tsx`:*
```typescript
import LandingPage from './pages/LandingPage';
```

- [ ] **Step 2: Verificar a compilação do TypeScript**

Execute:
```bash
npm run build --prefix frontend
```
Expected: O build pode falhar porque `LandingPage` ainda não foi criada, mas a estrutura de arquivos e importação em `App.tsx` estará correta.

---

### Task 2: Atualizar Links do Dashboard no Sidebar e AppLayout

**Files:**
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Modify: `frontend/src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Modificar o NavLink do Dashboard no Sidebar**

No arquivo `frontend/src/components/layout/Sidebar.tsx` (linha 102), mude o atributo `to` de `"/"` para `"/dashboard"` para evitar redirecionamento e conflito de rota ativa.

```typescript
        {/* Dashboard Link (Always Top Level) */}
        <NavLink
          to="/dashboard"
          end
          className="sidebar-nav-item"
          onClick={onClose}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>
```

- [ ] **Step 2: Modificar o NavLink do Dashboard no AppLayout**

No arquivo `frontend/src/components/layout/AppLayout.tsx` (linha 478), mude o atributo `to` de `"/"` para `"/dashboard"` no menu de navegação inferior mobile.

```typescript
        <nav className="mobile-bottom-nav">
          <NavLink to="/dashboard" end className={({ isActive }) => `mobile-bottom-nav-item${isActive ? ' active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>Dash</span>
          </NavLink>
```

---

### Task 3: Suporte a Parâmetros de Cadastro na Página Auth

**Files:**
- Modify: `frontend/src/pages/Auth.tsx`

- [ ] **Step 1: Modificar Auth.tsx para detectar query params**

Modifique o componente `Auth` no arquivo `frontend/src/pages/Auth.tsx` para analisar a URL usando `URLSearchParams` ao carregar a página e definir `isRegistering` como `true` se `mode === 'register'` (vindo do CTA da Landing Page).

Adicione o seguinte bloco no `useEffect` de montagem da página:

```typescript
  // Handle register mode from landing page CTA
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'register') {
      setIsRegistering(true);
    }
  }, []);
```

---

### Task 4: Criar Componente LandingPage e seu Estilo

**Files:**
- Create: `frontend/src/pages/LandingPage.tsx`
- Create: `frontend/src/pages/LandingPage.css`

- [ ] **Step 1: Criar o arquivo de estilo LandingPage.css**

Crie o arquivo `frontend/src/pages/LandingPage.css` utilizando os design tokens semânticos do SAAFO HUB.

```css
.lp-container {
  min-height: 100vh;
  background-color: var(--bg-base);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
}

/* Header */
.lp-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(254, 242, 228, 0.85); /* Fundo card light semi-transparente */
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--border-color);
  padding: 16px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.15s ease;
}

.dark-theme .lp-header {
  background: rgba(26, 23, 20, 0.85); /* Fundo base dark semi-transparente */
}

.lp-header-inner {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lp-logo {
  height: 32px;
  display: block;
}

.lp-nav {
  display: flex;
  gap: 24px;
}

.lp-nav-link {
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-decoration: none;
  cursor: pointer;
  transition: color var(--transition);
}

.lp-nav-link:hover {
  color: var(--color-primary);
  text-decoration: none;
}

.lp-header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Sections */
.lp-section {
  padding: 80px 24px;
  display: flex;
  justify-content: center;
}

.lp-section-inner {
  max-width: 1000px;
  width: 100%;
}

/* Hero Section */
.lp-hero {
  text-align: center;
  padding: 100px 24px 80px;
}

.lp-hero-title {
  font-family: var(--font-display);
  font-size: 44px;
  font-weight: 700;
  line-height: 1.25;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.lp-hero-subtitle {
  font-family: var(--font-body);
  font-size: 18px;
  color: var(--text-secondary);
  max-width: 700px;
  margin: 0 auto 36px;
  line-height: 1.6;
}

.lp-hero-cta {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 48px;
}

.lp-hero-preview {
  margin-top: 24px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  box-shadow: 0 10px 30px rgba(0,0,0,0.08);
  padding: 40px;
  text-align: left;
}

/* Features Grid */
.lp-features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-top: 40px;
}

.lp-feature-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 24px;
  transition: transform var(--transition), border-color var(--transition);
}

.lp-feature-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-primary);
}

.lp-feature-icon {
  color: var(--color-primary);
  margin-bottom: 16px;
}

.lp-feature-title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}

.lp-feature-text {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Steps */
.lp-steps-container {
  display: flex;
  justify-content: space-between;
  gap: 32px;
  margin-top: 48px;
}

.lp-step-item {
  flex: 1;
  text-align: center;
}

.lp-step-number {
  font-family: var(--font-label);
  font-size: 32px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 16px;
}

.lp-step-title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}

.lp-step-text {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Pricing cards */
.lp-pricing-cards {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-top: 40px;
}

.lp-price-card {
  flex: 1;
  max-width: 380px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 32px;
  text-align: center;
  display: flex;
  flex-direction: column;
}

.lp-price-card.premium {
  border-color: var(--color-primary);
  box-shadow: 0 4px 20px rgba(163, 59, 58, 0.08);
}

.lp-price-badge {
  font-family: var(--font-label);
  font-size: 10px;
  font-weight: 700;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 16px;
}

.lp-price-title {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}

.lp-price-value {
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 24px;
  color: var(--text-primary);
}

.lp-price-features {
  list-style: none;
  padding: 0;
  margin: 0 0 32px;
  text-align: left;
  flex-grow: 1;
}

.lp-price-features li {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Footer */
.lp-footer {
  background: var(--bg-card);
  border-top: 1px solid var(--border-color);
  padding: 48px 32px;
  text-align: center;
  margin-top: auto;
}

.lp-footer-text {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
}

/* General typography */
.lp-section-title {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 12px;
}

.lp-section-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  text-align: center;
  max-width: 600px;
  margin: 0 auto 40px;
}

/* Responsive */
@media (max-width: 768px) {
  .lp-header {
    padding: 16px 20px;
  }
  .lp-nav {
    display: none;
  }
  .lp-hero-title {
    font-size: 32px;
  }
  .lp-hero-subtitle {
    font-size: 15px;
  }
  .lp-features-grid {
    grid-template-columns: 1fr;
  }
  .lp-steps-container {
    flex-direction: column;
    gap: 40px;
  }
  .lp-pricing-cards {
    flex-direction: column;
    align-items: center;
  }
  .lp-price-card {
    width: 100%;
  }
}
```

- [ ] **Step 2: Criar o arquivo do componente LandingPage.tsx**

Crie o arquivo `frontend/src/pages/LandingPage.tsx` com a estrutura completa e ícones da biblioteca `lucide-react`.

```typescript
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
            <button className="sidebar-action-btn" onClick={toggleTheme} title="Alternar tema" style={{ width: 34, height: 34 }}>
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
            <button className="btn btn-primary btn-lg" onClick={() => handleNavToAuth('register')}>
              Começar Gratuitamente <ArrowRight size={18} />
            </button>
          </div>

          {/* Card Preview Mockup */}
          <div className="lp-hero-preview">
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>💡</span>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>
                  Exemplo de Flashcard formulado por IA
                </h3>
              </div>
              <span style={{ fontFamily: 'var(--font-label)', fontSize: 11, backgroundColor: 'var(--bg-card-high)', padding: '2px 8px', borderRadius: 4, color: 'var(--color-primary)' }}>
                SM-2 Ativo
              </span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 24, lineHeight: 1.6 }}>
              <strong>Pergunta:</strong> Como a Curva de Esquecimento de Ebbinghaus impacta o estudo passivo tradicional e de que forma a repetição espaçada mitiga essa perda?
            </p>
            <div style={{ padding: 12, borderRadius: 6, background: 'var(--bg-base)', border: '1px dashed var(--border-color)', fontSize: 13, color: 'var(--text-secondary)' }}>
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
```

---

### Task 5: Validar Compilação e Executar Build de Produção

**Files:**
- Test: `frontend/package.json`

- [ ] **Step 1: Executar build completo do frontend**

Execute o seguinte comando no terminal para validar que o compilador do TypeScript e o bundler do Vite estão gerando os arquivos de distribuição sem erros de compilação de novas importações ou arquivos.

Run:
```bash
npm run build --prefix frontend
```
Expected: O comando deve completar com sucesso (exit code 0), mostrando no output que os arquivos de bundles `dist/assets/*.js` e `dist/assets/*.css` foram gerados corretamente.
