import { ITopicRepository } from '../../domain/repositories/topic-repository.interface';
import { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { ICardRepository } from '../../domain/repositories/card-repository.interface';
import { GeminiService, GeneratedCard } from '../../infrastructure/ai/gemini.service';

export interface GenerateFlashcardsInput {
  topicId: string;
  userId: string;
  theme?: string;
  count?: number;
  // text-mode
  text?: string;
  // file-mode
  fileBuffer?: Buffer;
  mimeType?: string;
}

export class GenerateFlashcardsUseCase {
  constructor(
    private topicRepository: ITopicRepository,
    private subjectRepository: ISubjectRepository,
    private geminiService: GeminiService,
    private cardRepository?: ICardRepository,
  ) {}

  async execute(input: GenerateFlashcardsInput): Promise<GeneratedCard[]> {
    if (!input.text?.trim() && !input.fileBuffer) {
      throw new Error('Forneça um texto ou um arquivo para gerar flashcards.');
    }

    const topic = await this.topicRepository.findById(input.topicId);
    if (!topic) throw new Error('Topic not found');

    const subject = await this.subjectRepository.findById(topic.subjectId);
    if (!subject || subject.userId !== input.userId) {
      throw new Error('Unauthorized access to topic');
    }

    const existingCards = this.cardRepository
      ? await this.cardRepository.findByTopicId(input.topicId)
      : [];

    const generated = await this.geminiService.generateFlashcards({
      text: input.text,
      fileBuffer: input.fileBuffer,
      mimeType: input.mimeType,
      theme: input.theme,
      count: input.count,
      existingCards: existingCards.map(c => ({ front: c.front })),
    });

    if (!generated.length) {
      throw new Error('A IA não conseguiu extrair flashcards do conteúdo fornecido.');
    }

    return generated;
  }
}
