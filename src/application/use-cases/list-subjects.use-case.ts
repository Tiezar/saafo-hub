import { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { Subject } from '../../domain/entities/subject';

export class ListSubjectsUseCase {
  constructor(private subjectRepository: ISubjectRepository) {}

  async execute(userId: string): Promise<Subject[]> {
    return this.subjectRepository.findByUserId(userId);
  }
}
