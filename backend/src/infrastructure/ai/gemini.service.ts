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

export interface GeminiGenerateOptions {
  text?: string;
  fileBuffer?: Buffer;
  mimeType?: string;
  theme?: string;
}

const INLINE_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB — use Files API above this

const SYSTEM_PROMPT = `Você é um especialista em educação ativa e memorização. \
Analise o conteúdo fornecido e extraia os conceitos mais importantes, \
transformando-os em flashcards concisos e objetivos. \
Cada flashcard deve ter: "front" (pergunta direta ou conceito lacunado) \
e "back" (resposta direta, objetiva e explicativa). \
Foque em conceitos-chave, definições, fórmulas e relações de causa-efeito. \
Retorne os dados estritamente em português brasileiro.`;

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
    const themeContext = options.theme?.trim()
      ? `\n\nFoque especificamente no tema: "${options.theme.trim()}". Gere flashcards apenas sobre este assunto.`
      : '';

    const userTextPart = {
      text: options.text
        ? `Analise o seguinte conteúdo de estudos e gere flashcards:${themeContext}\n\n${options.text}`
        : `Analise o conteúdo enviado e gere flashcards objetivos.${themeContext}`,
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
          text: `Você é um tutor de estudos especializado que analisa métricas e gera insights motivadores e acionáveis.
Regras:
- Gere entre 4 e 6 insights baseados nos dados fornecidos
- Use o nome do estudante naturalmente quando fizer sentido
- Cada insight deve ter uma sugestão concreta e prática
- Seja motivador mas honesto sobre pontos fracos
- Escreva em português brasileiro, tom amigável e direto
- Priorize insights mais urgentes como "high"
- Types disponíveis: streak, weak_subject, exam_alert, overdue_cards, productivity_pattern, focus_concentration
- Não gere insights sem dados suficientes (ex: não mencione exames se não houver)`,
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
