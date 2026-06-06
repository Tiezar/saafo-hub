import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import {
  ICalendarEventRepository,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
} from '../../domain/repositories/calendar-event-repository.interface';
import { CalendarEvent, ReminderMethod } from '../../domain/entities/calendar-event';
import { Prisma } from '@prisma/client';

type PrismaEventWithReminders = Prisma.CalendarEventGetPayload<{
  include: { reminders: true };
}>;

@Injectable()
export class PrismaCalendarEventRepository implements ICalendarEventRepository {
  constructor(private prisma: PrismaService) {}

  private toDomain(p: PrismaEventWithReminders): CalendarEvent {
    return new CalendarEvent(
      p.id,
      p.userId,
      p.title,
      p.type,
      p.startAt,
      p.endAt,
      p.allDay,
      p.spaceId,
      p.subjectId,
      p.notes,
      p.color,
      p.recurrenceDays,
      p.recurrenceEndsAt,
      p.reminders.map(r => ({
        id: r.id,
        minutesBefore: r.minutesBefore,
        method: r.method as ReminderMethod,
        scheduledAt: r.scheduledAt,
        sent: r.sent,
      })),
      p.createdAt,
      p.updatedAt,
    );
  }

  private computeScheduledAt(startAt: Date, minutesBefore: number): Date {
    return new Date(startAt.getTime() - minutesBefore * 60 * 1000);
  }

  private nextRecurringDate(startAt: Date, recurrenceDays: number[]): Date | null {
    if (!recurrenceDays.length) return null;
    const now = new Date();
    const candidate = new Date(startAt);
    candidate.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = 0; i < 365; i++) {
      const day = candidate.getDay();
      if (recurrenceDays.includes(day) && candidate > now) return candidate;
      candidate.setDate(candidate.getDate() + 1);
    }
    return null;
  }

  async findByUserAndRange(userId: string, from: Date, to: Date, spaceId?: string): Promise<CalendarEvent[]> {
    const events = await this.prisma.calendarEvent.findMany({
      where: {
        userId,
        ...(spaceId ? { spaceId } : {}),
        OR: [
          { startAt: { gte: from, lte: to } },
          { recurrenceDays: { isEmpty: false } },
        ],
      },
      include: { reminders: true },
      orderBy: { startAt: 'asc' },
    });
    return events.map(e => this.toDomain(e));
  }

  async findById(id: string): Promise<CalendarEvent | null> {
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id },
      include: { reminders: true },
    });
    return event ? this.toDomain(event) : null;
  }

  async findUpcoming(userId: string, limit: number): Promise<CalendarEvent[]> {
    const now = new Date();
    const events = await this.prisma.calendarEvent.findMany({
      where: {
        userId,
        OR: [
          { startAt: { gte: now } },
          { recurrenceDays: { isEmpty: false } },
        ],
      },
      include: { reminders: true },
      orderBy: { startAt: 'asc' },
      take: limit,
    });
    return events.map(e => this.toDomain(e));
  }

  async create(input: CreateCalendarEventInput): Promise<CalendarEvent> {
    const isRecurring = (input.recurrenceDays?.length ?? 0) > 0;
    const effectiveStart = isRecurring && input.reminders?.length
      ? (this.nextRecurringDate(input.startAt, input.recurrenceDays ?? []) ?? input.startAt)
      : input.startAt;

    const created = await this.prisma.calendarEvent.create({
      data: {
        userId: input.userId,
        title: input.title,
        type: input.type as any,
        startAt: input.startAt,
        endAt: input.endAt,
        allDay: input.allDay ?? false,
        spaceId: input.spaceId,
        subjectId: input.subjectId,
        notes: input.notes,
        color: input.color,
        recurrenceDays: input.recurrenceDays ?? [],
        recurrenceEndsAt: input.recurrenceEndsAt,
        reminders: input.reminders?.length
          ? {
              create: input.reminders.map(r => ({
                minutesBefore: r.minutesBefore,
                method: r.method as any,
                scheduledAt: this.computeScheduledAt(effectiveStart, r.minutesBefore),
                sent: false,
              })),
            }
          : undefined,
      },
      include: { reminders: true },
    });
    return this.toDomain(created);
  }

  async update(id: string, input: UpdateCalendarEventInput): Promise<CalendarEvent> {
    const existing = await this.prisma.calendarEvent.findUnique({ where: { id } });
    if (!existing) throw new Error('Event not found');

    const startAt = input.startAt ?? existing.startAt;
    const isRecurring = ((input.recurrenceDays ?? existing.recurrenceDays)?.length ?? 0) > 0;
    const effectiveStart = isRecurring && input.reminders?.length
      ? (this.nextRecurringDate(startAt, input.recurrenceDays ?? existing.recurrenceDays) ?? startAt)
      : startAt;

    const updated = await this.prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.type !== undefined && { type: input.type as any }),
        ...(input.startAt !== undefined && { startAt: input.startAt }),
        ...(input.endAt !== undefined && { endAt: input.endAt }),
        ...(input.allDay !== undefined && { allDay: input.allDay }),
        ...(input.spaceId !== undefined && { spaceId: input.spaceId }),
        ...(input.subjectId !== undefined && { subjectId: input.subjectId }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.color !== undefined && { color: input.color }),
        ...(input.recurrenceDays !== undefined && { recurrenceDays: input.recurrenceDays }),
        ...(input.recurrenceEndsAt !== undefined && { recurrenceEndsAt: input.recurrenceEndsAt }),
        ...(input.reminders !== undefined && {
          reminders: {
            deleteMany: { sent: false },
            create: input.reminders.map(r => ({
              minutesBefore: r.minutesBefore,
              method: r.method as any,
              scheduledAt: this.computeScheduledAt(effectiveStart, r.minutesBefore),
              sent: false,
            })),
          },
        }),
      },
      include: { reminders: true },
    });
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.calendarEvent.delete({ where: { id } });
  }
}
