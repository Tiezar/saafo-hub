import { IWeeklyRoutineRepository } from '../../domain/repositories/weekly-routine-repository.interface';
import {
  WeeklyRoutine,
  RoutineSlot,
} from '../../domain/entities/weekly-routine';
import { BusinessRuleException } from '../../domain/exceptions/business-rule.exception';

export interface CreateWeeklyRoutineInput {
  userId: string;
  label: string;
  color: string;
  days: number[];
  slots: RoutineSlot[];
}

export class CreateWeeklyRoutineUseCase {
  constructor(private weeklyRoutineRepository: IWeeklyRoutineRepository) {}

  async execute(input: CreateWeeklyRoutineInput): Promise<WeeklyRoutine> {
    if (!input.label.trim()) {
      throw new BusinessRuleException('Label cannot be empty');
    }
    return this.weeklyRoutineRepository.create(input);
  }
}
