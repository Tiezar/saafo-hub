import { StudySpace } from '../entities/study-space';

export interface IStudySpaceRepository {
  findByUserId(userId: string): Promise<StudySpace[]>;
  findById(id: string): Promise<StudySpace | null>;
  create(space: Partial<StudySpace>): Promise<StudySpace>;
  delete(id: string): Promise<void>;
}
