import { IStudySessionRepository } from '../../domain/repositories/study-session-repository.interface';
import { StudySession } from '../../domain/entities/study-session';

export class StartStudySessionUseCase {
  constructor(private studySessionRepository: IStudySessionRepository) {}

  async execute(userId: string): Promise<StudySession> {
    return this.studySessionRepository.create({
      userId,
      startedAt: new Date(),
      endedAt: null,
    });
  }
}
