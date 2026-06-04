import { ITopicRepository } from '../../domain/repositories/topic-repository.interface';
import { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { Topic } from '../../domain/entities/topic';

export class ListTopicsUseCase {
  constructor(
    private topicRepository: ITopicRepository,
    private subjectRepository: ISubjectRepository,
  ) {}

  async execute(subjectId: string, userId: string): Promise<Topic[]> {
    const subject = await this.subjectRepository.findById(subjectId);
    if (!subject) {
      throw new Error('Subject not found');
    }
    if (subject.userId !== userId) {
      throw new Error('Unauthorized access to subject');
    }

    return this.topicRepository.findBySubjectId(subjectId);
  }
}
