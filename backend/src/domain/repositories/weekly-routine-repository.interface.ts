import { WeeklyRoutine } from '../entities/weekly-routine';

export interface IWeeklyRoutineRepository {
  findById(id: string): Promise<WeeklyRoutine | null>;
  findByUserId(userId: string): Promise<WeeklyRoutine[]>;
  create(routine: Partial<WeeklyRoutine>): Promise<WeeklyRoutine>;
  update(id: string, routine: Partial<WeeklyRoutine>): Promise<WeeklyRoutine>;
  delete(id: string): Promise<void>;
}
