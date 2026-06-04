import { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';

export class DeleteSubjectUseCase {
  constructor(private subjectRepository: ISubjectRepository) {}

  async execute(id: string, userId: string): Promise<void> {
    const subject = await this.subjectRepository.findById(id);
    if (!subject) {
      throw new Error('Subject not found');
    }
    if (subject.userId !== userId) {
      throw new Error('Unauthorized access to subject');
    }
    await this.subjectRepository.delete(id);
  }
}
