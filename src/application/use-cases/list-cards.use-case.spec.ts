import { ListCardsUseCase } from './list-cards.use-case';
import type { ICardRepository } from '../../domain/repositories/card-repository.interface';
import type { ITopicRepository } from '../../domain/repositories/topic-repository.interface';
import type { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { Card } from '../../domain/entities/card';
import { Topic } from '../../domain/entities/topic';
import { Subject } from '../../domain/entities/subject';

describe('ListCardsUseCase', () => {
  let useCase: ListCardsUseCase;
  let cardRepository: jest.Mocked<ICardRepository>;
  let topicRepository: jest.Mocked<ITopicRepository>;
  let subjectRepository: jest.Mocked<ISubjectRepository>;

  beforeEach(() => {
    cardRepository = {
      findByTopicId: jest.fn(),
    } as any;
    topicRepository = {
      findById: jest.fn(),
    } as any;
    subjectRepository = {
      findById: jest.fn(),
    } as any;
    useCase = new ListCardsUseCase(
      cardRepository,
      topicRepository,
      subjectRepository,
    );
  });

  it('should list cards if topic belongs to user', async () => {
    const mockSubject = new Subject(
      'sub-1',
      'Constitucional',
      '#ff0000',
      'user-1',
    );
    const mockTopic = new Topic('topic-1', 'Direitos Fundamentais', 'sub-1');
    const mockCards = [
      new Card(
        'card-1',
        'Artigo 5',
        'Direitos',
        'topic-1',
        'user-1',
        0,
        0,
        2.5,
        new Date(),
      ),
    ];

    subjectRepository.findById.mockResolvedValue(mockSubject);
    topicRepository.findById.mockResolvedValue(mockTopic);
    cardRepository.findByTopicId.mockResolvedValue(mockCards);

    const result = await useCase.execute('topic-1', 'user-1');

    expect(result).toBe(mockCards);
    expect(cardRepository.findByTopicId).toHaveBeenCalledWith('topic-1');
  });

  it('should throw an error if topic does not exist', async () => {
    topicRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('topic-1', 'user-1')).rejects.toThrow(
      'Topic not found',
    );
  });

  it('should throw an error if topic belongs to someone else', async () => {
    const mockSubject = new Subject(
      'sub-1',
      'Constitucional',
      '#ff0000',
      'user-2',
    );
    const mockTopic = new Topic('topic-1', 'Direitos Fundamentais', 'sub-1');
    topicRepository.findById.mockResolvedValue(mockTopic);
    subjectRepository.findById.mockResolvedValue(mockSubject);

    await expect(useCase.execute('topic-1', 'user-1')).rejects.toThrow(
      'Unauthorized access to topic',
    );
  });
});
