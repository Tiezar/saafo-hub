# Polimento de Layout Frontend e Tema Híbrido Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar o visual do frontend para torná-lo um produto premium e minimalista com tema claro/escuro de alto contraste.

**Architecture:** O controle do tema será feito por uma classe `.light-theme` injetada no elemento HTML raiz gerenciada por estado React e localStorage. Toda a estilização utilizará variáveis CSS nativas em `index.css` que mudam de valor dependendo do tema ativo.

**Tech Stack:** React 19, TypeScript, Lucide React, Vite, Vanilla CSS.

---

### Task 1: Estruturação das Variáveis de Tema em index.css

**Files:**
- Modify: `frontend/src/index.css:1-45`

- [ ] **Step 1: Substituir as variáveis do `:root` para mapear os temas claro e escuro**
  Substituir os tokens existentes de cores no topo do arquivo pelos novos tokens de cores de alto contraste, e criar a classe `.light-theme`.
  
  ```css
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap');

  :root {
    --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
    --font-heading: 'Outfit', sans-serif;

    /* Tema Escuro (Padrão) */
    --bg-deep: #09090b;
    --bg-surface: #18181b;
    --bg-card: rgba(24, 24, 27, 0.65);
    --bg-card-hover: rgba(39, 39, 42, 0.85);
    --border-color: rgba(255, 255, 255, 0.08);
    --border-hover: rgba(124, 58, 237, 0.4);
    
    --text-primary: #f4f4f5;
    --text-secondary: #a1a1aa;
    --text-muted: #71717a;
    
    --color-primary: #7c3aed;
    --color-primary-light: #a78bfa;
    --color-secondary: #0891b2;
    --color-success: #10b981;
    --color-danger: #ef4444;
    --color-warning: #f59e0b;
    
    --grad-primary: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
    --grad-accent: linear-gradient(135deg, #0891b2 0%, #3b82f6 100%);
    --grad-success: linear-gradient(135deg, #10b981 0%, #059669 100%);
    --grad-danger: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
    
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.5);
    --shadow-md: 0 8px 24px -4px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 16px 40px -8px rgba(0, 0, 0, 0.6);
    
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 16px;
    --radius-xl: 24px;
    
    --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .light-theme {
    /* Tema Claro */
    --bg-deep: #fafafa;
    --bg-surface: #ffffff;
    --bg-card: rgba(255, 255, 255, 0.75);
    --bg-card-hover: rgba(244, 244, 245, 0.9);
    --border-color: rgba(0, 0, 0, 0.08);
    --border-hover: rgba(109, 40, 217, 0.4);
    
    --text-primary: #09090b;
    --text-secondary: #71717a;
    --text-muted: #a1a1aa;
    
    --color-primary: #6d28d9;
    --color-primary-light: #7c3aed;
    --color-secondary: #0369a1;
    --color-success: #059669;
    --color-danger: #dc2626;
    --color-warning: #d97706;
    
    --grad-primary: linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%);
    --grad-accent: linear-gradient(135deg, #0369a1 0%, #2563eb 100%);
    --grad-success: linear-gradient(135deg, #059669 0%, #047857 100%);
    --grad-danger: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
    
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 12px -2px rgba(0, 0, 0, 0.08);
    --shadow-lg: 0 12px 28px -6px rgba(0, 0, 0, 0.12);
  }
  ```

- [ ] **Step 2: Commitar a estruturação inicial das variáveis**
  ```bash
  git add frontend/src/index.css
  git commit -m "style: define light and dark theme css variables"
  ```

---

### Task 2: Implementação da Lógica do Tema e Switcher no React

**Files:**
- Modify: `frontend/src/App.tsx:80-100` (injetar estado e efeito), `frontend/src/App.tsx` (adicionar botão de alternância nas views)

- [ ] **Step 1: Inserir estado do tema e sincronização no topo do componente App**
  Localizar a linha 80 do `frontend/src/App.tsx` e injetar o estado `theme` e o respectivo `useEffect`:
  
  ```typescript
  // Navigation & Authentication
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'subjects' | 'ai' | 'profile'>('dashboard');
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => {
    const currentToken = localStorage.getItem('token');
    return !currentToken || 
           currentToken === 'google-oauth-mock-token' || 
           currentToken.startsWith('fake-jwt-') || 
           window.location.search.includes('mock=true');
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Theme Management
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  ```

