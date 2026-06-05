import { ICardRepository } from '../../domain/repositories/card-repository.interface';
import { ITopicRepository } from '../../domain/repositories/topic-repository.interface';
import { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { GeminiService } from '../../infrastructure/ai/gemini.service';
import { Card } from '../../domain/entities/card';

export interface GenerateFlashcardsInput {
  topicId: string;
  userId: string;
  theme?: string;
  // text-mode
  text?: string;
  // file-mode
  fileBuffer?: Buffer;
  mimeType?: string;
}

export class GenerateFlashcardsUseCase {
  constructor(
    private cardRepository: ICardRepository,
    private topicRepository: ITopicRepository,
    private subjectRepository: ISubjectRepository,
    private geminiService: GeminiService,
  ) {}

  async execute(input: GenerateFlashcardsInput): Promise<Card[]> {
    if (!input.text?.trim() && !input.fileBuffer) {
      throw new Error('Forneça um texto ou um arquivo para gerar flashcards.');
    }

    const topic = await this.topicRepository.findById(input.topicId);
    if (!topic) throw new Error('Topic not found');

    const subject = await this.subjectRepository.findById(topic.subjectId);
    if (!subject || subject.userId !== input.userId) {
      throw new Error('Unauthorized access to topic');
    }

    const generated = await this.geminiService.generateFlashcards({
      text: input.text,
      fileBuffer: input.fileBuffer,
      mimeType: input.mimeType,
      theme: input.theme,
    });

    if (!generated.length) {
      throw new Error('A IA não conseguiu extrair flashcards do conteúdo fornecido.');
    }

    const created: Card[] = [];
    for (const card of generated) {
      created.push(
        await this.cardRepository.create({
          front: card.front,
          back: card.back,
          topicId: input.topicId,
          userId: input.userId,
          repetitions: 0,
          interval: 0,
          easeFactor: 2.5,
          nextReview: new Date(),
        }),
      );
    }
    return created;
  }
}
