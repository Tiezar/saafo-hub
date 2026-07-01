import { ListAllCardsUseCase } from './list-all-cards.use-case';
import type { ICardRepository } from '../../domain/repositories/card-repository.interface';
import { Card } from '../../domain/entities/card';

describe('ListAllCardsUseCase', () => {
  let useCase: ListAllCardsUseCase;
  let cardRepository: jest.Mocked<ICardRepository>;

  beforeEach(() => {
    cardRepository = {
      findByUserId: jest.fn(),
    } as any;
    useCase = new ListAllCardsUseCase(cardRepository);
  });

  it('should list all cards for user', async () => {
    const mockCards = [
      new Card(
        '1',
        'front1',
        'back1',
        'topic-1',
        'user-1',
        0,
        0,
        2.5,
        new Date(),
      ),
    ];
    cardRepository.findByUserId.mockResolvedValue(mockCards);

    const result = await useCase.execute('user-1');

    expect(result).toEqual(mockCards);
    expect(cardRepository.findByUserId).toHaveBeenCalledWith('user-1');
  });
});
