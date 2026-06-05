import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

export interface GeneratedCard {
  front: string;
  back: string;
}

export interface QuizQuestion {
  textBase?: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface Insight {
  type: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

export interface EssayEvaluation {
  score: number;
  feedback: string;
  correct: string[];
  missing: string[];
}

export interface GeminiGenerateOptions {
  text?: string;
  fileBuffer?: Buffer;
  mimeType?: string;
  theme?: string;
  count?: number;
  existingCards?: { front: string }[];
}

const INLINE_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB — use Files API above this

const SYSTEM_PROMPT = `Você é um especialista em educação ativa, memorização espaçada e elaboração de flashcards de alta qualidade.

Ao analisar o conteúdo fornecido, siga estas diretrizes rigorosas:

FRENTE (front):
- Formule como pergunta direta, lacuna de completamento ("____ é responsável por...") ou pedido de definição
- Seja específico o suficiente para ter uma única resposta correta
- Evite perguntas vagas ou excessivamente amplas
- Use o mesmo vocabulário técnico do texto original

VERSO (back):
- Resposta direta, objetiva e completa — sem rodeios
- Inclua o essencial (definição, mecanismo, fórmula, consequência) em 1–3 frases
- Quando cabível, adicione um exemplo prático ou mnemônico entre parênteses

REGRAS GERAIS:
- Priorize: definições técnicas, relações causa-efeito, fórmulas, etapas de processos, exceções e comparações
- NÃO gere cards duplicados ou excessivamente similares
- NÃO parafraseie trivialmente — cada card deve agregar valor independente
- Escreva 100% em português brasileiro, tom acadêmico direto
- Distribua os cards para cobrir o conteúdo de forma abrangente, não repetitiva`;

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  private readonly model = 'gemini-2.5-flash';

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY ?? '';
  }

