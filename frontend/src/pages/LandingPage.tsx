import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Brain, Trophy, Clock,
  Sun, Moon, ArrowRight, MessageSquare, BarChart3,
  Smartphone, MoreHorizontal,
  LayoutDashboard, BookOpen, Layers, Timer, Menu,
} from 'lucide-react';
import { SiAnki, SiNotion, SiGooglecalendar, SiWhatsapp, SiYoutube } from 'react-icons/si';
import { useApp } from '../contexts/AppContext';
import DemoExam from '../components/DemoExam';
import './LandingPage.css';

const FEATURES = [
  {
    icon: <Brain size={22} />,
    title: 'Flashcards com Repetição Espaçada',
    text: 'Revise só o que precisa, na hora certa. O algoritmo SM-2 calcula o intervalo ideal para cada card — você só precisa aparecer todos os dias.',
  },
  {
    icon: <Trophy size={22} />,
    title: 'Simulados Gerados por IA',
    text: 'Provas de múltipla escolha ou dissertativas criadas sob medida pelo Gemini com base no seu material. Gabarito e feedback imediato.',
  },
  {
    icon: <Sparkles size={22} />,
    title: 'Criação de Cards por IA',
    text: 'Carregue um PDF, uma imagem de apostila ou cole seu resumo. Em segundos, você tem flashcards organizados e prontos para revisar.',
  },
  {
    icon: <Clock size={22} />,
    title: 'Pomodoro Integrado',
    text: 'Timer de foco com ciclos personalizáveis e sonorização. Dentro da mesma tela, sem abrir outro app ou perder o contexto.',
  },
  {
    icon: <MessageSquare size={22} />,
    title: 'Lembretes via WhatsApp',
    text: 'Agende revisões no calendário e receba notificações direto no WhatsApp. Nada de esquecer uma revisão importante.',
  },
  {
    icon: <BarChart3 size={22} />,
    title: 'Insights Automáticos',
    text: 'Veja sua sequência de estudos, matérias com mais dificuldade e padrões de produtividade — com análise automática da IA.',
  },
];

const PAIN_TOOLS: { label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { label: 'Anki',          Icon: SiAnki },
  { label: 'Notion',        Icon: SiNotion },
  { label: 'Google Agenda', Icon: SiGooglecalendar },
  { label: 'App de provas', Icon: Smartphone },
  { label: 'WhatsApp',      Icon: SiWhatsapp },
  { label: 'YouTube',       Icon: SiYoutube },
  { label: 'Mais',          Icon: MoreHorizontal },
];

const DIFFICULTIES = [
  { label: 'Difícil', next: 'amanhã',    cls: 'lp-preview-hard' },
  { label: 'Normal',  next: 'em 3 dias', cls: 'lp-preview-ok'   },
  { label: 'Fácil',   next: 'em 7 dias', cls: 'lp-preview-easy' },
] as const;

