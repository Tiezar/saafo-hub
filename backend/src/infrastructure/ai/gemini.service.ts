import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

export interface GeneratedCard {
  front: string;
  back: string;
}

export interface QuizQuestion {
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
          text: `Você é um tutor de estudos que gera insights concisos e acionáveis.
Regras obrigatórias:
- Gere entre 4 e 6 insights baseados nos dados fornecidos
- title: máximo 5 palavras, imperativo direto (ex: "Revise Direito Civil hoje")
- message: máximo 15 palavras, 1 frase, foco na ação (ex: "23 cards atrasados — revise 10 por dia para recuperar.")
- Sem introduções, sem rodeios, sem repetir o título
- Português brasileiro, tom direto
- Priorize insights urgentes como "high"
- Types: streak, weak_subject, exam_alert, overdue_cards, productivity_pattern, focus_concentration
- Não mencione exames se não houver dados de exames`,
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
                  title:    { type: 'STRING' },
                  message:  { type: 'STRING' },
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
      return parsed.insights as Insight[];
    } catch (err) {
      this.logger.error(`Gemini insights failed: ${(err as Error).message}`);
      throw new InternalServerErrorException(`Falha ao gerar insights: ${(err as Error).message}`);
    }
  }

  // ── Quiz generation ───────────────────────────────────────────────────────

  async generateQuiz(
    cards: { front: string; back: string }[],
    difficulty: 'easy' | 'medium' | 'hard',
    count: number,
  ): Promise<QuizQuestion[]> {
    if (!this.apiKey) throw new InternalServerErrorException('GEMINI_API_KEY não configurado.');

    const difficultyLabel = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' }[difficulty];
    const context = cards.map(c => `Frente: ${c.front}\nVerso: ${c.back}`).join('\n\n');

    const payload = {
      contents: [{
        parts: [{
          text: `Com base nos seguintes flashcards de estudo, crie exatamente ${count} questões de múltipla escolha com dificuldade "${difficultyLabel}". Use os conceitos dos flashcards como base de conhecimento.\n\n${context}`,
        }],
      }],
      systemInstruction: {
        parts: [{
          text: `Você é um professor especialista criando questões de múltipla escolha de alta qualidade para provas em português brasileiro.
Cada questão deve ter exatamente 4 opções (A, B, C, D) onde apenas uma está correta.
Dificuldades:
- Fácil: reconhecimento direto de definições e conceitos
- Médio: aplicação, compreensão e relações entre conceitos
- Difícil: análise crítica, síntese, casos clínicos/práticos, pegadinhas sutis
As opções incorretas devem ser plausíveis e bem elaboradas (não óbvias).
A explicação deve justificar a resposta correta e por que as outras estão erradas.`,
        }],
      },
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
      this.logger.error(`Gemini quiz generation failed: ${(err as Error).message}`);
      throw new InternalServerErrorException(`Falha ao gerar quiz: ${(err as Error).message}`);
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