- [ ] **Step 2: Adicionar botão de toggle de tema para visitantes (Tela de Login)**
  Adicionar no topo do JSX de retorno da tela de login (linha ~693) o botão flutuante para alternar tema:
  
  ```tsx
  if (!token) {
    return (
      <div className="auth-wrapper">
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="theme-toggle-floating"
          title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="auth-card">
  ```
  *(Nota: Importar `Sun` e `Moon` do `lucide-react` no topo do arquivo)*

- [ ] **Step 3: Adicionar botão de toggle de tema na Sidebar do usuário autenticado**
  Localizar o bloco `user-profile-summary` (linha ~907) e inserir o botão ao lado do botão de logout:
  
  ```tsx
  {currentUser && (
    <div className="user-profile-summary">
      <div className="avatar">
        {currentUser.name.charAt(0).toUpperCase()}
      </div>
      <div style={{ flexGrow: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentUser.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {currentUser.email}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
          title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button 
          onClick={handleLogout} 
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
          title="Sair"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  )}
  ```

- [ ] **Step 4: Certificar importações do Lucide React no topo de App.tsx**
  Certificar-se de importar `Sun` e `Moon` da biblioteca `lucide-react` na linha ~1:
  ```typescript
  import { 
    BookOpen, 
    Layers, 
    Sparkles, 
    User as UserIcon, 
    LogOut, 
    TrendingUp, 
    Plus, 
    Trash2, 
    CheckCircle, 
    Flame, 
    Brain, 
    Search, 
    RotateCw, 
    ChevronRight,
    AlertCircle,
    HelpCircle,
    Check,
    Sun,
    Moon
  } from 'lucide-react';
  ```

- [ ] **Step 5: Commit da lógica de tema**
  ```bash
  git add frontend/src/App.tsx
  git commit -m "feat: implement light/dark theme switching logic and toggler UI"
  ```

---

### Task 3: Estilização do Tema Claro e Polimento Geral no CSS

**Files:**
- Modify: `frontend/src/index.css` (linha 50 em diante)

- [ ] **Step 1: Polir o layout do corpo (body) e scrollbar**
  Ajustar background-image e transição suave de cores ao alternar temas:
  ```css
  body {
    font-family: var(--font-sans);
    background-color: var(--bg-deep);
    color: var(--text-primary);
    min-height: 100vh;
    overflow-x: hidden;
    line-height: 1.5;
    background-image: 
      radial-gradient(at 0% 0%, rgba(139, 92, 246, 0.06) 0px, transparent 50%),
      radial-gradient(at 50% 100%, rgba(6, 182, 212, 0.04) 0px, transparent 50%);
    transition: background-color 0.2s ease, color 0.2s ease;
  }
  ```

- [ ] **Step 2: Atualizar Sidebar e Itens de Navegação (nav-item-btn)**
  Mudar para um visual minimalista onde o item ativo tem fundo sutil e borda roxa discreta, e não um gradiente roxo gigante:
  ```css
  .sidebar {
    width: 260px;
    background: var(--bg-surface);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    padding: 24px 16px;
    position: sticky;
    top: 0;
    height: 100vh;
    flex-shrink: 0;
    z-index: 10;
    transition: background-color 0.2s ease, border-color 0.2s ease;
  }

  .nav-item-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-sans);
    font-weight: 500;
    font-size: 14px;
    cursor: pointer;
    text-align: left;
    transition: var(--transition);
  }

  .nav-item-btn:hover {
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.02);
  }

  .light-theme .nav-item-btn:hover {
    background: rgba(0, 0, 0, 0.02);
  }

  .nav-item-btn.active {
    color: var(--text-primary);
    background: rgba(124, 58, 237, 0.06);
    border-left: 3px solid var(--color-primary);
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    font-weight: 600;
    box-shadow: none;
  }
  
  .light-theme .nav-item-btn.active {
    background: rgba(109, 40, 217, 0.05);
  }
  ```

- [ ] **Step 3: Estilizar o botão flutuante e do rodapé do Switcher de Tema**
  ```css
  .theme-toggle-floating {
    position: absolute;
    top: 24px;
    right: 24px;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: var(--transition);
    box-shadow: var(--shadow-sm);
  }

  .theme-toggle-floating:hover {
    color: var(--text-primary);
    border-color: var(--border-hover);
    transform: scale(1.05);
  }
  ```

