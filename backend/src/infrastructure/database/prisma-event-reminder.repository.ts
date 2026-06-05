import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import {
  IEventReminderRepository,
  DueReminder,
} from '../../domain/repositories/event-reminder-repository.interface';

@Injectable()
export class PrismaEventReminderRepository implements IEventReminderRepository {
  constructor(private prisma: PrismaService) {}

  async findDueAndUnsent(): Promise<DueReminder[]> {
    const now = new Date();
    const reminders = await this.prisma.eventReminder.findMany({
      where: { sent: false, scheduledAt: { lte: now } },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            type: true,
            startAt: true,
            recurrenceDays: true,
            recurrenceEndsAt: true,
            userId: true,
            user: { select: { phone: true, email: true, name: true } },
          },
        },
      },
    });
    return reminders as unknown as DueReminder[];
  }

  async markSent(id: string): Promise<void> {
    await this.prisma.eventReminder.update({
      where: { id },
      data: { sent: true, sentAt: new Date() },
    });
  }

  async createNext(
    eventId: string,
    minutesBefore: number,
    method: string,
    scheduledAt: Date,
  ): Promise<void> {
    await this.prisma.eventReminder.create({
      data: {
        eventId,
        minutesBefore,
        method: method as any,
        scheduledAt,
        sent: false,
      },
    });
  }

  async deleteUnsent(eventId: string): Promise<void> {
    await this.prisma.eventReminder.deleteMany({
      where: { eventId, sent: false },
    });
  }
}
