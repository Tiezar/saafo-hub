import { ICardRepository } from '../../domain/repositories/card-repository.interface';
import { Card } from '../../domain/entities/card';

export class ListAllCardsUseCase {
  constructor(private cardRepository: ICardRepository) {}

  async execute(userId: string): Promise<Card[]> {
    return this.cardRepository.findByUserId(userId);
  }
}
