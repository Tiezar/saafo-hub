import { ICardRepository } from '../../domain/repositories/card-repository.interface';
import { ITopicRepository } from '../../domain/repositories/topic-repository.interface';
import { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { Card } from '../../domain/entities/card';
import { ResourceNotFoundException } from '../../domain/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../domain/exceptions/unauthorized-access.exception';

export class ListCardsUseCase {
  constructor(
    private cardRepository: ICardRepository,
    private topicRepository: ITopicRepository,
    private subjectRepository: ISubjectRepository,
  ) {}

  async execute(topicId: string, userId: string): Promise<Card[]> {
    const topic = await this.topicRepository.findById(topicId);
    if (!topic) {
      throw new ResourceNotFoundException('Topic not found');
    }

    const subject = await this.subjectRepository.findById(topic.subjectId);
    if (!subject || subject.userId !== userId) {
      throw new UnauthorizedAccessException('Unauthorized access to topic');
    }

    return this.cardRepository.findByTopicId(topicId);
  }
}