const SAMPLE_CARDS = [
  {
    subject: 'Direito Constitucional',
    question: 'Quais são os direitos fundamentais garantidos pelo Art. 5º da Constituição Federal?',
    questionShort: 'Direitos fundamentais do Art. 5º CF/88?',
    answer: 'Igualdade, liberdade, segurança e propriedade — garantidos a brasileiros e estrangeiros residentes no País.',
  },
  {
    subject: 'Direito Administrativo',
    question: 'Quais são os princípios expressos da Administração Pública segundo o Art. 37 da CF/88?',
    questionShort: 'Princípios do Art. 37 CF/88?',
    answer: 'Legalidade, Impessoalidade, Moralidade, Publicidade e Eficiência — memorize pelo acrônimo LIMPE.',
  },
  {
    subject: 'Raciocínio Lógico',
    question: 'Uma proposição condicional (p → q): em quais casos ela é falsa?',
    questionShort: 'Quando p → q é falsa?',
    answer: 'Apenas quando a hipótese (p) é verdadeira e a conclusão (q) é falsa. Nas demais combinações, a condicional é verdadeira.',
  },
  {
    subject: 'Língua Portuguesa',
    question: 'Qual a diferença de uso entre "mau" e "mal"?',
    questionShort: '"Mau" vs "mal" — como diferenciar?',
    answer: '"Mau" é adjetivo (oposto de bom). "Mal" é advérbio ou substantivo (oposto de bem). Troque pela dupla bom/bem: o que encaixar indica qual usar.',
  },
  {
    subject: 'História do Brasil',
    question: 'O que foi a Proclamação da República e em que data ocorreu?',
    questionShort: 'Proclamação da República — data e contexto?',
    answer: 'Em 15 de novembro de 1889, o Marechal Deodoro da Fonseca proclamou a República, encerrando o Segundo Reinado de D. Pedro II.',
  },
  {
    subject: 'Informática',
    question: 'O que é o protocolo TCP/IP e qual a função de cada parte?',
    questionShort: 'Função do TCP e do IP?',
    answer: 'TCP garante a entrega confiável e ordenada dos pacotes. IP cuida do endereçamento e roteamento entre redes. Juntos formam a base da internet.',
  },
  {
    subject: 'Matemática',
    question: 'Como calcular juros simples? Escreva a fórmula e explique cada variável.',
    questionShort: 'Fórmula de juros simples?',
    answer: 'J = C × i × t. Onde C = capital inicial, i = taxa de juros (em decimal), t = tempo. O montante final é M = C + J.',
  },
  {
    subject: 'Geografia do Brasil',
    question: 'Quais são as cinco regiões geográficas do Brasil e seus estados?',
    questionShort: 'As 5 regiões do Brasil?',
    answer: 'Norte (7 estados), Nordeste (9), Centro-Oeste (4), Sudeste (4) e Sul (3). Total de 26 estados + DF.',
  },
] as const;

function pickNext(current: number): number {
  if (SAMPLE_CARDS.length <= 1) return 0;
  let next = Math.floor(Math.random() * SAMPLE_CARDS.length);
  while (next === current) next = Math.floor(Math.random() * SAMPLE_CARDS.length);
  return next;
}

