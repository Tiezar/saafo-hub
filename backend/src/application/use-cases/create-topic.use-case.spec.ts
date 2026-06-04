import { CreateTopicUseCase } from './create-topic.use-case';
import type { ITopicRepository } from '../../domain/repositories/topic-repository.interface';
import type { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { Topic } from '../../domain/entities/topic';
import { Subject } from '../../domain/entities/subject';

describe('CreateTopicUseCase', () => {
  let useCase: CreateTopicUseCase;
  let topicRepository: jest.Mocked<ITopicRepository>;
  let subjectRepository: jest.Mocked<ISubjectRepository>;

  beforeEach(() => {
    topicRepository = {
      create: jest.fn(),
    } as any;
    subjectRepository = {
      findById: jest.fn(),
    } as any;
    useCase = new CreateTopicUseCase(topicRepository, subjectRepository);
  });

  it('should create a topic successfully', async () => {
    const mockSubject = new Subject(
      'sub-1',
      'Constitucional',
      '#ff0000',
      'user-1',
    );
    const mockTopic = new Topic('topic-1', 'Direitos Fundamentais', 'sub-1');
    subjectRepository.findById.mockResolvedValue(mockSubject);
    topicRepository.create.mockResolvedValue(mockTopic);

    const result = await useCase.execute({
      name: 'Direitos Fundamentais',
      subjectId: 'sub-1',
      userId: 'user-1',
    });

    expect(result).toBe(mockTopic);
    expect(subjectRepository.findById).toHaveBeenCalledWith('sub-1');
    expect(topicRepository.create).toHaveBeenCalledWith({
      name: 'Direitos Fundamentais',
      subjectId: 'sub-1',
    });
  });

  it('should throw an error if topic name is empty', async () => {
    await expect(
      useCase.execute({
        name: '   ',
        subjectId: 'sub-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('Topic name cannot be empty');
  });

  it('should throw an error if subject does not exist', async () => {
    subjectRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        name: 'Direitos Fundamentais',
        subjectId: 'sub-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('Subject not found');
  });

  it('should throw an error if subject belongs to someone else', async () => {
    const mockSubject = new Subject(
      'sub-1',
      'Constitucional',
      '#ff0000',
      'user-2',
    );
    subjectRepository.findById.mockResolvedValue(mockSubject);

    await expect(
      useCase.execute({
        name: 'Direitos Fundamentais',
        subjectId: 'sub-1',
        userId: 'user-1',
      }),
    ).rejects.toThrow('Unauthorized access to subject');
  });
});
