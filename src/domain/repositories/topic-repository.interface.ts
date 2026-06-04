import { Topic } from '../entities/topic';

export interface ITopicRepository {
  findById(id: string): Promise<Topic | null>;
  findBySubjectId(subjectId: string): Promise<Topic[]>;
  create(topic: Partial<Topic>): Promise<Topic>;
  update(id: string, topic: Partial<Topic>): Promise<Topic>;
  delete(id: string): Promise<void>;
}
