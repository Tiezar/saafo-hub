import { CreateSubjectUseCase } from './create-subject.use-case';
import type { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { Subject } from '../../domain/entities/subject';

describe('CreateSubjectUseCase', () => {
  let useCase: CreateSubjectUseCase;
  let repository: jest.Mocked<ISubjectRepository>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new CreateSubjectUseCase(repository);
  });

  it('should create a subject successfully', async () => {
    const mockSubject = new Subject(
      'id-1',
      'Constitucional',
      '#ff0000',
      'user-1',
    );
    repository.create.mockResolvedValue(mockSubject);

    const result = await useCase.execute({
      name: 'Constitucional',
      color: '#ff0000',
      userId: 'user-1',
    });

    expect(result).toBe(mockSubject);
    expect(repository.create).toHaveBeenCalledWith({
      name: 'Constitucional',
      color: '#ff0000',
      userId: 'user-1',
    });
  });

  it('should throw an error if the subject name is empty', async () => {
    await expect(
      useCase.execute({
        name: '   ',
        color: '#ff0000',
        userId: 'user-1',
      }),
    ).rejects.toThrow('Subject name cannot be empty');
  });
});
