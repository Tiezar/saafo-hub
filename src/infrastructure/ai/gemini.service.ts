import { Injectable, InternalServerErrorException } from '@nestjs/common';

export interface GeneratedCard {
  front: string;
  back: string;
}

@Injectable()
export class GeminiService {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    // Gemini 2.5 Flash is recommended and standard
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;
  }

  async generateFlashcards(text: string): Promise<GeneratedCard[]> {
    if (!this.apiKey) {
      throw new InternalServerErrorException(
        'GEMINI_API_KEY environment variable is not configured',
      );
    }

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Analise o seguinte texto de estudos e gere flashcards:\n\n${text}`,
            },
          ],
        },
      ],
      systemInstruction: {
        parts: [
          {
            text: 'Você é um especialista em educação ativa e flashcards. Sua tarefa é analisar o texto de estudos fornecido pelo usuário e extrair os pontos conceituais mais importantes, transformando-os em uma lista de flashcards concisos contendo "front" (pergunta direta ou conceito lacunado) e "back" (resposta direta, objetiva e explicativa). Retorne os dados estritamente em português.',
          },
        ],
      },
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
                  back: { type: 'STRING' },
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
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Gemini API returned status ${response.status}: ${errorText}`,
        );
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('Empty response from Gemini API');
      }

      const parsed = JSON.parse(rawText);
      if (!parsed.cards || !Array.isArray(parsed.cards)) {
        throw new Error('Invalid JSON structure returned by Gemini');
      }

      return parsed.cards as GeneratedCard[];
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to generate flashcards: ${(error as Error).message}`,
      );
    }
  }
}
