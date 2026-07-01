import { CalendarEvent, ReminderInput } from '../entities/calendar-event';

export interface CreateCalendarEventInput {
  userId: string;
  title: string;
  type: string;
  startAt: Date;
  endAt?: Date | null;
  allDay?: boolean;
  spaceId?: string | null;
  subjectId?: string | null;
  notes?: string | null;
  color?: string | null;
  recurrenceDays?: number[];
  recurrenceEndsAt?: Date | null;
  reminders?: ReminderInput[];
  userAreaId?: string | null;
}

export type UpdateCalendarEventInput = Partial<
  Omit<CreateCalendarEventInput, 'userId'>
>;

export interface ICalendarEventRepository {
  findByUserAndRange(
    userId: string,
    from: Date,
    to: Date,
    spaceId?: string,
  ): Promise<CalendarEvent[]>;
  findById(id: string): Promise<CalendarEvent | null>;
  findUpcoming(userId: string, limit: number): Promise<CalendarEvent[]>;
  create(input: CreateCalendarEventInput): Promise<CalendarEvent>;
  update(id: string, input: UpdateCalendarEventInput): Promise<CalendarEvent>;
  delete(id: string): Promise<void>;
}
