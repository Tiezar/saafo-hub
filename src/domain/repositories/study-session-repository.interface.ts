import { StudySession } from '../entities/study-session';
import { CardReview } from '../entities/card-review';

export interface IStudySessionRepository {
  findById(id: string): Promise<StudySession | null>;
  findByUserId(userId: string): Promise<StudySession[]>;
  create(session: Partial<StudySession>): Promise<StudySession>;
  update(id: string, session: Partial<StudySession>): Promise<StudySession>;
  createReview(review: Partial<CardReview>): Promise<CardReview>;
}
