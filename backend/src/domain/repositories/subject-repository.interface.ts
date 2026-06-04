import { Subject } from '../entities/subject';

export interface ISubjectRepository {
  findById(id: string): Promise<Subject | null>;
  findByUserId(userId: string): Promise<Subject[]>;
  create(subject: Partial<Subject>): Promise<Subject>;
  update(id: string, subject: Partial<Subject>): Promise<Subject>;
  delete(id: string): Promise<void>;
}
