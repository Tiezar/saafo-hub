import { ITopicRepository } from '../../domain/repositories/topic-repository.interface';
import { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { ICardRepository } from '../../domain/repositories/card-repository.interface';
import {
  IAIService,
  GeneratedCard,
} from '../../domain/services/ai-service.interface';
import { ResourceNotFoundException } from '../../domain/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../domain/exceptions/unauthorized-access.exception';
import { BusinessRuleException } from '../../domain/exceptions/business-rule.exception';

export interface GenerateFlashcardsInput {
  topicId: string;
  userId: string;
  count?: number;
  theme?: string;
  text?: string;
  fileBuffer?: Buffer;
  mimeType?: string;
}

export class GenerateFlashcardsUseCase {
  constructor(
    private topicRepository: ITopicRepository,
    private subjectRepository: ISubjectRepository,
    private aiService: IAIService,
    private cardRepository?: ICardRepository,
  ) {}

  async execute(input: GenerateFlashcardsInput): Promise<GeneratedCard[]> {
    if (!input.text?.trim() && !input.fileBuffer) {
      throw new BusinessRuleException(
        'Forneça um texto ou um arquivo para gerar flashcards.',
      );
    }

    const topic = await this.topicRepository.findById(input.topicId);
    if (!topic) {
      throw new ResourceNotFoundException('Topic not found');
    }

    const subject = await this.subjectRepository.findById(topic.subjectId);
    if (!subject || subject.userId !== input.userId) {
      throw new UnauthorizedAccessException('Unauthorized access to topic');
    }

    const existingCards = this.cardRepository
      ? await this.cardRepository.findByTopicId(input.topicId)
      : [];

    const generated = await this.aiService.generateFlashcards({
      text: input.text,
      fileBuffer: input.fileBuffer,
      mimeType: input.mimeType,
      theme: input.theme,
      count: input.count,
      existingCards: existingCards.map((c) => ({ front: c.front })),
      subjectName: subject.name,
      topicName: topic.name,
    });

    if (!generated.length) {
      throw new BusinessRuleException(
        'A IA não conseguiu extrair flashcards do conteúdo fornecido.',
      );
    }

    return generated;
  }
}