  async generateFlashcards(options: GeminiGenerateOptions): Promise<GeneratedCard[]> {
    if (!this.apiKey) {
      throw new InternalServerErrorException('GEMINI_API_KEY não configurado.');
    }

    const parts = await this.buildParts(options);
    const countTarget = options.count ?? 10;
    const themeContext = options.theme?.trim()
      ? `\n\nTEMA ESPECÍFICO: "${options.theme.trim()}" — gere flashcards exclusivamente sobre este assunto.`
      : '';
    const countInstruction = `\n\nGere EXATAMENTE ${countTarget} flashcards. Nem mais, nem menos. Se o conteúdo for insuficiente para ${countTarget} cards únicos de qualidade, gere o máximo possível sem repetir.`;
    const dedupeInstruction = options.existingCards?.length
      ? `\n\nCARDS JÁ EXISTENTES NO TÓPICO (NÃO repita perguntas iguais ou muito similares a estas):\n${options.existingCards.map((c, i) => `${i + 1}. ${c.front}`).join('\n')}`
      : '';

    const userTextPart = {
      text: options.text
        ? `Analise o seguinte conteúdo de estudos e gere flashcards:${themeContext}${countInstruction}${dedupeInstruction}\n\n${options.text}`
        : `Analise o conteúdo enviado e gere flashcards objetivos.${themeContext}${countInstruction}${dedupeInstruction}`,
    };

    const payload = {
      contents: [{ parts: [...parts, userTextPart] }],
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            cards: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  front: { type: 'STRING' },
                  back:  { type: 'STRING' },
                },
                required: ['front', 'back'],
              },
            },
          },
          required: ['cards'],
        },
      },
    };

    try {
      const res = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Resposta vazia da Gemini API');

      const parsed = JSON.parse(rawText);
      if (!Array.isArray(parsed.cards)) throw new Error('Formato inválido retornado pela IA');

      return parsed.cards as GeneratedCard[];
    } catch (err) {
      this.logger.error(`Gemini generation failed: ${(err as Error).message}`);
      throw new InternalServerErrorException(
        `Falha ao gerar flashcards: ${(err as Error).message}`,
      );
    }
  }

  // ── Insights generation ───────────────────────────────────────────────────

  async generateInsights(data: {
    userName: string;
    streak: number;
    overdueCount: number;
    subjects: { name: string; retention: number; totalCards: number }[];
    upcomingExams: { title: string; daysUntil: number }[];
    bestDayOfWeek: string;
    dominantSubject?: string;
    dominantSubjectPct: number;
    weakestSubject?: string;
    weakestRetention: number | null;
    totalSubjects: number;
  }): Promise<Insight[]> {
    if (!this.apiKey) throw new InternalServerErrorException('GEMINI_API_KEY não configurado.');

    const payload = {
      contents: [{
        parts: [{
          text: `Analise os dados de estudo abaixo e gere insights personalizados:\n\n${JSON.stringify(data, null, 2)}`,
        }],
      }],
      systemInstruction: {
        parts: [{
          text: `Você é um tutor de estudos. Gere insights ULTRA-CURTOS para leitura em 2 segundos.
REGRAS RÍGIDAS:
- Gere exatamente 4 insights
- title: 3 a 4 palavras, imperativo (ex: "Revise Direito Civil")
- message: 1 frase, MÁXIMO 8 palavras, use números (ex: "23 cards atrasados. Revise hoje.")
- PROIBIDO: frases longas, explicações, introduções, repetir o título
- Português direto, sem vírgulas desnecessárias
- Types: streak, weak_subject, exam_alert, overdue_cards, productivity_pattern, focus_concentration
- Não mencione exames se upcomingExams estiver vazio`,
        }],
      },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            insights: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  type:     { type: 'STRING' },
                  title:    { type: 'STRING', maxLength: 40 },
                  message:  { type: 'STRING', maxLength: 80 },
                  priority: { type: 'STRING', enum: ['high', 'medium', 'low'] },
                },
                required: ['type', 'title', 'message', 'priority'],
              },
            },
          },
          required: ['insights'],
        },
      },
    };

    try {
      const res = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
      );
      if (!res.ok) throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
      const resp = await res.json();
      const rawText = resp.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Resposta vazia da Gemini API');
      const parsed = JSON.parse(rawText);
      if (!Array.isArray(parsed.insights)) throw new Error('Formato inválido');
      return (parsed.insights as Insight[]).map(ins => ({
        ...ins,
        title:   ins.title.length   > 40 ? ins.title.slice(0, 38) + '…'   : ins.title,
        message: ins.message.length > 80 ? ins.message.slice(0, 78) + '…' : ins.message,
      }));
    } catch (err) {
      this.logger.error(`Gemini insights failed: ${(err as Error).message}`);
      throw new InternalServerErrorException(`Falha ao gerar insights: ${(err as Error).message}`);
    }
  }

  // ── Exam generation (profile-based) ─────────────────────────────────────────

  async generateExam(
    cards: { front: string; back: string }[],
    profileId: 'quick' | 'applied' | 'contextual',
    count: number,
  ): Promise<QuizQuestion[]> {
    if (!this.apiKey) throw new InternalServerErrorException('GEMINI_API_KEY não configurado.');

    const PROFILE_SYSTEM: Record<string, string> = {
      quick: `Você é um professor criando questões de REVISÃO RÁPIDA em português brasileiro.
ESTILO: questões DIRETAS e CURTAS (máximo 3 linhas no campo "question").
FOCO: reconhecimento de definições, conceitos, nomenclaturas e relações diretas.
NÃO use texto-base ou cenário narrativo — a pergunta vai direto ao ponto.
Opções incorretas: plausíveis mas claramente distintas.
O campo "textBase" deve ser OMITIDO ou string vazia.`,

      applied: `Você é um professor criando questões de PROVA APLICADA em português brasileiro.
ESTILO: cada questão apresenta um contexto curto (2 a 5 linhas) DENTRO do campo "question".
FORMATO: inicie com "Em um experimento...", "Uma empresa observou...", "O paciente apresentou..." etc.
OBJETIVO: exigir que o estudante APLIQUE o conceito, não apenas reconheça.
Opções incorretas: bem elaboradas, representando erros comuns de raciocínio.
O campo "textBase" deve ser OMITIDO ou string vazia.`,

      contextual: `Você é um professor criando questões estilo VESTIBULAR/CONCURSO em português brasileiro.
OBRIGATÓRIO para cada questão:
1. Campo "textBase": texto de 6 a 15 linhas descrevendo cenário, caso, situação real ou hipotética em linguagem formal.
2. Campo "question": pergunta de ANÁLISE, INFERÊNCIA ou INTERPRETAÇÃO — NÃO respondível apenas pelo texto-base. Exige domínio do conteúdo.
ESTILO: ENEM, Fuvest, Cespe/Cebraspe, concurso público. Tom formal e técnico.
PROIBIDO: pergunta que a resposta esteja explícita no texto-base.`,
    };

    const PROFILE_USER_HINT: Record<string, string> = {
      quick:      'Gere questões de revisão rápida (1-3 linhas, diretas ao ponto):',
      applied:    'Gere questões aplicadas com contexto situacional curto:',
      contextual: 'Gere questões estilo vestibular com texto-base longo (6-15 linhas) e pergunta de análise:',
    };

    const context = cards.map(c => `• ${c.front} → ${c.back}`).join('\n');

    const payload = {
      contents: [{
        parts: [{
          text: `${PROFILE_USER_HINT[profileId]}\n\nBase de conhecimento (${cards.length} flashcards):\n${context}\n\nGere EXATAMENTE ${count} questões de múltipla escolha.`,
        }],
      }],
      systemInstruction: { parts: [{ text: PROFILE_SYSTEM[profileId] }] },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            questions: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  textBase:     { type: 'STRING' },
                  question:     { type: 'STRING' },
                  options:      { type: 'ARRAY', items: { type: 'STRING' } },
                  correctIndex: { type: 'INTEGER' },
                  explanation:  { type: 'STRING' },
                },
                required: ['question', 'options', 'correctIndex', 'explanation'],
              },
            },
          },
          required: ['questions'],
        },
      },
    };

    try {
      const res = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
      );
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API ${res.status}: ${errText}`);
      }
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Resposta vazia da Gemini API');
      const parsed = JSON.parse(rawText);
      if (!Array.isArray(parsed.questions)) throw new Error('Formato inválido retornado pela IA');
      return parsed.questions as QuizQuestion[];
    } catch (err) {
      this.logger.error(`Gemini exam generation failed: ${(err as Error).message}`);
      throw new InternalServerErrorException(`Falha ao gerar prova: ${(err as Error).message}`);
    }
  }

  // ── Essay evaluation ──────────────────────────────────────────────────────

  async evaluateEssayAnswer(
    question: string,
    expectedAnswer: string,
    userAnswer: string,
  ): Promise<EssayEvaluation> {
    if (!this.apiKey) throw new InternalServerErrorException('GEMINI_API_KEY não configurado.');

    const payload = {
      contents: [{
        parts: [{
          text: `Avalie a resposta do estudante para a seguinte questão:

QUESTÃO: ${question}

GABARITO (resposta esperada): ${expectedAnswer}

RESPOSTA DO ESTUDANTE: ${userAnswer || '(sem resposta)'}`,
        }],
      }],
      systemInstruction: {
        parts: [{
          text: `Você é um professor avaliando respostas dissertativas de estudantes.
Analise com rigor e precisão, comparando a resposta do estudante com o gabarito.

Avalie e retorne:
- score: nota de 0 a 10 (inteiro), onde 10 = completa e correta, 0 = sem resposta ou totalmente errada
- feedback: 1-3 frases explicando a nota, tom didático e encorajador
- correct: lista com os pontos que o estudante acertou ou mencionou (pode ser vazia)
- missing: lista com os pontos importantes que faltaram ou estão incorretos (pode ser vazia)

Critérios: seja justo mas exigente. Conceitos corretos mas incompletos = nota parcial. Termos diferentes mas equivalentes = aceite. Informação factualmente errada = desconte.
Escreva em português brasileiro.`,
        }],
      },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            score:    { type: 'INTEGER' },
            feedback: { type: 'STRING' },
            correct:  { type: 'ARRAY', items: { type: 'STRING' } },
            missing:  { type: 'ARRAY', items: { type: 'STRING' } },
          },
          required: ['score', 'feedback', 'correct', 'missing'],
        },
      },
    };

    try {
      const res = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
      );
      if (!res.ok) throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Resposta vazia da Gemini API');
      const parsed = JSON.parse(rawText) as EssayEvaluation;
      parsed.score = Math.max(0, Math.min(10, parsed.score));
      return parsed;
    } catch (err) {
      this.logger.error(`Gemini essay evaluation failed: ${(err as Error).message}`);
      throw new InternalServerErrorException(`Falha ao avaliar resposta: ${(err as Error).message}`);
    }
  }

  // ── File API ──────────────────────────────────────────────────────────────

  private async buildParts(options: GeminiGenerateOptions): Promise<object[]> {
    if (!options.fileBuffer || !options.mimeType) return [];

    if (options.fileBuffer.length <= INLINE_SIZE_LIMIT) {
      return [
        {
          inlineData: {
            mimeType: options.mimeType,
            data: options.fileBuffer.toString('base64'),
          },
        },
      ];
    }

    const fileUri = await this.uploadToFilesApi(options.fileBuffer, options.mimeType);
    return [{ fileData: { mimeType: options.mimeType, fileUri } }];
  }

  private async uploadToFilesApi(buffer: Buffer, mimeType: string): Promise<string> {
    const metadata = JSON.stringify({ file: { displayName: `upload-${Date.now()}` } });
    const boundary = `boundary_${Date.now()}`;

    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n`),
      Buffer.from(metadata),
      Buffer.from(`\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
      buffer,
      Buffer.from(`\r\n--${boundary}--`),
    ]);

    const res = await fetch(
      `${this.baseUrl}/upload/v1beta/files?uploadType=multipart&key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
      },
    );

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Gemini Files API upload failed ${res.status}: ${t}`);
    }

    const data = await res.json();
    const fileUri = data.file?.uri;
    if (!fileUri) throw new Error('Files API did not return a URI');

    await this.waitForFileProcessing(data.file.name);
    return fileUri;
  }

  private async waitForFileProcessing(fileName: string): Promise<void> {
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const res = await fetch(
        `${this.baseUrl}/${fileName}?key=${this.apiKey}`,
      );
      if (!res.ok) continue;
      const data = await res.json();
      if (data.state === 'ACTIVE') return;
      if (data.state === 'FAILED') throw new Error('File processing failed on Gemini.');
    }
    throw new Error('Timeout waiting for file processing on Gemini.');
  }
}
