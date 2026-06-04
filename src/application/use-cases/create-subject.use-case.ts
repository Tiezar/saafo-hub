import { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { Subject } from '../../domain/entities/subject';

export interface CreateSubjectInput {
  name: string;
  color: string | null;
  userId: string;
}

export class CreateSubjectUseCase {
  constructor(private subjectRepository: ISubjectRepository) {}

  async execute(input: CreateSubjectInput): Promise<Subject> {
    if (!input.name.trim()) {
      throw new Error('Subject name cannot be empty');
    }
    return this.subjectRepository.create({
      name: input.name,
      color: input.color,
      userId: input.userId,
    });
  }
}
