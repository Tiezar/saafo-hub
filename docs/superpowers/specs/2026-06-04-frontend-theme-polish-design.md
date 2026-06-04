# Spec de Design: Polimento do Layout Frontend e Tema Híbrido (Light/Dark)

**Data**: 2026-06-04
**Projeto**: SAAFO HUB Frontend
**Objetivo**: Refatorar e polir o layout atual do frontend usando Vanilla CSS refinado para eliminar o aspecto genérico, introduzindo um tema híbrido claro/escuro de alto contraste (estilo Vercel/Linear).

---

## 1. Escopo e Requisitos

### Requisitos Funcionais
1. **Alternância de Tema (Light/Dark)**:
   - Suporte a tema claro e escuro de alto contraste.
   - Sincronização automática com as preferências do sistema operacional.
   - Persistência da preferência do usuário no `localStorage`.
   - Botão para alternar tema na barra lateral (sidebar) para usuários logados e no canto superior direito para visitantes (tela de login/registro).
2. **Polimento de Componentes**:
   - Menu lateral (sidebar) com marcadores visuais discretos e elegantes.
   - Grid Bento para o Dashboard de estatísticas.
   - Tabela de dados de desempenho com cabeçalhos compactos e legibilidade aprimorada.
   - Heatmap de atividades com espaçamento uniforme e gradientes de cores da marca.
   - Centralização e destaque tipográfico na tela de estudos (Player de Flashcards).

### Requisitos não Funcionais
- **Clean Code & SOLID**: Todo o CSS de temas estruturado em variáveis nativas centralizadas no `:root`.
- **Performance**: Zero dependências adicionais de estilização; renderização instantânea do CSS.
- **Acessibilidade (WCAG)**: Contraste de texto mínimo de 4.5:1 em ambos os temas.

---

## 2. Design System & Tokens de Cores

As variáveis CSS abaixo serão centralizadas no `:root` do arquivo `index.css`. O tema escuro é o padrão. Quando a classe `.light-theme` estiver presente no elemento raiz, as variáveis serão atualizadas para o tema claro.

```css
:root {
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-heading: 'Outfit', sans-serif;

  /* Tema Escuro (Padrão) */
  --bg-deep: #09090b;
  --bg-surface: #18181b;
  --bg-card: rgba(24, 24, 27, 0.65);
  --bg-card-hover: rgba(39, 39, 42, 0.8);
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
  
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  
  --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Tema Claro */
.light-theme {
  --bg-deep: #fafafa;
  --bg-surface: #ffffff;
  --bg-card: rgba(255, 255, 255, 0.7);
  --bg-card-hover: rgba(244, 244, 245, 0.8);
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
  
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02);
}
```

---

## 3. Lógica do Tema (App.tsx)

No `App.tsx`, implementaremos o estado para gerenciar e persistir o tema selecionado:

```typescript
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

---

## 4. Diretrizes de Refatoração de Componentes

### 4.1. Sidebar
- Remover o gradiente chamativo roxo do item ativo. Substituir por uma borda lateral roxa (`border-left: 2px solid var(--color-primary)`) e fundo cinza sutil.
- Incluir o botão de toggle de tema ao lado do avatar.

### 4.2. Cards e Stats Grid
- Remover transições de `transform: translateY(-2px)` bruscas ou excessivas. Utilizar efeitos suaves baseados em borda e sombra.
- Centralizar ícones de estatísticas com fundos circulares translúcidos correspondentes à cor do tema.

### 4.3. Heatmap
- Definir tamanhos uniformes e espaçamento fino (`4px` de gap).
- Adicionar cores suaves que mudam dinamicamente dependendo do tema.

### 4.4. Flashcard Player
- Visual minimalista focado no texto.
- Tipografia grande (`24px` a `28px`) usando a fonte de títulos `Outfit`.
- Opção de escala suave ao revelar a resposta.

---

## 5. Anti-padrões a Evitar
1. **Emojis**: Nunca usar emojis como ícones de controle. Usar estritamente ícones do `lucide-react`.
2. **Cores hardcoded no React**: Nunca usar cores hexadecimais explícitas no JSX (`style={{ color: '#8b5cf6' }}`). Usar sempre variáveis CSS (`style={{ color: 'var(--color-primary)' }}`).
3. **Mudanças bruscas de layout**: Assegurar que a alternância entre temas não cause layout shift ou pisques indesejados na tela.
