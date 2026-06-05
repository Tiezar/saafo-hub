export interface DueReminder {
  id: string;
  eventId: string;
  minutesBefore: number;
  method: string;
  scheduledAt: Date;
  event: {
    id: string;
    title: string;
    type: string;
    startAt: Date;
    recurrenceDays: number[];
    recurrenceEndsAt: Date | null;
    userId: string;
    user: { phone: string | null };
  };
}

export interface IEventReminderRepository {
  findDueAndUnsent(): Promise<DueReminder[]>;
  markSent(id: string): Promise<void>;
  createNext(eventId: string, minutesBefore: number, method: string, scheduledAt: Date): Promise<void>;
  deleteUnsent(eventId: string): Promise<void>;
}
