import { ReviewCardUseCase } from './review-card.use-case';
import type { ICardRepository } from '../../domain/repositories/card-repository.interface';
import type { IStudySessionRepository } from '../../domain/repositories/study-session-repository.interface';
import { Card } from '../../domain/entities/card';
import { StudySession } from '../../domain/entities/study-session';

describe('ReviewCardUseCase', () => {
  let useCase: ReviewCardUseCase;
  let cardRepository: jest.Mocked<ICardRepository>;
  let studySessionRepository: jest.Mocked<IStudySessionRepository>;

  beforeEach(() => {
    cardRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    } as any;
    studySessionRepository = {
      findById: jest.fn(),
      createReview: jest.fn(),
    } as any;
    useCase = new ReviewCardUseCase(cardRepository, studySessionRepository);
  });

  it('should review a card successfully and run SM-2 calculation', async () => {
    const mockCard = new Card(
      'card-1',
      'Front',
      'Back',
      'topic-1',
      'user-1',
      0,
      0,
      2.5,
      new Date(),
    );
    const mockSession = new StudySession(
      'session-1',
      'user-1',
      new Date(),
      null,
    );
    const mockUpdatedCard = new Card(
      'card-1',
      'Front',
      'Back',
      'topic-1',
      'user-1',
      1,
      1,
      2.5,
      new Date(),
    );

    cardRepository.findById.mockResolvedValue(mockCard);
    studySessionRepository.findById.mockResolvedValue(mockSession);
    cardRepository.update.mockResolvedValue(mockUpdatedCard);
    studySessionRepository.createReview.mockResolvedValue({} as any);

    const result = await useCase.execute({
      cardId: 'card-1',
      sessionId: 'session-1',
      rating: 4,
      userId: 'user-1',
    });

    expect(result).toBe(mockUpdatedCard);
    expect(cardRepository.update).toHaveBeenCalledWith(
      'card-1',
      expect.objectContaining({
        repetitions: 1,
        interval: 1,
        easeFactor: 2.5,
      }),
    );
    expect(studySessionRepository.createReview).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: 'card-1',
        sessionId: 'session-1',
        rating: 4,
      }),
    );
  });

  it('should throw an error if card is not found', async () => {
    cardRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        cardId: 'card-1',
        sessionId: 'session-1',
        rating: 4,
        userId: 'user-1',
      }),
    ).rejects.toThrow('Card not found');
  });

  it('should throw an error if user does not own card', async () => {
    const mockCard = new Card(
      'card-1',
      'Front',
      'Back',
      'topic-1',
      'user-2',
      0,
      0,
      2.5,
      new Date(),
    );
    cardRepository.findById.mockResolvedValue(mockCard);

    await expect(
      useCase.execute({
        cardId: 'card-1',
        sessionId: 'session-1',
        rating: 4,
        userId: 'user-1',
      }),
    ).rejects.toThrow('Unauthorized access to card');
  });

  it('should throw an error if session is not found', async () => {
    const mockCard = new Card(
      'card-1',
      'Front',
      'Back',
      'topic-1',
      'user-1',
      0,
      0,
      2.5,
      new Date(),
    );
    cardRepository.findById.mockResolvedValue(mockCard);
    studySessionRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        cardId: 'card-1',
        sessionId: 'session-1',
        rating: 4,
        userId: 'user-1',
      }),
    ).rejects.toThrow('Study session not found');
  });

  it('should throw an error if session belongs to another user', async () => {
    const mockCard = new Card(
      'card-1',
      'Front',
      'Back',
      'topic-1',
      'user-1',
      0,
      0,
      2.5,
      new Date(),
    );
    const mockSession = new StudySession(
      'session-1',
      'user-2',
      new Date(),
      null,
    );

    cardRepository.findById.mockResolvedValue(mockCard);
    studySessionRepository.findById.mockResolvedValue(mockSession);

    await expect(
      useCase.execute({
        cardId: 'card-1',
        sessionId: 'session-1',
        rating: 4,
        userId: 'user-1',
      }),
    ).rejects.toThrow('Unauthorized access to study session');
  });
});
