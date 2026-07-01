import { UpdateCardUseCase } from './update-card.use-case';
import type { ICardRepository } from '../../domain/repositories/card-repository.interface';
import { Card } from '../../domain/entities/card';

describe('UpdateCardUseCase', () => {
  let useCase: UpdateCardUseCase;
  let cardRepository: jest.Mocked<ICardRepository>;

  beforeEach(() => {
    cardRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    } as any;
    useCase = new UpdateCardUseCase(cardRepository);
  });

  it('should update card successfully if owner', async () => {
    const mockCard = new Card(
      '1',
      'front',
      'back',
      'topic-1',
      'user-1',
      0,
      0,
      2.5,
      new Date(),
    );
    cardRepository.findById.mockResolvedValue(mockCard);
    cardRepository.update.mockResolvedValue(mockCard);

    const result = await useCase.execute('1', {
      userId: 'user-1',
      front: 'new front',
    });

    expect(result).toBe(mockCard);
    expect(cardRepository.update).toHaveBeenCalledWith('1', {
      front: 'new front',
    });
  });

  it('should throw error if not owner', async () => {
    const mockCard = new Card(
      '1',
      'front',
      'back',
      'topic-1',
      'user-1',
      0,
      0,
      2.5,
      new Date(),
    );
    cardRepository.findById.mockResolvedValue(mockCard);

    await expect(
      useCase.execute('1', {
        userId: 'user-2',
        front: 'new front',
      }),
    ).rejects.toThrow('Unauthorized access to card');
  });
});
