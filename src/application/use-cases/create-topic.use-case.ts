import { ITopicRepository } from '../../domain/repositories/topic-repository.interface';
import { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { Topic } from '../../domain/entities/topic';

export interface CreateTopicInput {
  name: string;
  subjectId: string;
  userId: string;
}

export class CreateTopicUseCase {
  constructor(
    private topicRepository: ITopicRepository,
    private subjectRepository: ISubjectRepository,
  ) {}

  async execute(input: CreateTopicInput): Promise<Topic> {
    if (!input.name.trim()) {
      throw new Error('Topic name cannot be empty');
    }

    const subject = await this.subjectRepository.findById(input.subjectId);
    if (!subject) {
      throw new Error('Subject not found');
    }
    if (subject.userId !== input.userId) {
      throw new Error('Unauthorized access to subject');
    }

    return this.topicRepository.create({
      name: input.name,
      subjectId: input.subjectId,
    });
  }
}
