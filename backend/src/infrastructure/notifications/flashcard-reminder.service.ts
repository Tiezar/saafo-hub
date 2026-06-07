import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { EvoApiService } from './evo-api.service';

@Injectable()
export class FlashcardReminderService {
  private readonly logger = new Logger(FlashcardReminderService.name);

  constructor(
    private prisma: PrismaService,
    private evoApi: EvoApiService,
  ) {}

  // 8h00 horário de Brasília (UTC-3 = 11h00 UTC)
  @Cron('0 11 * * *')
  async sendDailyReminders(): Promise<void> {
    if (!this.evoApi.isConfigured) {
      this.logger.warn('EvoAPI not configured — skipping flashcard reminders');
      return;
    }

    const now = new Date();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const users = await this.prisma.user.findMany({
      where: {
        phone: { not: null },
        OR: [
          { plan: 'STUDENT' },
          { plan: 'FREE_TRIAL', trialEndsAt: { gte: now } },
        ],
        cards: { some: { nextReview: { lte: endOfDay } } },
      },
      select: {
        phone: true,
        name: true,
        nickname: true,
        _count: {
          select: {
            cards: { where: { nextReview: { lte: endOfDay } } },
          },
        },
      },
    });

    this.logger.log(`Sending flashcard reminders to ${users.length} user(s)`);

    for (const user of users) {
      const dueCount = user._count.cards;
      const firstName = user.nickname ?? user.name.split(' ')[0];
      const cardLabel = dueCount === 1 ? '1 flashcard' : `${dueCount} flashcards`;

      const message =
        `📚 *SAAFO HUB — Revisão Pendente*\n\n` +
        `Olá, ${firstName}! Você tem *${cardLabel}* para revisar hoje.\n\n` +
        `Abra o app e mantenha seu ritmo de estudos. 💪`;

      try {
        await this.evoApi.sendWhatsApp(user.phone!, message);
      } catch (err) {
        this.logger.error(`Failed to send reminder to ${user.phone}: ${(err as Error).message}`);
      }
    }
  }
}
