import { ITopicRepository } from '../../domain/repositories/topic-repository.interface';
import { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';

export class DeleteTopicUseCase {
  constructor(
    private topicRepository: ITopicRepository,
    private subjectRepository: ISubjectRepository,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const topic = await this.topicRepository.findById(id);
    if (!topic) {
      throw new Error('Topic not found');
    }

    const subject = await this.subjectRepository.findById(topic.subjectId);
    if (!subject || subject.userId !== userId) {
      throw new Error('Unauthorized access to topic');
    }

    await this.topicRepository.delete(id);
  }
}
