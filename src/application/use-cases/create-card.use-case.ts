import { ICardRepository } from '../../domain/repositories/card-repository.interface';
import { ITopicRepository } from '../../domain/repositories/topic-repository.interface';
import { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { Card } from '../../domain/entities/card';

export interface CreateCardInput {
  front: string;
  back: string;
  topicId: string;
  userId: string;
}

export class CreateCardUseCase {
  constructor(
    private cardRepository: ICardRepository,
    private topicRepository: ITopicRepository,
    private subjectRepository: ISubjectRepository,
  ) {}

  async execute(input: CreateCardInput): Promise<Card> {
    if (!input.front.trim() || !input.back.trim()) {
      throw new Error('Card front and back content cannot be empty');
    }

    const topic = await this.topicRepository.findById(input.topicId);
    if (!topic) {
      throw new Error('Topic not found');
    }

    const subject = await this.subjectRepository.findById(topic.subjectId);
    if (!subject || subject.userId !== input.userId) {
      throw new Error('Unauthorized access to topic');
    }

    return this.cardRepository.create({
      front: input.front,
      back: input.back,
      topicId: input.topicId,
      userId: input.userId,
      repetitions: 0,
      interval: 0,
      easeFactor: 2.5,
      nextReview: new Date(),
    });
  }
}
