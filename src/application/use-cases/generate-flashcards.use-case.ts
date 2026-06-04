import { ICardRepository } from '../../domain/repositories/card-repository.interface';
import { ITopicRepository } from '../../domain/repositories/topic-repository.interface';
import { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { GeminiService } from '../../infrastructure/ai/gemini.service';
import { Card } from '../../domain/entities/card';

export interface GenerateFlashcardsInput {
  text: string;
  topicId: string;
  userId: string;
}

export class GenerateFlashcardsUseCase {
  constructor(
    private cardRepository: ICardRepository,
    private topicRepository: ITopicRepository,
    private subjectRepository: ISubjectRepository,
    private geminiService: GeminiService,
  ) {}

  async execute(input: GenerateFlashcardsInput): Promise<Card[]> {
    if (!input.text.trim()) {
      throw new Error('Study text cannot be empty');
    }

    const topic = await this.topicRepository.findById(input.topicId);
    if (!topic) {
      throw new Error('Topic not found');
    }

    const subject = await this.subjectRepository.findById(topic.subjectId);
    if (!subject || subject.userId !== input.userId) {
      throw new Error('Unauthorized access to topic');
    }

    const generated = await this.geminiService.generateFlashcards(input.text);

    const createdCards: Card[] = [];

    for (const cardData of generated) {
      const card = await this.cardRepository.create({
        front: cardData.front,
        back: cardData.back,
        topicId: input.topicId,
        userId: input.userId,
        repetitions: 0,
        interval: 0,
        easeFactor: 2.5,
        nextReview: new Date(),
      });
      createdCards.push(card);
    }

    return createdCards;
  }
}
