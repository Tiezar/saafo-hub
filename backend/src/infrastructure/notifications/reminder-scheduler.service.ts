import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { IEventReminderRepository, DueReminder } from '../../domain/repositories/event-reminder-repository.interface';
import { EvoApiService } from './evo-api.service';
import { ResendService } from '../email/resend.service';

const EVENT_TYPE_LABELS: Record<string, string> = {
  EXAM: '📝 Prova',
  DEADLINE: '⏰ Entrega',
  FIXED_BLOCK: '🔒 Compromisso',
  REMINDER: '🔔 Lembrete',
  STUDY_SESSION: '📚 Sessão de Estudo',
};

@Injectable()
export class ReminderSchedulerService {
  private readonly logger = new Logger(ReminderSchedulerService.name);

  constructor(
    @Inject('IEventReminderRepository')
    private reminderRepo: IEventReminderRepository,
    private evoApiService: EvoApiService,
    private resendService: ResendService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processDueReminders(): Promise<void> {
    let due: DueReminder[];
    try {
      due = await this.reminderRepo.findDueAndUnsent();
    } catch (err) {
      this.logger.error(`Failed to fetch due reminders: ${(err as Error).message}`);
      return;
    }

    for (const reminder of due) {
      try {
        await this.sendReminder(reminder);
        await this.reminderRepo.markSent(reminder.id);

        if (reminder.event.recurrenceDays.length > 0) {
          const nextDate = this.nextRecurringDate(
            reminder.event.startAt,
            reminder.event.recurrenceDays,
            reminder.event.recurrenceEndsAt,
          );
          if (nextDate) {
            const nextScheduledAt = new Date(
              nextDate.getTime() - reminder.minutesBefore * 60 * 1000,
            );
            await this.reminderRepo.createNext(
              reminder.eventId,
              reminder.minutesBefore,
              reminder.method,
              nextScheduledAt,
            );
          }
        }
      } catch (err) {
        this.logger.error(
          `Failed to process reminder ${reminder.id}: ${(err as Error).message}`,
        );
      }
    }
  }

  private async sendReminder(reminder: DueReminder): Promise<void> {
    const event = reminder.event;
    const label = EVENT_TYPE_LABELS[event.type] ?? '📅 Evento';
    const timeStr = this.formatTime(event.startAt);
    const when = this.humanizeMinutes(reminder.minutesBefore);

    const message =
      `🎯 *SAAFO HUB — Lembrete*\n\n` +
      `${label}: *${event.title}*\n` +
      `🕐 ${timeStr}\n` +
      `⏱ Começa em ${when}`;

    if (reminder.method === 'WHATSAPP' && event.user.phone) {
      await this.evoApiService.sendWhatsApp(event.user.phone, message);
    } else if (reminder.method === 'EMAIL') {
      await this.resendService.sendReminderEmail(
        event.user.email,
        event.user.name,
        event.title,
        label,
        timeStr,
        when,
      );
    }
  }

  private nextRecurringDate(
    originalStart: Date,
    recurrenceDays: number[],
    endsAt: Date | null,
  ): Date | null {
    if (!recurrenceDays.length) return null;
    const now = new Date();
    const candidate = new Date(originalStart);
    candidate.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = 0; i < 365; i++) {
      candidate.setDate(candidate.getDate() + 1);
      if (endsAt && candidate > endsAt) return null;
      if (recurrenceDays.includes(candidate.getDay())) return candidate;
    }
    return null;
  }

  private formatTime(date: Date): string {
    const d = new Date(date);
    const day = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${day} às ${time}`;
  }

  private humanizeMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes} minutos`;
    if (minutes < 1440) return `${minutes / 60}h`;
    const days = Math.round(minutes / 1440);
    return days === 1 ? '1 dia' : `${days} dias`;
  }
}
