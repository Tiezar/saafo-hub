import { IWeeklyRoutineRepository } from '../../domain/repositories/weekly-routine-repository.interface';
import { ResourceNotFoundException } from '../../domain/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../domain/exceptions/unauthorized-access.exception';

export class DeleteWeeklyRoutineUseCase {
  constructor(private weeklyRoutineRepository: IWeeklyRoutineRepository) {}

  async execute(id: string, userId: string): Promise<void> {
    const routine = await this.weeklyRoutineRepository.findById(id);
    if (!routine) {
      throw new ResourceNotFoundException('Weekly routine not found');
    }
    if (routine.userId !== userId) {
      throw new UnauthorizedAccessException(
        'Unauthorized access to weekly routine',
      );
    }
    await this.weeklyRoutineRepository.delete(id);
  }
}
