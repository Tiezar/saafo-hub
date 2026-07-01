import { GetWeeklyRoutinesUseCase } from './get-weekly-routines.use-case';
import { CreateWeeklyRoutineUseCase } from './create-weekly-routine.use-case';
import { UpdateWeeklyRoutineUseCase } from './update-weekly-routine.use-case';
import { DeleteWeeklyRoutineUseCase } from './delete-weekly-routine.use-case';
import type { IWeeklyRoutineRepository } from '../../domain/repositories/weekly-routine-repository.interface';
import { WeeklyRoutine } from '../../domain/entities/weekly-routine';

describe('Weekly Routine Use Cases', () => {
  let repository: jest.Mocked<IWeeklyRoutineRepository>;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  });

  describe('GetWeeklyRoutinesUseCase', () => {
    it('should return routines for a user', async () => {
      const useCase = new GetWeeklyRoutinesUseCase(repository);
      const mockRoutine = new WeeklyRoutine(
        '1',
        'user-1',
        'Study',
        '#fff',
        [1],
        [],
      );
      repository.findByUserId.mockResolvedValue([mockRoutine]);

      const result = await useCase.execute('user-1');

      expect(result).toEqual([mockRoutine]);
      expect(repository.findByUserId).toHaveBeenCalledWith('user-1');
    });
  });

  describe('CreateWeeklyRoutineUseCase', () => {
    it('should create a routine successfully', async () => {
      const useCase = new CreateWeeklyRoutineUseCase(repository);
      const mockRoutine = new WeeklyRoutine(
        '1',
        'user-1',
        'Study',
        '#fff',
        [1],
        [],
      );
      repository.create.mockResolvedValue(mockRoutine);

      const result = await useCase.execute({
        userId: 'user-1',
        label: 'Study',
        color: '#fff',
        days: [1],
        slots: [],
      });

      expect(result).toBe(mockRoutine);
      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        label: 'Study',
        color: '#fff',
        days: [1],
        slots: [],
      });
    });

    it('should throw error if label is empty', async () => {
      const useCase = new CreateWeeklyRoutineUseCase(repository);
      await expect(
        useCase.execute({
          userId: 'user-1',
          label: '  ',
          color: '#fff',
          days: [1],
          slots: [],
        }),
      ).rejects.toThrow('Label cannot be empty');
    });
  });

  describe('UpdateWeeklyRoutineUseCase', () => {
    it('should update routine successfully if owner', async () => {
      const useCase = new UpdateWeeklyRoutineUseCase(repository);
      const mockRoutine = new WeeklyRoutine(
        '1',
        'user-1',
        'Study',
        '#fff',
        [1],
        [],
      );
      repository.findById.mockResolvedValue(mockRoutine);
      repository.update.mockResolvedValue(mockRoutine);

      const result = await useCase.execute('1', {
        userId: 'user-1',
        label: 'Updated',
      });

      expect(result).toBe(mockRoutine);
      expect(repository.update).toHaveBeenCalledWith('1', {
        label: 'Updated',
      });
    });

    it('should throw error if routine not found', async () => {
      const useCase = new UpdateWeeklyRoutineUseCase(repository);
      repository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('1', { userId: 'user-1', label: 'Updated' }),
      ).rejects.toThrow('Weekly routine not found');
    });

    it('should throw error if not owner', async () => {
      const useCase = new UpdateWeeklyRoutineUseCase(repository);
      const mockRoutine = new WeeklyRoutine(
        '1',
        'user-1',
        'Study',
        '#fff',
        [1],
        [],
      );
      repository.findById.mockResolvedValue(mockRoutine);

      await expect(
        useCase.execute('1', { userId: 'user-2', label: 'Updated' }),
      ).rejects.toThrow('Unauthorized access to weekly routine');
    });
  });

  describe('DeleteWeeklyRoutineUseCase', () => {
    it('should delete successfully if owner', async () => {
      const useCase = new DeleteWeeklyRoutineUseCase(repository);
      const mockRoutine = new WeeklyRoutine(
        '1',
        'user-1',
        'Study',
        '#fff',
        [1],
        [],
      );
      repository.findById.mockResolvedValue(mockRoutine);
      repository.delete.mockResolvedValue();

      await useCase.execute('1', 'user-1');

      expect(repository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw error if not owner', async () => {
      const useCase = new DeleteWeeklyRoutineUseCase(repository);
      const mockRoutine = new WeeklyRoutine(
        '1',
        'user-1',
        'Study',
        '#fff',
        [1],
        [],
      );
      repository.findById.mockResolvedValue(mockRoutine);

      await expect(useCase.execute('1', 'user-2')).rejects.toThrow(
        'Unauthorized access to weekly routine',
      );
    });
  });
});
