import { CreateCardUseCase } from './create-card.use-case';
import type { ICardRepository } from '../../domain/repositories/card-repository.interface';
import type { ITopicRepository } from '../../domain/repositories/topic-repository.interface';
import type { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { Card } from '../../domain/entities/card';
import { Topic } from '../../domain/entities/topic';
import { Subject } from '../../domain/entities/subject';

describe('CreateCardUseCase', () => {
  let useCase: CreateCardUseCase;
  let cardRepository: jest.Mocked<ICardRepository>;
  let topicRepository: jest.Mocked<ITopicRepository>;
  let subjectRepository: jest.Mocked<ISubjectRepository>;

  beforeEach(() => {
    cardRepository = {
      create: jest.fn(),
    } as any;
    topicRepository = {
      findById: jest.fn(),
    } as any;
    subjectRepository = {
      findById: jest.fn(),
    } as any;
    useCase = new CreateCardUseCase(
      cardRepository,
      topicRepository,
      subjectRepository,
    );
  });

  it('should create a card successfully', async () => {
    const mockSubject = new Subject(
      'sub-1',
      'Constitucional',
      '#ff0000',
      'user-1',
    );
    const mockTopic = new Topic('topic-1', 'Direitos Fundamentais', 'sub-1');
    const mockCard = new Card(
      'card-1',
      'Artigo 5',
      'Direitos individuais',
      'topic-1',
      'user-1',
      0,
      0,
      2.5,
      new Date(),
    );

    subjectRepository.findById.mockResolvedValue(mockSubject);
    topicRepository.findById.mockResolvedValue(mockTopic);
    cardRepository.create.mockResolvedValue(mockCard);

    const result = await useCase.execute({
      front: 'Artigo 5',
      back: 'Direitos individuais',
      topicId: 'topic-1',
      userId: 'user-1',
    });

    expect(result).toBe(mockCard);
    expect(cardRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        front: 'Artigo 5',
        back: 'Direitos individuais',
        topicId: 'topic-1',
        userId: 'user-1',
        repetitions: 0,
        interval: 0,
        easeFactor: 2.5,
      }),
    );
  });

  it('should throw an error if front or back is empty', async () => {
    await expect(
      useCase.execute({
        front: '   ',
        back: 'Direitos individuais',
        topicId: 'topic-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('Card front and back content cannot be empty');
  });

  it('should throw an error if topic does not exist', async () => {
    topicRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        front: 'Artigo 5',
        back: 'Direitos individuais',
        topicId: 'topic-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('Topic not found');
  });

  it('should throw an error if subject belongs to someone else', async () => {
    const mockSubject = new Subject(
      'sub-1',
      'Constitucional',
      '#ff0000',
      'user-2',
    );
    const mockTopic = new Topic('topic-1', 'Direitos Fundamentais', 'sub-1');
    topicRepository.findById.mockResolvedValue(mockTopic);
    subjectRepository.findById.mockResolvedValue(mockSubject);

    await expect(
      useCase.execute({
        front: 'Artigo 5',
        back: 'Direitos individuais',
        topicId: 'topic-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('Unauthorized access to topic');
  });
});
