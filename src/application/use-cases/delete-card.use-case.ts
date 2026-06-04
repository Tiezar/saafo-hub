import { ICardRepository } from '../../domain/repositories/card-repository.interface';

export class DeleteCardUseCase {
  constructor(private cardRepository: ICardRepository) {}

  async execute(id: string, userId: string): Promise<void> {
    const card = await this.cardRepository.findById(id);
    if (!card) {
      throw new Error('Card not found');
    }

    if (card.userId !== userId) {
      throw new Error('Unauthorized access to card');
    }

    await this.cardRepository.delete(id);
  }
}