- [ ] **Step 4: Refinar o visual do Auth Card (Login / Cadastro)**
  Remover cores pesadas e desfoque genérico:
  ```css
  .auth-card {
    width: 100%;
    max-width: 440px;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 40px;
    box-shadow: var(--shadow-lg);
    text-align: center;
    transition: var(--transition);
  }

  .auth-title {
    font-family: var(--font-heading);
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 8px;
    color: var(--text-primary);
  }
  ```

- [ ] **Step 5: Polir Elementos de Formulários (Inputs e Botões)**
  ```css
  .form-input {
    width: 100%;
    padding: 10px 14px;
    background: var(--bg-deep);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-sans);
    font-size: 14px;
    transition: var(--transition);
  }

  .form-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.1);
  }

  .btn-primary {
    width: 100%;
    padding: 12px;
    background: var(--color-primary);
    border: none;
    border-radius: var(--radius-sm);
    color: white;
    font-family: var(--font-sans);
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    transition: var(--transition);
  }

  .btn-primary:hover {
    background: var(--color-primary-light);
    transform: none;
    box-shadow: var(--shadow-md);
  }

  .btn-secondary {
    width: 100%;
    padding: 12px;
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-sans);
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    transition: var(--transition);
  }

  .btn-secondary:hover {
    background: var(--bg-card-hover);
    border-color: var(--text-muted);
  }
  ```

- [ ] **Step 6: Polir os Cards do Dashboard e Bento-Grid**
  Substituir efeitos de movimentação por realce de borda:
  ```css
  .stat-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: var(--shadow-sm);
    transition: var(--transition);
  }

  .stat-card:hover {
    transform: none;
    border-color: var(--border-hover);
    box-shadow: var(--shadow-md);
  }

  .stat-icon {
    width: 42px;
    height: 42px;
    border-radius: var(--radius-sm);
    background: rgba(124, 58, 237, 0.08);
    color: var(--color-primary);
    display: grid;
    place-items: center;
  }
  ```

- [ ] **Step 7: Refinar Tabelas (Estilo SaaS Premium)**
  ```css
  .custom-table th {
    background: var(--bg-deep);
    padding: 10px 14px;
    font-weight: 600;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border-color);
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .custom-table td {
    padding: 12px 14px;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-primary);
    font-size: 14px;
  }
  ```

- [ ] **Step 8: Refinar o Heatmap e o visualizador de Flashcards**
  ```css
  .heatmap-day {
    aspect-ratio: 1;
    border-radius: 2px;
    background: var(--border-color);
    transition: var(--transition);
  }

  .study-card-front, .study-card-back {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    padding: 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-lg);
    text-align: center;
  }

  .study-card-front {
    background: var(--bg-surface);
    color: var(--text-primary);
  }

  .study-card-back {
    background: var(--bg-surface);
    color: var(--text-primary);
    transform: rotateY(180deg);
  }

  .study-card-text {
    font-size: 24px;
    font-weight: 600;
    line-height: 1.4;
    font-family: var(--font-heading);
    color: var(--text-primary);
  }

  .rating-btn {
    padding: 8px 14px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    color: var(--text-primary);
    cursor: pointer;
    transition: var(--transition);
    font-weight: 600;
  }

  .rating-btn:hover {
    transform: none;
    border-color: var(--color-primary);
    background: rgba(124, 58, 237, 0.05);
  }
  ```

- [ ] **Step 9: Commit das melhorias CSS**
  ```bash
  git add frontend/src/index.css
  git commit -m "style: apply premium layout polish and dynamic light/dark style details"
  ```

---

### Task 4: Validação do Build e Qualidade de Código

**Files:**
- Test: Execução de comandos no terminal na pasta `frontend`

- [ ] **Step 1: Rodar o lint para garantir que não há erros de TypeScript**
  Run: `npm run lint` na pasta `frontend`
  Expected: Sucesso sem erros de compilação ou linter.

- [ ] **Step 2: Rodar o build de produção para certificar o compilador**
  Run: `npm run build` na pasta `frontend`
  Expected: Sucesso completo gerando a pasta `dist` sem erros.

- [ ] **Step 3: Commit final dos arquivos compilados ou correções de lint caso necessário**
  ```bash
  git commit -m "chore: verify build and TypeScript compliance after ui polish" --allow-empty
  ```
