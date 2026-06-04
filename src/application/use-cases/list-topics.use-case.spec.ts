import { ListTopicsUseCase } from './list-topics.use-case';
import type { ITopicRepository } from '../../domain/repositories/topic-repository.interface';
import type { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { Topic } from '../../domain/entities/topic';
import { Subject } from '../../domain/entities/subject';

describe('ListTopicsUseCase', () => {
  let useCase: ListTopicsUseCase;
  let topicRepository: jest.Mocked<ITopicRepository>;
  let subjectRepository: jest.Mocked<ISubjectRepository>;

  beforeEach(() => {
    topicRepository = {
      findBySubjectId: jest.fn(),
    } as any;
    subjectRepository = {
      findById: jest.fn(),
    } as any;
    useCase = new ListTopicsUseCase(topicRepository, subjectRepository);
  });

  it('should list topics if subject belongs to user', async () => {
    const mockSubject = new Subject(
      'sub-1',
      'Constitucional',
      '#ff0000',
      'user-1',
    );
    const mockTopics = [new Topic('topic-1', 'Direitos Fundamentais', 'sub-1')];
    subjectRepository.findById.mockResolvedValue(mockSubject);
    topicRepository.findBySubjectId.mockResolvedValue(mockTopics);

    const result = await useCase.execute('sub-1', 'user-1');

    expect(result).toBe(mockTopics);
    expect(topicRepository.findBySubjectId).toHaveBeenCalledWith('sub-1');
  });

  it('should throw an error if subject does not exist', async () => {
    subjectRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('sub-1', 'user-1')).rejects.toThrow(
      'Subject not found',
    );
  });

  it('should throw an error if subject belongs to someone else', async () => {
    const mockSubject = new Subject(
      'sub-1',
      'Constitucional',
      '#ff0000',
      'user-2',
    );
    subjectRepository.findById.mockResolvedValue(mockSubject);

    await expect(useCase.execute('sub-1', 'user-1')).rejects.toThrow(
      'Unauthorized access to subject',
    );
  });
});
