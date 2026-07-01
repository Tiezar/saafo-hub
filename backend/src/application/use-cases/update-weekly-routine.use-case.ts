import { IWeeklyRoutineRepository } from '../../domain/repositories/weekly-routine-repository.interface';
import {
  WeeklyRoutine,
  RoutineSlot,
} from '../../domain/entities/weekly-routine';
import { ResourceNotFoundException } from '../../domain/exceptions/resource-not-found.exception';
import { UnauthorizedAccessException } from '../../domain/exceptions/unauthorized-access.exception';
import { BusinessRuleException } from '../../domain/exceptions/business-rule.exception';

export interface UpdateWeeklyRoutineInput {
  userId: string;
  label?: string;
  color?: string;
  days?: number[];
  slots?: RoutineSlot[];
}

export class UpdateWeeklyRoutineUseCase {
  constructor(private weeklyRoutineRepository: IWeeklyRoutineRepository) {}

  async execute(
    id: string,
    input: UpdateWeeklyRoutineInput,
  ): Promise<WeeklyRoutine> {
    const routine = await this.weeklyRoutineRepository.findById(id);
    if (!routine) {
      throw new ResourceNotFoundException('Weekly routine not found');
    }
    if (routine.userId !== input.userId) {
      throw new UnauthorizedAccessException(
        'Unauthorized access to weekly routine',
      );
    }

    const updateData: Partial<WeeklyRoutine> = {};
    if (input.label !== undefined) {
      if (!input.label.trim())
        throw new BusinessRuleException('Label cannot be empty');
      updateData.label = input.label;
    }
    if (input.color !== undefined) {
      updateData.color = input.color;
    }
    if (input.days !== undefined) {
      updateData.days = input.days;
    }
    if (input.slots !== undefined) {
      updateData.slots = input.slots;
    }

    return this.weeklyRoutineRepository.update(id, updateData);
  }
}
