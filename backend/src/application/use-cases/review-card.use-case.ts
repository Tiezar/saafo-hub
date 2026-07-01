import { ICardRepository } from '../../domain/repositories/card-repository.interface';
import { IStudySessionRepository } from '../../domain/repositories/study-session-repository.interface';
import { SpacedRepetitionService } from '../../domain/services/spaced-repetition.service';
import { Card } from '../../domain/entities/card';
import { ResourceNotFoundException } from '../../domain/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../domain/exceptions/unauthorized-access.exception';
import { BusinessRuleException } from '../../domain/exceptions/business-rule.exception';

export interface ReviewCardInput {
  cardId: string;
  sessionId: string;
  rating: number; // 0 a 5
  userId: string;
}

export class ReviewCardUseCase {
  constructor(
    private cardRepository: ICardRepository,
    private studySessionRepository: IStudySessionRepository,
  ) {}

  async execute(input: ReviewCardInput): Promise<Card> {
    const card = await this.cardRepository.findById(input.cardId);
    if (!card) {
      throw new ResourceNotFoundException('Card not found');
    }
    if (card.userId !== input.userId) {
      throw new UnauthorizedAccessException('Unauthorized access to card');
    }

    const session = await this.studySessionRepository.findById(input.sessionId);
    if (!session) {
      throw new ResourceNotFoundException('Study session not found');
    }
    if (session.userId !== input.userId) {
      throw new UnauthorizedAccessException(
        'Unauthorized access to study session',
      );
    }
    if (session.endedAt !== null) {
      throw new BusinessRuleException('Study session is already closed');
    }

    const calculation = SpacedRepetitionService.calculate(
      input.rating,
      card.repetitions,
      card.interval,
      card.easeFactor,
    );

    const updatedCard = await this.cardRepository.update(input.cardId, {
      repetitions: calculation.repetitions,
      interval: calculation.interval,
      easeFactor: calculation.easeFactor,
      nextReview: calculation.nextReview,
    });

    await this.studySessionRepository.createReview({
      cardId: input.cardId,
      sessionId: input.sessionId,
      rating: input.rating,
      reviewedAt: new Date(),
    });

    return updatedCard;
  }
}
