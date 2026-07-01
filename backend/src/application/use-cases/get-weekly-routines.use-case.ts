import { IWeeklyRoutineRepository } from '../../domain/repositories/weekly-routine-repository.interface';
import { WeeklyRoutine } from '../../domain/entities/weekly-routine';

export class GetWeeklyRoutinesUseCase {
  constructor(private weeklyRoutineRepository: IWeeklyRoutineRepository) {}

  async execute(userId: string): Promise<WeeklyRoutine[]> {
    return this.weeklyRoutineRepository.findByUserId(userId);
  }
}
