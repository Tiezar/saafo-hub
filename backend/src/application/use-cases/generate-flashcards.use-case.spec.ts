import { GenerateFlashcardsUseCase } from './generate-flashcards.use-case';
import type { ITopicRepository } from '../../domain/repositories/topic-repository.interface';
import type { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { GeminiService } from '../../infrastructure/ai/gemini.service';
import { Topic } from '../../domain/entities/topic';
import { Subject } from '../../domain/entities/subject';

describe('GenerateFlashcardsUseCase', () => {
  let useCase: GenerateFlashcardsUseCase;
  let topicRepository: jest.Mocked<ITopicRepository>;
  let subjectRepository: jest.Mocked<ISubjectRepository>;
  let geminiService: jest.Mocked<GeminiService>;

  beforeEach(() => {
    topicRepository = { findById: jest.fn() } as any;
    subjectRepository = { findById: jest.fn() } as any;
    geminiService = { generateFlashcards: jest.fn() } as any;
    useCase = new GenerateFlashcardsUseCase(
      topicRepository,
      subjectRepository,
      geminiService,
    );
  });

  it('should generate flashcards and return them without saving', async () => {
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

    subjectRepository.findById.mockResolvedValue(mockSubject);
    topicRepository.findById.mockResolvedValue(mockTopic);
    geminiService.generateFlashcards.mockResolvedValue(mockGeneratedCards);

    const result = await useCase.execute({
      text: 'Este é o texto de estudos sobre direitos fundamentais e sociais.',
      topicId: 'topic-1',
      userId: 'user-1',
    });

    expect(result).toHaveLength(2);
    expect(result[0].front).toBe('Artigo 5');
  });

  it('should throw an error if both text and fileBuffer are absent', async () => {
    await expect(
      useCase.execute({ topicId: 'topic-1', userId: 'user-1' }),
    ).rejects.toThrow('Forneça um texto ou um arquivo para gerar flashcards.');
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
