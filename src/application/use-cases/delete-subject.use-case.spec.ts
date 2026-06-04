import { DeleteSubjectUseCase } from './delete-subject.use-case';
import type { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { Subject } from '../../domain/entities/subject';

describe('DeleteSubjectUseCase', () => {
  let useCase: DeleteSubjectUseCase;
  let repository: jest.Mocked<ISubjectRepository>;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      delete: jest.fn(),
    } as any;
    useCase = new DeleteSubjectUseCase(repository);
  });

  it('should delete a subject successfully', async () => {
    const mockSubject = new Subject(
      'id-1',
      'Constitucional',
      '#ff0000',
      'user-1',
    );
    repository.findById.mockResolvedValue(mockSubject);
    repository.delete.mockResolvedValue(undefined);

    await useCase.execute('id-1', 'user-1');

    expect(repository.findById).toHaveBeenCalledWith('id-1');
    expect(repository.delete).toHaveBeenCalledWith('id-1');
  });

  it('should throw an error if subject does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('id-1', 'user-1')).rejects.toThrow(
      'Subject not found',
    );
  });

  it('should throw an error if user does not own subject', async () => {
    const mockSubject = new Subject(
      'id-1',
      'Constitucional',
      '#ff0000',
      'user-2',
    );
    repository.findById.mockResolvedValue(mockSubject);

    await expect(useCase.execute('id-1', 'user-1')).rejects.toThrow(
      'Unauthorized access to subject',
    );
  });
});
