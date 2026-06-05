import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GeminiService, type Insight } from './gemini.service';
import type { IMetricsRepository } from '../../domain/repositories/metrics-repository.interface';
import type { ICardRepository } from '../../domain/repositories/card-repository.interface';
import type { ICalendarEventRepository } from '../../domain/repositories/calendar-event-repository.interface';
import type { DailyActivity } from '../../domain/entities/study-metrics';

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 horas
const PT_DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

@Injectable()
export class InsightsService {
  constructor(
    @Inject('IMetricsRepository') private readonly metricsRepo: IMetricsRepository,
    @Inject('ICardRepository') private readonly cardRepo: ICardRepository,
    @Inject('ICalendarEventRepository') private readonly calendarRepo: ICalendarEventRepository,
    private readonly geminiService: GeminiService,
    private readonly prisma: PrismaService,
  ) {}

  async getInsights(userId: string, userName: string): Promise<Insight[]> {
    // Verificar cache
    const cached = await this.prisma.insightCache.findUnique({ where: { userId } });
    if (cached && Date.now() - cached.generatedAt.getTime() < CACHE_TTL_MS) {
      return cached.data as unknown as Insight[];
    }

    // Coletar dados
    const [metrics, overdueCards] = await Promise.all([
      this.metricsRepo.getMetricsForUser(userId, 90),
      this.cardRepo.findDueCards(userId, new Date()),
    ]);

    const now = new Date();
    const to14 = new Date(now.getTime() + 14 * 86_400_000);
    const events = await this.calendarRepo.findByUserAndRange(
      userId, now, to14, undefined,
    );
    const exams = events.filter((e: any) => e.type === 'EXAM');

    // Calcular métricas derivadas
    const streak = this.computeStreak(metrics.dailyActivity);
    const bestDay = this.computeBestDay(metrics.dailyActivity);

    const totalCards = metrics.subjectsPerformance.reduce((s, p) => s + p.totalCards, 0);
    const dominant = [...metrics.subjectsPerformance].sort((a, b) => b.totalCards - a.totalCards)[0];
    const dominantPct = dominant && totalCards > 0
      ? Math.round((dominant.totalCards / totalCards) * 100) : 0;

    const weakest = metrics.subjectsPerformance
      .filter(s => s.totalCards >= 5)
      .sort((a, b) => a.retentionRate - b.retentionRate)[0];

    const rawData = {
      userName,
      streak,
      overdueCount: overdueCards.length,
      subjects: metrics.subjectsPerformance.map(s => ({
        name: s.subjectName,
        retention: Math.round(s.retentionRate),
        totalCards: s.totalCards,
      })),
      upcomingExams: exams.map((e: any) => ({
        title: e.title,
        daysUntil: Math.max(0, Math.ceil((new Date(e.startAt).getTime() - now.getTime()) / 86_400_000)),
      })),
      bestDayOfWeek: bestDay,
      dominantSubject: dominant?.subjectName,
      dominantSubjectPct: dominantPct,
      weakestSubject: weakest?.subjectName,
      weakestRetention: weakest ? Math.round(weakest.retentionRate) : null,
      totalSubjects: metrics.subjectsPerformance.length,
    };

    const insights = await this.geminiService.generateInsights(rawData);

    // Salvar cache
    await this.prisma.insightCache.upsert({
      where: { userId },
      create: { userId, data: insights as any, generatedAt: now },
      update: { data: insights as any, generatedAt: now },
    });

    return insights;
  }

  async invalidateCache(userId: string): Promise<void> {
    await this.prisma.insightCache.deleteMany({ where: { userId } });
  }

  private computeStreak(activity: DailyActivity[]): number {
    const actSet = new Set(activity.filter(a => a.count > 0).map(a => a.date));
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const s = d.toISOString().split('T')[0];
      if (!actSet.has(s)) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  private computeBestDay(activity: DailyActivity[]): string {
    const sums = new Array(7).fill(0);
    const counts = new Array(7).fill(0);
    for (const a of activity) {
      const dow = new Date(a.date + 'T12:00:00').getDay();
      sums[dow] += a.count;
      counts[dow]++;
    }
    const avgs = sums.map((s, i) => (counts[i] > 0 ? s / counts[i] : 0));
    return PT_DAYS[avgs.indexOf(Math.max(...avgs))];
  }
}
