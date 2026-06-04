import { GenerateFlashcardsUseCase } from './generate-flashcards.use-case';
import type { ICardRepository } from '../../domain/repositories/card-repository.interface';
import type { ITopicRepository } from '../../domain/repositories/topic-repository.interface';
import type { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { GeminiService } from '../../infrastructure/ai/gemini.service';
import { Card } from '../../domain/entities/card';
import { Topic } from '../../domain/entities/topic';
import { Subject } from '../../domain/entities/subject';

describe('GenerateFlashcardsUseCase', () => {
  let useCase: GenerateFlashcardsUseCase;
  let cardRepository: jest.Mocked<ICardRepository>;
  let topicRepository: jest.Mocked<ITopicRepository>;
  let subjectRepository: jest.Mocked<ISubjectRepository>;
  let geminiService: jest.Mocked<GeminiService>;

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
    geminiService = {
      generateFlashcards: jest.fn(),
    } as any;
    useCase = new GenerateFlashcardsUseCase(
      cardRepository,
      topicRepository,
      subjectRepository,
      geminiService,
    );
  });

  it('should generate flashcards successfully and save them', async () => {
    const mockSubject = new Subject(
      'sub-1',
      'Constitucional',
      '#ff0000',
      'user-1',
    );
    const mockTopic = new Topic('topic-1', 'Direitos Fundamentais', 'sub-1');
    const mockGeneratedCards = [
      { front: 'Artigo 5', back: 'Direitos fundamentais' },
      { front: 'Artigo 6', back: 'Direitos sociais' },
    ];
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

    subjectRepository.findById.mockResolvedValue(mockSubject);
    topicRepository.findById.mockResolvedValue(mockTopic);
    geminiService.generateFlashcards.mockResolvedValue(mockGeneratedCards);
    cardRepository.create.mockResolvedValue(mockCard);

    const result = await useCase.execute({
      text: 'Este é o texto de estudos sobre direitos fundamentais e sociais.',
      topicId: 'topic-1',
      userId: 'user-1',
    });

    expect(result).toHaveLength(2);
    expect(geminiService.generateFlashcards).toHaveBeenCalledWith(
      'Este é o texto de estudos sobre direitos fundamentais e sociais.',
    );
    expect(cardRepository.create).toHaveBeenCalledTimes(2);
  });

  it('should throw an error if study text is empty', async () => {
    await expect(
      useCase.execute({
        text: '   ',
        topicId: 'topic-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('Study text cannot be empty');
  });

  it('should throw an error if topic does not exist', async () => {
    topicRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        text: 'Texto de estudo',
        topicId: 'topic-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('Topic not found');
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

    await expect(
      useCase.execute({
        text: 'Texto de estudo',
        topicId: 'topic-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('Unauthorized access to topic');
  });
});
