import { DeleteTopicUseCase } from './delete-topic.use-case';
import type { ITopicRepository } from '../../domain/repositories/topic-repository.interface';
import type { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { Topic } from '../../domain/entities/topic';
import { Subject } from '../../domain/entities/subject';

describe('DeleteTopicUseCase', () => {
  let useCase: DeleteTopicUseCase;
  let topicRepository: jest.Mocked<ITopicRepository>;
  let subjectRepository: jest.Mocked<ISubjectRepository>;

  beforeEach(() => {
    topicRepository = {
      findById: jest.fn(),
      delete: jest.fn(),
    } as any;
    subjectRepository = {
      findById: jest.fn(),
    } as any;
    useCase = new DeleteTopicUseCase(topicRepository, subjectRepository);
  });

  it('should delete a topic successfully', async () => {
    const mockTopic = new Topic('topic-1', 'Direitos Fundamentais', 'sub-1');
    const mockSubject = new Subject(
      'sub-1',
      'Constitucional',
      '#ff0000',
      'user-1',
    );
    topicRepository.findById.mockResolvedValue(mockTopic);
    subjectRepository.findById.mockResolvedValue(mockSubject);
    topicRepository.delete.mockResolvedValue(undefined);

    await useCase.execute('topic-1', 'user-1');

    expect(topicRepository.delete).toHaveBeenCalledWith('topic-1');
  });

  it('should throw an error if topic does not exist', async () => {
    topicRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('topic-1', 'user-1')).rejects.toThrow(
      'Topic not found',
    );
  });

  it('should throw an error if subject not found or owned by someone else', async () => {
    const mockTopic = new Topic('topic-1', 'Direitos Fundamentais', 'sub-1');
    const mockSubject = new Subject(
      'sub-1',
      'Constitucional',
      '#ff0000',
      'user-2',
    );
    topicRepository.findById.mockResolvedValue(mockTopic);
    subjectRepository.findById.mockResolvedValue(mockSubject);

    await expect(useCase.execute('topic-1', 'user-1')).rejects.toThrow(
      'Unauthorized access to topic',
    );
  });
});
