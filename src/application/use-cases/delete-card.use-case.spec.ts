import { DeleteCardUseCase } from './delete-card.use-case';
import type { ICardRepository } from '../../domain/repositories/card-repository.interface';
import { Card } from '../../domain/entities/card';

describe('DeleteCardUseCase', () => {
  let useCase: DeleteCardUseCase;
  let repository: jest.Mocked<ICardRepository>;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      delete: jest.fn(),
    } as any;
    useCase = new DeleteCardUseCase(repository);
  });

  it('should delete a card successfully', async () => {
    const mockCard = new Card(
      'card-1',
      'Artigo 5',
      'Direitos',
      'topic-1',
      'user-1',
      0,
      0,
      2.5,
      new Date(),
    );
    repository.findById.mockResolvedValue(mockCard);
    repository.delete.mockResolvedValue(undefined);

    await useCase.execute('card-1', 'user-1');

    expect(repository.delete).toHaveBeenCalledWith('card-1');
  });

  it('should throw an error if card does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('card-1', 'user-1')).rejects.toThrow(
      'Card not found',
    );
  });

  it('should throw an error if user does not own card', async () => {
    const mockCard = new Card(
      'card-1',
      'Artigo 5',
      'Direitos',
      'topic-1',
      'user-2',
      0,
      0,
      2.5,
      new Date(),
    );
    repository.findById.mockResolvedValue(mockCard);

    await expect(useCase.execute('card-1', 'user-1')).rejects.toThrow(
      'Unauthorized access to card',
    );
  });
});
