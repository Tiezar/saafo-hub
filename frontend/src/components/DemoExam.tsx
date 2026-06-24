import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, ArrowRight, RotateCcw, ChevronRight } from 'lucide-react';
import './DemoExam.css';

/* ── Data ────────────────────────────────────────────────────────────────── */
interface Question {
  text: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface Subject {
  label: string;
  tag: string;
  questions: Question[];
}

const SUBJECTS: Subject[] = [
  {
    label: 'Dir. Constitucional',
    tag: 'CF/88',
    questions: [
      {
        text: 'Segundo o Art. 5º da Constituição Federal de 1988, os direitos e garantias fundamentais são assegurados a:',
        options: ['A) Somente aos cidadãos brasileiros natos', 'B) Somente aos cidadãos brasileiros, natos ou naturalizados', 'C) Aos brasileiros e aos estrangeiros residentes no País', 'D) A qualquer pessoa que esteja em território brasileiro'],
        correct: 2,
        explanation: 'O caput do Art. 5º garante esses direitos "aos brasileiros e aos estrangeiros residentes no País". Estrangeiros em trânsito têm proteção apenas por tratados internacionais — a residência é o critério do texto constitucional.',
      },
      {
        text: 'De acordo com o Art. 37 da CF/88, qual dos itens a seguir NÃO faz parte dos princípios expressos da Administração Pública?',
        options: ['A) Legalidade', 'B) Proporcionalidade', 'C) Publicidade', 'D) Eficiência'],
        correct: 1,
        explanation: 'Os princípios expressos do Art. 37 são Legalidade, Impessoalidade, Moralidade, Publicidade e Eficiência — o famoso LIMPE. A Proporcionalidade é princípio implícito, reconhecido pela doutrina, mas não está no texto do Art. 37.',
      },
      {
        text: 'São fundamentos da República Federativa do Brasil, conforme o Art. 1º da CF/88:',
        options: ['A) Soberania, cidadania, dignidade da pessoa humana, valores sociais do trabalho e da livre iniciativa, e pluralismo político', 'B) Soberania, autonomia, dignidade da pessoa humana, valores sociais do trabalho e da propriedade, e pluralismo político', 'C) Independência, cidadania, dignidade da pessoa humana, valores sociais do trabalho e da livre iniciativa, e separação dos Poderes', 'D) Soberania, cidadania, isonomia, valores sociais do trabalho e da livre iniciativa, e pluralismo político'],
        correct: 0,
        explanation: 'O Art. 1º elenca cinco fundamentos: I – soberania; II – cidadania; III – dignidade da pessoa humana; IV – os valores sociais do trabalho e da livre iniciativa; V – o pluralismo político. Memorize pelo acrônimo SoCi-DiVaPlu.',
      },
      {
        text: 'São cláusulas pétreas da CF/88, que NÃO podem ser suprimidas nem mesmo por emenda constitucional:',
        options: ['A) A forma federativa de Estado, o voto direto e secreto, a separação dos Poderes e os direitos e garantias individuais', 'B) A forma republicana de governo, o voto direto e secreto, a separação dos Poderes e os direitos e garantias individuais', 'C) A forma federativa de Estado, o voto direto e secreto, a separação dos Poderes e os direitos coletivos', 'D) A forma federativa de Estado, o voto direto e periódico, a harmonia entre os Poderes e os direitos fundamentais'],
        correct: 0,
        explanation: 'O Art. 60, §4º protege: I – a forma federativa de Estado; II – o voto direto, secreto, universal e periódico; III – a separação dos Poderes; IV – os direitos e garantias individuais. Atenção: "republicana" não é cláusula pétrea — pode ser alterada por emenda.',
      },
      {
        text: 'Para qual grupo o voto é FACULTATIVO segundo a Constituição Federal de 1988?',
        options: ['A) Maiores de 18 e menores de 70 anos, alfabetizados', 'B) Maiores de 70 anos, maiores de 16 e menores de 18 anos, e analfabetos', 'C) Apenas os maiores de 70 anos', 'D) Apenas os analfabetos e os menores de 16 anos'],
        correct: 1,
        explanation: 'Pelo Art. 14, §1º, o voto é OBRIGATÓRIO para maiores de 18 e menores de 70 anos alfabetizados. É FACULTATIVO para: analfabetos; maiores de 70 anos; e maiores de 16 e menores de 18 anos. Essas três categorias formam o grupo de voto facultativo.',
      },
    ],
  },
  {
    label: 'Língua Portuguesa',
    tag: 'Gramática',
    questions: [
      {
        text: 'Em "A questão é difícil, mas totalmente resolvível", a conjunção "mas" estabelece uma relação semântica de:',
        options: ['A) Adição de informações complementares', 'B) Adversidade entre as orações', 'C) Conclusão baseada na premissa anterior', 'D) Explicação da causa do fato'],
        correct: 1,
        explanation: '"Mas" é conjunção coordenativa adversativa: introduz uma ideia que se opõe ou contrasta com a anterior. Neste caso, a dificuldade contrasta com a resolubilidade. Não confunda com "e" (aditiva) ou "portanto" (conclusiva).',
      },
      {
        text: 'Assinale a alternativa em que o uso da CRASE está correto:',
        options: ['A) Fui à São Paulo ontem à tarde', 'B) Ela chegou às três horas da tarde', 'C) Ele vai à pé até o trabalho', 'D) Comprei um presente à ela'],
        correct: 1,
        explanation: '"Às três horas" = preposição "a" + artigo "as" (plural), uso correto. Em A, cidades sem artigo definido não admitem crase (São Paulo não usa artigo). Em C, "a pé" é locução adverbial que não admite crase. Em D, pronomes pessoais oblíquos não admitem artigo antes deles.',
      },
      {
        text: 'O verbo "assistir" em "O candidato assistiu ao julgamento" está empregado no sentido de:',
        options: ['A) Ajudar — com regência direta (objeto direto)', 'B) Presenciar — com regência indireta (objeto indireto com "a")', 'C) Ter direito — com regência direta', 'D) Caber — com regência indireta com "em"'],
        correct: 1,
        explanation: '"Assistir" no sentido de "ver, presenciar" é INDIRETO — exige a preposição "a": "assistiu ao julgamento" (a + o). Já no sentido de "ajudar, socorrer", é direto: "o médico assistiu o paciente". A regência muda conforme o significado.',
      },
      {
        text: 'Qual das seguintes frases apresenta concordância verbal CORRETA?',
        options: ['A) Fazem três anos que não chove na região', 'B) Faz três anos que não chove na região', 'C) Haviam muitos candidatos na fila', 'D) Existiam cerca de mil vagas no edital'],
        correct: 1,
        explanation: '"Faz três anos" está correto: verbos que indicam tempo decorrido são impessoais (ficam no singular). C está errada: "haver" no sentido de "existir" também é impessoal — correto seria "havia muitos candidatos". D está correta pois "existir" concorda normalmente com o sujeito.',
      },
      {
        text: 'Na frase "O estudo deve ser feito DE FORMA A garantir a retenção", o trecho em destaque indica:',
        options: ['A) Causa', 'B) Concessão', 'C) Finalidade', 'D) Consequência'],
        correct: 2,
        explanation: '"De forma a" equivale a "para que" ou "a fim de" — introduz uma oração que expressa a FINALIDADE (propósito) da ação anterior. Causa seria "porque"; concessão seria "embora"; consequência seria "de modo que".',
      },
    ],
  },
  {
    label: 'Matemática',
    tag: 'Raciocínio Num.',
    questions: [
      {
        text: 'Em uma prova com 10 questões, cada acerto vale 2 pontos e cada erro desconta 0,5 ponto. Um candidato acertou 7 questões. Qual foi sua pontuação final?',
        options: ['A) 11,0 pontos', 'B) 12,5 pontos', 'C) 13,0 pontos', 'D) 14,0 pontos'],
        correct: 1,
        explanation: 'Acertos: 7 × 2 = 14 pontos. Erros: (10 − 7) = 3 questões × 0,5 = 1,5 ponto de desconto. Pontuação final: 14 − 1,5 = 12,5 pontos. Sempre calcule o número de erros subtraindo os acertos do total.',
      },
      {
        text: 'Uma torneira enche um tanque em 6 horas. Outra o esvazia em 9 horas. Se ambas forem abertas simultaneamente com o tanque vazio, em quanto tempo ele ficará cheio?',
        options: ['A) 12 horas', 'B) 15 horas', 'C) 18 horas', 'D) 20 horas'],
        correct: 2,
        explanation: 'Taxa líquida = 1/6 − 1/9 = 3/18 − 2/18 = 1/18 do tanque por hora. Tempo = 1 ÷ (1/18) = 18 horas. A torneira que esvazia tem taxa negativa — nunca some as taxas sem considerar o sinal.',
      },
      {
        text: 'Um salário de R$ 2.500,00 recebeu um aumento de 12%. Qual o novo valor do salário?',
        options: ['A) R$ 2.700,00', 'B) R$ 2.750,00', 'C) R$ 2.800,00', 'D) R$ 2.812,50'],
        correct: 2,
        explanation: 'Aumento: 2.500 × 0,12 = R$ 300,00. Novo salário: 2.500 + 300 = R$ 2.800,00. Atalho: multiplique diretamente por 1,12 → 2.500 × 1,12 = R$ 2.800,00.',
      },
      {
        text: 'Uma progressão aritmética tem primeiro termo a₁ = 3 e razão r = 4. Qual é o valor do 10º termo?',
        options: ['A) 36', 'B) 39', 'C) 40', 'D) 43'],
        correct: 1,
        explanation: 'Fórmula: aₙ = a₁ + (n − 1) × r. Aplicando: a₁₀ = 3 + (10 − 1) × 4 = 3 + 36 = 39. Erro comum: usar n em vez de (n − 1), chegando a 43 — lembre-se de descontar 1 do índice.',
      },
      {
        text: 'Em uma urna com 4 bolas vermelhas e 6 bolas azuis, qual a probabilidade de retirar uma bola vermelha ao acaso?',
        options: ['A) 1/4', 'B) 2/5', 'C) 3/5', 'D) 2/3'],
        correct: 1,
        explanation: 'P = casos favoráveis / casos totais = 4 / (4 + 6) = 4/10 = 2/5. Erro comum: dividir 4/6 (razão entre vermelhas e azuis) — mas probabilidade sempre divide pelo total de elementos, não pela outra categoria.',
      },
    ],
  },
  {
    label: 'História do Brasil',
    tag: 'Cronologia',
    questions: [
      {
        text: 'A Independência do Brasil, proclamada em 7 de setembro de 1822, foi liderada por:',
        options: ['A) D. João VI, no Palácio de São Cristóvão, Rio de Janeiro', 'B) D. Pedro I, às margens do Rio Ipiranga, em São Paulo', 'C) José Bonifácio, na Assembleia Constituinte de 1823', 'D) D. Pedro II, após a abdicação de seu pai em 1831'],
        correct: 1,
        explanation: 'D. Pedro I proclamou a Independência em 7 de setembro de 1822, às margens do Rio Ipiranga (SP), com o "Grito do Ipiranga". D. João VI já havia retornado a Portugal; José Bonifácio foi o principal articulador político, mas não o proclamador.',
      },
      {
        text: 'A Proclamação da República em 15 de novembro de 1889 foi liderada principalmente por:',
        options: ['A) Monarquistas insatisfeitos com D. Pedro II', 'B) O movimento operário das grandes cidades', 'C) Setores do Exército aliados a fazendeiros republicanos, especialmente cafeicultores', 'D) A Igreja Católica, em oposição à política religiosa do Imperador'],
        correct: 2,
        explanation: 'A República foi proclamada por uma aliança entre militares (Marechal Deodoro da Fonseca) e a elite cafeicultora paulista, que queria maior autonomia para os estados. Esse arranjo originou o modelo "café com leite" da Primeira República.',
      },
      {
        text: 'A Lei Áurea, que aboliu definitivamente a escravidão no Brasil, foi assinada em:',
        options: ['A) 13 de maio de 1888, pela Princesa Isabel', 'B) 28 de setembro de 1871, pelo Imperador D. Pedro II', 'C) 13 de maio de 1889, pela Princesa Isabel', 'D) 7 de setembro de 1822, pelo Imperador D. Pedro I'],
        correct: 0,
        explanation: 'A Lei Áurea (Lei nº 3.353) foi assinada em 13 de maio de 1888 pela Princesa Isabel, que era regente enquanto D. Pedro II estava na Europa. Foi a lei mais curta da história brasileira — apenas dois artigos. A data 28/09/1871 refere-se à Lei do Ventre Livre.',
      },
      {
        text: 'O Estado Novo (1937–1945), período ditatorial de Getúlio Vargas, foi marcado por:',
        options: ['A) Adoção do parlamentarismo e ampliação dos direitos políticos', 'B) Fechamento do Congresso, outorga de nova Constituição e centralização do poder no Executivo', 'C) Criação de partidos de massa e eleições diretas periódicas', 'D) Descentralização política e fortalecimento dos governos estaduais'],
        correct: 1,
        explanation: 'O Estado Novo foi instaurado em 10/11/1937 com o fechamento do Congresso, a dissolução dos partidos e a outorga da "Constituição Polaca". Vargas concentrou os poderes Executivo e Legislativo e interveio nos estados até ser deposto pelos militares em 1945.',
      },
      {
        text: 'O AI-5, editado em dezembro de 1968 durante a ditadura militar, ficou conhecido por:',
        options: ['A) Estabelecer eleições diretas para presidente', 'B) Criar a ARENA e o MDB como únicos partidos permitidos', 'C) Suspender direitos políticos, fechar o Congresso e autorizar cassações sem revisão judicial', 'D) Decretar anistia geral para presos políticos'],
        correct: 2,
        explanation: 'O AI-5 (13/12/1968) foi o ato mais duro da ditadura: suspendeu o habeas corpus, fechou o Congresso, cassou mandatos e autorizou intervenção estatal sem controle judicial. Ficou conhecido como o "golpe dentro do golpe". O bipartidarismo ARENA/MDB foi criado pelo AI-2 (1965).',
      },
    ],
  },
  {
    label: 'Raciocínio Lógico',
    tag: 'Lógica',
    questions: [
      {
        text: 'Considere: "Todo concurseiro estuda lógica" e "João é concurseiro". A conclusão logicamente válida é:',
        options: ['A) Lógica é a matéria mais difícil do concurso', 'B) João estuda lógica', 'C) Quem estuda lógica é concurseiro', 'D) João passou no concurso'],
        correct: 1,
        explanation: 'Por silogismo (modus ponens): P1: Todo concurseiro estuda lógica. P2: João é concurseiro. Conclusão: João estuda lógica. As demais não se seguem das premissas — inverter a implicação (C) é a falácia da afirmação do consequente.',
      },
      {
        text: 'Se "P → Q" é verdadeira e "Q" é falsa, podemos concluir que:',
        options: ['A) P é verdadeira', 'B) P é falsa', 'C) P pode ser verdadeira ou falsa', 'D) A proposição P → Q é contraditória'],
        correct: 1,
        explanation: 'Pela contrapositiva (¬Q → ¬P): se Q é falsa e P → Q é verdadeira, então P deve ser falsa. Se P fosse verdadeira com Q falsa, a condicional seria falsa — contradição. Logo, P é necessariamente falsa.',
      },
      {
        text: 'Qual é a negação correta da proposição "Todos os candidatos estudaram muito"?',
        options: ['A) Nenhum candidato estudou muito', 'B) Alguns candidatos não estudaram muito', 'C) Todos os candidatos não estudaram muito', 'D) A maioria dos candidatos não estudou muito'],
        correct: 1,
        explanation: 'A negação de "Todos são P" é "Existe pelo menos um que não é P", ou seja, "Alguns não são P". Negar "Todos estudaram" resulta em "Alguns NÃO estudaram". A alternativa A ("nenhum") seria uma negação mais forte do que o necessário.',
      },
      {
        text: 'Qual o valor lógico de (V ∧ F) ∨ V, onde V = verdadeiro e F = falso?',
        options: ['A) Falso, pois a conjunção à esquerda é falsa', 'B) Verdadeiro, pois a disjunção com V é sempre verdadeira', 'C) Falso, pois qualquer operação com F resulta em F', 'D) Verdadeiro somente se ambos os operandos da disjunção forem V'],
        correct: 1,
        explanation: 'Resolvendo por precedência: (V ∧ F) = F. Depois: F ∨ V = V. A disjunção (∨) é verdadeira quando ao menos um operando é V. Portanto, o resultado é VERDADEIRO. Regra-chave: ∧ exige os dois V; ∨ basta um V.',
      },
      {
        text: 'Em uma turma de 30 alunos, 18 estudam Direito, 15 estudam Contabilidade e 8 estudam ambas. Quantos alunos não estudam nenhuma das duas?',
        options: ['A) 3', 'B) 5', 'C) 7', 'D) 8'],
        correct: 1,
        explanation: 'Pela fórmula da união: |D ∪ C| = 18 + 15 − 8 = 25. Alunos fora dos dois conjuntos: 30 − 25 = 5. Diagrama de Venn: só Direito = 10, ambos = 8, só Contabilidade = 7 → total nos conjuntos = 25; fora = 5.',
      },
    ],
  },
];

type Phase = 'idle' | 'generating' | 'streaming' | 'ready' | 'answered';

function pickQuestion(subject: Subject, usedIndices: Set<number>): { q: Question; idx: number } {
  const available = subject.questions
    .map((q, i) => ({ q, i }))
    .filter(({ i }) => !usedIndices.has(i));
  const pool = available.length > 0 ? available : subject.questions.map((q, i) => ({ q, i }));
  const picked = pool[Math.floor(Math.random() * pool.length)];
  return { q: picked.q, idx: picked.i };
}

/* ── Component ───────────────────────────────────────────────────────────── */
export default function DemoExam({ onRegister }: { onRegister: () => void }) {
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [phase, setPhase]                     = useState<Phase>('idle');
  const [question, setQuestion]               = useState<Question | null>(null);
  const [streamIdx, setStreamIdx]             = useState(0);
  const [visibleOptions, setVisibleOptions]   = useState(0);
  const [chosen, setChosen]                   = useState<number | null>(null);
  const usedRef                               = useRef<Map<number, Set<number>>>(new Map());

  /* streaming character by character */
  useEffect(() => {
    if (phase !== 'streaming' || !question) return;
    if (streamIdx >= question.text.length) {
      /* after question fully streamed, fade-in options */
      let i = 0;
      const interval = setInterval(() => {
        i += 1;
        setVisibleOptions(i);
        if (i >= question.options.length) {
          clearInterval(interval);
          setPhase('ready');
        }
      }, 120);
      return () => clearInterval(interval);
    }
    const t = setTimeout(() => setStreamIdx(s => s + 1), 11);
    return () => clearTimeout(t);
  }, [phase, streamIdx, question]);

  const generate = () => {
    if (selectedSubject === null) return;
    const subject = SUBJECTS[selectedSubject];
    if (!usedRef.current.has(selectedSubject)) {
      usedRef.current.set(selectedSubject, new Set());
    }
    const used = usedRef.current.get(selectedSubject)!;
    const { q, idx } = pickQuestion(subject, used);
    used.add(idx);

    setPhase('generating');
    setQuestion(q);
    setStreamIdx(0);
    setVisibleOptions(0);
    setChosen(null);

    setTimeout(() => setPhase('streaming'), 1600);
  };

  const answer = (i: number) => {
    if (phase !== 'ready') return;
    setChosen(i);
    setPhase('answered');
  };

  const reset = () => {
    setPhase('idle');
    setQuestion(null);
    setChosen(null);
    setStreamIdx(0);
    setVisibleOptions(0);
  };

  const isCorrect = chosen !== null && question !== null && chosen === question.correct;

  return (
    <div className="demo-shell">
      {/* ── window chrome ───────────────────────────────────────── */}
      <div className="demo-shell-bar">
        <div className="demo-shell-dots">
          <span /><span /><span />
        </div>
        <span className="demo-shell-title">SAAFO HUB — Simulado</span>
        <div className="demo-gemini-badge">
          <span className={`demo-gemini-dot${phase === 'generating' || phase === 'streaming' ? ' is-active' : ''}`} />
          {phase === 'generating' || phase === 'streaming' ? 'IA processando' : 'IA pronta'}
        </div>
      </div>

      {/* ── picker row ──────────────────────────────────────────── */}
      <div className={`demo-picker-section${phase !== 'idle' ? ' has-question' : ''}`}>
        <p className="demo-picker-label">Tema da questão</p>
        <div className="demo-picker-row">
          <div className="demo-subjects">
            {SUBJECTS.map((s, i) => (
              <button
                key={s.label}
                className={`demo-subject-pill${selectedSubject === i ? ' is-selected' : ''}`}
                onClick={() => { setSelectedSubject(i); if (phase !== 'idle') reset(); }}
                disabled={phase === 'generating' || phase === 'streaming'}
              >
                <span className="demo-pill-tag">{s.tag}</span>
                {s.label}
              </button>
            ))}
          </div>
          <div className="demo-swipe-hint" aria-hidden="true">
            <ChevronRight size={11} />
            <ChevronRight size={11} />
            <ChevronRight size={11} />
          </div>
          <button
            className="btn btn-primary demo-generate-btn"
            onClick={generate}
            disabled={selectedSubject === null || phase === 'generating' || phase === 'streaming'}
          >
            <Sparkles size={15} />
            {phase === 'generating' || phase === 'streaming'
              ? 'Gerando...'
              : question && phase !== 'idle'
              ? 'Nova questão'
              : 'Gerar questão'}
          </button>
        </div>
      </div>

      {/* ── question area ───────────────────────────────────────── */}
      {phase !== 'idle' && (
        <div className="demo-question-area">
          {/* generating state */}
          {phase === 'generating' && (
            <div className="demo-generating">
              <div className="demo-generating-dots">
                <span /><span /><span />
              </div>
              <p className="demo-generating-text">Formulando questão de múltipla escolha…</p>
            </div>
          )}

          {/* streaming + ready + answered */}
          {(phase === 'streaming' || phase === 'ready' || phase === 'answered') && question && (
            <>
              <div className="demo-question-meta">
                <span className="demo-question-label">Múltipla escolha</span>
                {selectedSubject !== null && (
                  <span className="demo-card-tag">{SUBJECTS[selectedSubject].tag}</span>
                )}
              </div>

              <p className="demo-question-text">
                {question.text.slice(0, streamIdx)}
                {phase === 'streaming' && <span className="demo-cursor" />}
              </p>

              <div className="demo-options">
                {question.options.map((opt, i) => {
                  const visible  = i < visibleOptions || phase === 'ready' || phase === 'answered';
                  const isChosen = chosen === i;
                  const correct  = question.correct === i;

                  let cls = 'demo-option';
                  if (phase === 'answered') {
                    if (correct)       cls += ' is-correct';
                    else if (isChosen) cls += ' is-wrong';
                  }
                  if (isChosen && phase !== 'answered') cls += ' is-chosen';

                  return (
                    <button
                      key={i}
                      className={cls}
                      style={{ opacity: visible ? 1 : 0, transitionDelay: `${i * 80}ms` }}
                      onClick={() => answer(i)}
                      disabled={phase !== 'ready'}
                    >
                      <span className="demo-option-indicator" />
                      {opt}
                      {phase === 'answered' && correct && (
                        <span className="demo-option-mark demo-correct-mark">✓</span>
                      )}
                      {phase === 'answered' && isChosen && !correct && (
                        <span className="demo-option-mark demo-wrong-mark">✕</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* explanation */}
              {phase === 'answered' && (
                <div className={`demo-explanation${isCorrect ? ' is-correct' : ' is-wrong'}`}>
                  <p className="demo-explanation-verdict">
                    {isCorrect ? '✓ Resposta correta!' : '✕ Resposta incorreta'}
                  </p>
                  <p className="demo-explanation-text">{question.explanation}</p>
                </div>
              )}
            </>
          )}

          {/* footer actions */}
          {phase === 'answered' && (
            <div className="demo-card-footer">
              <button className="demo-reset-btn" onClick={generate}>
                <RotateCcw size={14} />
                Próxima questão
              </button>
              <button className="btn btn-primary demo-cta" onClick={onRegister}>
                Gerar simulado completo <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
