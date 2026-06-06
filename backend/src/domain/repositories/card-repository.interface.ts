import { Card } from '../entities/card';

export interface ICardRepository {
  findById(id: string): Promise<Card | null>;
  findByTopicId(topicId: string): Promise<Card[]>;
  findByUserId(userId: string): Promise<Card[]>;
  findDueCards(userId: string, date: Date): Promise<Card[]>;
  countGeneratedToday(userId: string): Promise<number>;
  create(card: Partial<Card>): Promise<Card>;
  update(id: string, card: Partial<Card>): Promise<Card>;
  delete(id: string): Promise<void>;
}
