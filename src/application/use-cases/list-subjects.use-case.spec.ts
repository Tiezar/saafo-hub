import { ListSubjectsUseCase } from './list-subjects.use-case';
import type { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { Subject } from '../../domain/entities/subject';

describe('ListSubjectsUseCase', () => {
  let useCase: ListSubjectsUseCase;
  let repository: jest.Mocked<ISubjectRepository>;

  beforeEach(() => {
    repository = {
      findByUserId: jest.fn(),
    } as any;
    useCase = new ListSubjectsUseCase(repository);
  });

  it('should list subjects belonging to user', async () => {
    const mockSubjects = [
      new Subject('id-1', 'Constitucional', '#ff0000', 'user-1'),
      new Subject('id-2', 'Administrativo', '#00ff00', 'user-1'),
    ];
    repository.findByUserId.mockResolvedValue(mockSubjects);

    const result = await useCase.execute('user-1');

    expect(result).toBe(mockSubjects);
    expect(repository.findByUserId).toHaveBeenCalledWith('user-1');
  });
});
