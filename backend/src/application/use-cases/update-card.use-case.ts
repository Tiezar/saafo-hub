import { ICardRepository } from '../../domain/repositories/card-repository.interface';
import { Card } from '../../domain/entities/card';
import { ResourceNotFoundException } from '../../domain/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../domain/exceptions/unauthorized-access.exception';
import { BusinessRuleException } from '../../domain/exceptions/business-rule.exception';

export interface UpdateCardInput {
  userId: string;
  front?: string;
  back?: string;
}

export class UpdateCardUseCase {
  constructor(private cardRepository: ICardRepository) {}

  async execute(id: string, input: UpdateCardInput): Promise<Card> {
    const card = await this.cardRepository.findById(id);
    if (!card) {
      throw new ResourceNotFoundException('Card not found');
    }
    if (card.userId !== input.userId) {
      throw new UnauthorizedAccessException('Unauthorized access to card');
    }

    const updateData: Partial<Card> = {};
    if (input.front !== undefined) {
      if (!input.front.trim())
        throw new BusinessRuleException('Card front content cannot be empty');
      updateData.front = input.front;
    }
    if (input.back !== undefined) {
      if (!input.back.trim())
        throw new BusinessRuleException('Card back content cannot be empty');
      updateData.back = input.back;
    }

    return this.cardRepository.update(id, updateData);
  }
}
