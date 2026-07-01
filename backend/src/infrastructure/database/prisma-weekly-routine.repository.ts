import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { IWeeklyRoutineRepository } from '../../domain/repositories/weekly-routine-repository.interface';
import { WeeklyRoutine } from '../../domain/entities/weekly-routine';

@Injectable()
export class PrismaWeeklyRoutineRepository implements IWeeklyRoutineRepository {
  constructor(private prisma: PrismaService) {}

  private toDomain(p: any): WeeklyRoutine {
    return new WeeklyRoutine(
      p.id,
      p.userId,
      p.label,
      p.color,
      p.days,
      p.slots,
      p.createdAt,
      p.updatedAt,
    );
  }

  async findById(id: string): Promise<WeeklyRoutine | null> {
    const p = await this.prisma.userWeeklyRoutine.findUnique({
      where: { id },
    });
    return p ? this.toDomain(p) : null;
  }

  async findByUserId(userId: string): Promise<WeeklyRoutine[]> {
    const list = await this.prisma.userWeeklyRoutine.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return list.map((p) => this.toDomain(p));
  }

  async create(routine: Partial<WeeklyRoutine>): Promise<WeeklyRoutine> {
    const created = await this.prisma.userWeeklyRoutine.create({
      data: {
        userId: routine.userId!,
        label: routine.label!,
        color: routine.color!,
        days: routine.days!,
        slots: routine.slots as any,
      },
    });
    return this.toDomain(created);
  }

  async update(
    id: string,
    routine: Partial<WeeklyRoutine>,
  ): Promise<WeeklyRoutine> {
    const updated = await this.prisma.userWeeklyRoutine.update({
      where: { id },
      data: {
        ...(routine.label !== undefined && { label: routine.label }),
        ...(routine.color !== undefined && { color: routine.color }),
        ...(routine.days !== undefined && { days: routine.days }),
        ...(routine.slots !== undefined && { slots: routine.slots as any }),
      },
    });
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.userWeeklyRoutine.delete({ where: { id } });
  }
}
