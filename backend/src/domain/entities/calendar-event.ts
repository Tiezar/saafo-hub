export enum EventType {
  EXAM = 'EXAM',
  DEADLINE = 'DEADLINE',
  FIXED_BLOCK = 'FIXED_BLOCK',
  REMINDER = 'REMINDER',
  STUDY_SESSION = 'STUDY_SESSION',
}

export enum ReminderMethod {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
}

export interface ReminderInput {
  minutesBefore: number;
  method: ReminderMethod;
}

export interface EventReminderSummary {
  id: string;
  minutesBefore: number;
  method: ReminderMethod;
  scheduledAt: Date;
  sent: boolean;
}

export class CalendarEvent {
  constructor(
    public readonly id: string,
    public userId: string,
    public title: string,
    public type: EventType,
    public startAt: Date,
    public endAt: Date | null,
    public allDay: boolean,
    public spaceId: string | null,
    public subjectId: string | null,
    public notes: string | null,
    public color: string | null,
    public recurrenceDays: number[],
    public recurrenceEndsAt: Date | null,
    public reminders: EventReminderSummary[],
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}
}
