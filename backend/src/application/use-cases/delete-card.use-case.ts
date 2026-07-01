import { ICardRepository } from '../../domain/repositories/card-repository.interface';
import { ResourceNotFoundException } from '../../domain/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../domain/exceptions/unauthorized-access.exception';

export class DeleteCardUseCase {
  constructor(private cardRepository: ICardRepository) {}

  async execute(id: string, userId: string): Promise<void> {
    const card = await this.cardRepository.findById(id);
    if (!card) {
      throw new ResourceNotFoundException('Card not found');
    }

    if (card.userId !== userId) {
      throw new UnauthorizedAccessException('Unauthorized access to card');
    }

    await this.cardRepository.delete(id);
  }
}
