import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { IMetricsRepository } from '../../domain/repositories/metrics-repository.interface';
import {
  StudyMetrics,
  DailyActivity,
  ForecastDay,
  SubjectPerformance,
} from '../../domain/entities/study-metrics';

@Injectable()
export class PrismaMetricsRepository implements IMetricsRepository {
  constructor(private prisma: PrismaService) {}

  async getMetricsForUser(
    userId: string,
    daysLimit: number,
  ): Promise<StudyMetrics> {
    const now = new Date();

    // Calcular a data de início para o histórico de atividade
    const startDate = new Date();
    startDate.setDate(now.getDate() - daysLimit);
    startDate.setHours(0, 0, 0, 0);

    // 1. Total de Cards do Usuário e Distribuição de Maturidade
    const maturityGroups = await this.prisma.card.groupBy({
      by: ['repetitions'],
      _count: true,
      where: { userId },
    });

    let totalCards = 0;
    let matureCardsCount = 0;
    let learningCardsCount = 0;
    let newCardsCount = 0;

    for (const group of maturityGroups) {
      const count = group._count;
      totalCards += count;

      if (group.repetitions === 0) {
        newCardsCount += count;
      } else if (group.repetitions >= 4) {
        matureCardsCount += count;
      } else {
        learningCardsCount += count;
      }
    }

    // 2. Estatísticas Globais de Revisões (Taxa de Retenção e Nota Média)
    const globalReviews = await this.prisma.cardReview.findMany({
      where: {
        card: { userId },
        reviewedAt: { gte: startDate },
      },
      select: {
        rating: true,
        reviewedAt: true,
      },
    });

    const totalReviews = globalReviews.length;
    let successfulReviews = 0;
    let totalRatingSum = 0;

    for (const review of globalReviews) {
      totalRatingSum += review.rating;
      if (review.rating >= 3) {
        successfulReviews++;
      }
    }

    const retentionRate =
      totalReviews > 0
        ? Math.round((successfulReviews / totalReviews) * 100)
        : 0;
    const averageRating =
      totalReviews > 0
        ? parseFloat((totalRatingSum / totalReviews).toFixed(1))
        : 0.0;

    // 3. Atividade Diária (Histórico)
    // Inicializar o array com todos os dias do período com valor 0
    const dailyActivityMap = new Map<string, number>();
    const dailyActivity: DailyActivity[] = [];

    for (let i = daysLimit - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dailyActivityMap.set(dateStr, 0);
    }

    // Contar revisões por dia
    for (const review of globalReviews) {
      const dateStr = review.reviewedAt.toISOString().split('T')[0];
      if (dailyActivityMap.has(dateStr)) {
        dailyActivityMap.set(dateStr, dailyActivityMap.get(dateStr)! + 1);
      }
    }

    dailyActivityMap.forEach((count, date) => {
      dailyActivity.push(new DailyActivity(date, count));
    });

    // Ordenar atividade diária por data ascendente
    dailyActivity.sort((a, b) => a.date.localeCompare(b.date));

    // 4. Projeção de Próximas Revisões (Próximos 7 dias)
    const forecastMap = new Map<string, number>();
    const forecast: ForecastDay[] = [];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(now.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      forecastMap.set(dateStr, 0);
    }

    // Buscar data de próxima revisão de todos os cards ativos
    const cardsNextReview = await this.prisma.card.findMany({
      where: { userId },
      select: { nextReview: true },
    });

    for (const card of cardsNextReview) {
      const dateStr = card.nextReview.toISOString().split('T')[0];
      if (forecastMap.has(dateStr)) {
        forecastMap.set(dateStr, forecastMap.get(dateStr)! + 1);
      } else if (card.nextReview < todayStart) {
        // Se o card já estiver vencido (atrasado), ele acumula no dia de hoje (índice 0)
        const todayStr = todayStart.toISOString().split('T')[0];
        forecastMap.set(todayStr, forecastMap.get(todayStr)! + 1);
      }
    }

    forecastMap.forEach((count, date) => {
      forecast.push(new ForecastDay(date, count));
    });

    // Ordenar projeção por data ascendente
    forecast.sort((a, b) => a.date.localeCompare(b.date));

    // 5. Desempenho por Matéria
    const subjects = await this.prisma.subject.findMany({
      where: { userId },
      include: {
        topics: {
          include: {
            cards: {
              include: {
                reviews: {
                  where: {
                    reviewedAt: { gte: startDate },
                  },
                  select: {
                    rating: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const subjectsPerformance: SubjectPerformance[] = subjects.map(
      (subject) => {
        let subjectTotalCards = 0;
        let subjectTotalReviews = 0;
        let subjectSuccessfulReviews = 0;

        for (const topic of subject.topics) {
          subjectTotalCards += topic.cards.length;
          for (const card of topic.cards) {
            subjectTotalReviews += card.reviews.length;
            for (const review of card.reviews) {
              if (review.rating >= 3) {
                subjectSuccessfulReviews++;
              }
            }
          }
        }

        const subjectRetentionRate =
          subjectTotalReviews > 0
            ? Math.round((subjectSuccessfulReviews / subjectTotalReviews) * 100)
            : 0;

        return new SubjectPerformance(
          subject.id,
          subject.name,
          subject.color,
          subjectTotalCards,
          subjectRetentionRate,
        );
      },
    );

    return new StudyMetrics(
      userId,
      totalCards,
      retentionRate,
      averageRating,
      matureCardsCount,
      learningCardsCount,
      newCardsCount,
      dailyActivity,
      forecast,
      subjectsPerformance,
      totalReviews,
    );
  }
}