function HeroCard() {
  const [cardIdx, setCardIdx]       = useState(0);
  const [flipped, setFlipped]       = useState(false);
  const [confirmed, setConfirmed]   = useState<{ label: string; next: string } | null>(null);
  const [autoActive, setAutoActive] = useState<number | null>(null);
  const [manual, setManual]         = useState(false);
  const timerRef                    = useRef<number>(0);

  const card = SAMPLE_CARDS[cardIdx];

  const handleDifficulty = (d: { label: string; next: string }) => {
    clearTimeout(timerRef.current);
    setManual(true);
    setAutoActive(null);
    setConfirmed(d);
    timerRef.current = window.setTimeout(() => {
      setConfirmed(null);
      setFlipped(false);
      setCardIdx(prev => pickNext(prev));
    }, 2400);
  };

  const handleFlip = () => {
    if (flipped || confirmed) return;
    clearTimeout(timerRef.current);
    setManual(true);
    setFlipped(true);
  };

  // Auto-demo: flip → highlight Normal → confirm → next card → loop
  useEffect(() => {
    if (manual) return;

    timerRef.current = window.setTimeout(() => {
      setFlipped(true);

      timerRef.current = window.setTimeout(() => {
        setAutoActive(1); // Normal (índice 1)

        timerRef.current = window.setTimeout(() => {
          setAutoActive(null);
          setConfirmed(DIFFICULTIES[1]);

          timerRef.current = window.setTimeout(() => {
            setConfirmed(null);
            setFlipped(false);
            setCardIdx(prev => pickNext(prev)); // dispara o próximo ciclo
          }, 2000);
        }, 700);
      }, 1800);
    }, 2200);

    return () => clearTimeout(timerRef.current);
  }, [manual, cardIdx]);

  return (
    <div className="lp-hero-preview">
      <div className="lp-preview-bar">
        <span className="lp-preview-label">{card.subject}</span>
        <span className="lp-preview-badge">8 cards hoje</span>
      </div>

      {/* 3-D flip area */}
      <div
        className="lp-flashcard-scene"
        onClick={handleFlip}
      >
        <div className={`lp-flashcard${flipped ? ' is-flipped' : ''}`}>
          {/* Front */}
          <div className="lp-flashcard-face lp-flashcard-front">
            <p className="lp-preview-question">{card.question}</p>
            <span className={`lp-flip-hint${!manual && !flipped ? ' is-pulsing' : ''}`}>
              Clique para ver a resposta →
            </span>
          </div>
          {/* Back */}
          <div className="lp-flashcard-face lp-flashcard-back">
            <p className="lp-preview-question-sm">{card.questionShort}</p>
            <div className="lp-preview-divider" />
            <p className="lp-preview-answer">{card.answer}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="lp-preview-footer">
        {confirmed ? (
          <div className="lp-preview-confirmed">
            <span className="lp-confirmed-icon">✓</span>
            <span>
              <strong>{confirmed.label}</strong> — próxima revisão {confirmed.next}
            </span>
          </div>
        ) : flipped ? (
          <div className="lp-preview-actions">
            {DIFFICULTIES.map((d, i) => (
              <button
                key={d.label}
                className={`lp-preview-btn ${d.cls}${autoActive === i ? ' is-auto-active' : ''}`}
                onClick={() => handleDifficulty(d)}
              >
                {d.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="lp-preview-footer-hint">Como foi essa resposta?</p>
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useApp();

  const goToAuth = (mode?: string) => {
    navigate(mode === 'register' ? '/auth?mode=register' : '/auth');
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="lp-container">

      {/* ── Header ─────────────────────────────────────────────────── */}
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
            <button className="lp-nav-link" onClick={() => scrollTo('funcionalidades')}>Recursos</button>
            <button className="lp-nav-link" onClick={() => scrollTo('como-funciona')}>Como Funciona</button>
            <button className="lp-nav-link" onClick={() => scrollTo('planos')}>Planos</button>
          </nav>
          <div className="lp-header-actions">
            <button
              className="lp-theme-toggle"
              onClick={toggleTheme}
              title="Alternar tema"
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => goToAuth()}>
              Entrar
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => goToAuth('register')}>
              Começar grátis
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="lp-section lp-hero">
        <div className="lp-section-inner lp-hero-inner">

          {/* Left: copy */}
          <div className="lp-hero-left">
            <span className="lp-eyebrow">14 dias grátis · Sem cartão de crédito</span>

            <h1 className="lp-hero-title">
              Menos apps,<br />menos distração.
              <br />
              <span className="lp-hero-accent">Mais foco. Mais<br />chance de passar.</span>
            </h1>

            <p className="lp-hero-subtitle">
              Flashcards com repetição espaçada, simulados por IA e calendário de estudos —
              tudo em um único lugar. Para quem precisa passar.
            </p>

            <div className="lp-hero-cta">
              <button className="btn btn-primary btn-lg lp-cta-btn" onClick={() => goToAuth('register')}>
                Começar grátis <ArrowRight size={18} />
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => scrollTo('como-funciona')}>
                Ver como funciona
              </button>
            </div>

            <p className="lp-hero-microcopy">
              Acesso completo durante o trial · R$19/mês depois · Cancele quando quiser
            </p>
          </div>

          {/* Right: flashcard inside iOS phone mockup */}
          <div className="lp-hero-right">
            <div className="lp-phone-frame">
              <div className="lp-phone-body">
                <div className="lp-phone-screen">
                  {/* status bar */}
                  <div className="lp-phone-statusbar">
                    <span className="lp-phone-time">9:41</span>
                    <div className="lp-phone-island" />
                    <div className="lp-phone-status-icons">
                      <div className="lp-phone-signal">
                        <span /><span /><span /><span />
                      </div>
                      <div className="lp-phone-battery"><div /></div>
                    </div>
                  </div>
                  {/* app content — layout fiel ao app real */}
                  <div className="lp-phone-content">
                    {/* App header */}
                    <div className="lp-app-header">
                      <div>
                        <span className="lp-app-header-title">Revisão Diária</span>
                        <span className="lp-app-header-sub">Direito Constitucional</span>
                      </div>
                      <span className="lp-app-header-badge">8 hoje</span>
                    </div>

                    {/* Flashcard interativo */}
                    <div className="lp-app-main">
                      <HeroCard />
                    </div>

                    {/* Bottom nav — igual ao app mobile */}
                    <nav className="lp-app-bottom-nav">
                      {([
                        { icon: LayoutDashboard, label: 'Dash' },
                        { icon: BookOpen,        label: 'Matérias' },
                        { icon: Layers,          label: 'Cards',  active: true },
                        { icon: Timer,           label: 'Foco' },
                        { icon: Menu,            label: 'Mais' },
                      ] as { icon: React.ComponentType<{size?:number}>; label: string; active?: boolean }[]).map(({ icon: Icon, label, active }) => (
                        <div key={label} className={`lp-app-nav-item${active ? ' is-active' : ''}`}>
                          <Icon size={17} />
                          <span>{label}</span>
                        </div>
                      ))}
                    </nav>
                  </div>
                  {/* home indicator */}
                  <div className="lp-phone-home" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Pain bar ────────────────────────────────────────────────── */}
      <div className="lp-pain-bar">
        <div className="lp-section-inner lp-pain-inner">
          <p className="lp-pain-label">Quantos desses você usa hoje para estudar?</p>
          <div className="lp-pain-tools">
            {PAIN_TOOLS.map(({ label, Icon }) => (
              <span key={label} className="lp-pain-tool" title={label}>
                <Icon size={22} />
              </span>
            ))}
          </div>
          <p className="lp-pain-solution">
            No SAAFO HUB, tudo isso está em um único lugar.
          </p>
        </div>
      </div>

      {/* ── Features ────────────────────────────────────────────────── */}
      <section id="funcionalidades" className="lp-section lp-section-alt">
        <div className="lp-section-inner">
          <h2 className="lp-section-title">Tudo que você precisa para passar</h2>
          <p className="lp-section-subtitle">
            Cada ferramenta foi pensada para o que você realmente usa — e integrada para que
            você nunca precise sair da plataforma.
          </p>
          <div className="lp-features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="lp-feature-card">
                <div className="lp-feature-icon">{f.icon}</div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-text">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section id="como-funciona" className="lp-section">
        <div className="lp-section-inner">
          <h2 className="lp-section-title">Como funciona</h2>
          <p className="lp-section-subtitle">
            Três passos para sair do caos de múltiplas ferramentas e entrar numa rotina
            que realmente funciona.
          </p>

          <div className="lp-steps-container">
            <div className="lp-step-item">
              <div className="lp-step-number">01</div>
              <h3 className="lp-step-title">Crie sua conta</h3>
              <p className="lp-step-text">
                Cadastro em segundos por e-mail ou Google. Sem formulários longos, sem cartão.
                Você começa a estudar imediatamente.
              </p>
            </div>
            <div className="lp-step-connector" aria-hidden="true" />
            <div className="lp-step-item">
              <div className="lp-step-number">02</div>
              <h3 className="lp-step-title">Alimente com seu material</h3>
              <p className="lp-step-text">
                Carregue PDFs, imagens de apostilas ou cole seu resumo. A IA gera flashcards
                e questões prontos para revisar.
              </p>
            </div>
            <div className="lp-step-connector" aria-hidden="true" />
            <div className="lp-step-item">
              <div className="lp-step-number">03</div>
              <h3 className="lp-step-title">Revise todo dia</h3>
              <p className="lp-step-text">
                O algoritmo SM-2 define o que você revisa e quando. Cada sessão aumenta sua
                retenção de longo prazo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Demo exam ───────────────────────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-section-inner">
          <h2 className="lp-section-title">Veja a IA em ação</h2>
          <p className="lp-section-subtitle">
            Escolha um tema, gere uma questão real e responda agora —
            sem criar conta.
          </p>
          <DemoExam onRegister={() => goToAuth('register')} />
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <section id="planos" className="lp-section lp-section-alt">
        <div className="lp-section-inner">
          <h2 className="lp-section-title">Simples e sem surpresas</h2>
          <p className="lp-section-subtitle">
            Comece de graça. Assine só se fizer sentido para você.
          </p>

          <div className="lp-pricing-cards">
            <div className="lp-price-card">
              <span className="lp-price-badge">Trial</span>
              <h3 className="lp-price-title">14 dias grátis</h3>
              <div className="lp-price-value">R$ 0</div>
              <ul className="lp-price-features">
                <li>Acesso completo a todas as funcionalidades</li>
                <li>Flashcards ilimitados com SM-2</li>
                <li>Geração por IA (texto, PDF, imagem)</li>
                <li>Simulados de múltipla escolha e dissertativos</li>
                <li>Pomodoro + Calendário + Lembretes WhatsApp</li>
              </ul>
              <button className="btn btn-secondary btn-full" onClick={() => goToAuth('register')}>
                Começar agora, grátis
              </button>
              <p className="lp-price-micro">Sem cartão de crédito</p>
            </div>

            <div className="lp-price-card lp-price-card-premium">
              <span className="lp-price-badge">Estudante</span>
              <h3 className="lp-price-title">Plano Mensal</h3>
              <div className="lp-price-value">
                R$ 19 <span className="lp-price-period">/mês</span>
              </div>
              <ul className="lp-price-features">
                <li>Tudo do trial, sem limite de tempo</li>
                <li>IA ilimitada para geração de cards</li>
                <li>Simulados e provas ilimitados</li>
                <li>6 insights automáticos de progresso</li>
                <li>Lembretes automáticos via WhatsApp</li>
                <li>Suporte prioritário</li>
              </ul>
              <button className="btn btn-primary btn-full" onClick={() => goToAuth('register')}>
                Começar com 14 dias grátis
              </button>
              <p className="lp-price-micro">Cancele quando quiser</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ──────────────────────────────────────────────── */}
      <section className="lp-section lp-final-cta">
        <div className="lp-section-inner lp-final-cta-inner">
          <h2 className="lp-final-cta-title">Comece a estudar com mais foco hoje.</h2>
          <p className="lp-final-cta-sub">14 dias com acesso completo. Sem cartão de crédito.</p>
          <button className="btn btn-primary btn-lg lp-cta-btn" onClick={() => goToAuth('register')}>
            Criar conta grátis <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <img
            src={theme === 'dark' ? '/saafo-hub-logo-dark.png' : '/saafo-hub-logo.png'}
            alt="SAAFO HUB"
            className="lp-footer-logo"
          />
          <div className="lp-footer-nav-row">
            <div className="lp-footer-links">
              <button className="lp-nav-link" onClick={() => scrollTo('funcionalidades')}>Recursos</button>
              <button className="lp-nav-link" onClick={() => scrollTo('como-funciona')}>Como Funciona</button>
              <button className="lp-nav-link" onClick={() => scrollTo('planos')}>Planos</button>
            </div>
            <div className="lp-footer-legal">
              <a href="/privacidade" className="lp-nav-link">Privacidade</a>
              <a href="/termos" className="lp-nav-link">Termos de Uso</a>
              <button
                className="lp-nav-link"
                onClick={() => window.dispatchEvent(new Event('openCookieManager'))}
              >
                Gerenciar cookies
              </button>
            </div>
          </div>
          <p className="lp-footer-text">
            © {new Date().getFullYear()} SAAFO HUB. Todos os direitos reservados.
          </p>
        </div>
      </footer>

    </div>
  );
}
