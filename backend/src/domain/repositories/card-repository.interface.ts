import { Card } from '../entities/card';

export interface ICardRepository {
  findById(id: string): Promise<Card | null>;
  findByTopicId(topicId: string): Promise<Card[]>;
  findDueCards(userId: string, date: Date): Promise<Card[]>;
  create(card: Partial<Card>): Promise<Card>;
  update(id: string, card: Partial<Card>): Promise<Card>;
  delete(id: string): Promise<void>;
}
