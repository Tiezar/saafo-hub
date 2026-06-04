import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { IStudySessionRepository } from '../../domain/repositories/study-session-repository.interface';
import { StudySession } from '../../domain/entities/study-session';
import { CardReview } from '../../domain/entities/card-review';
import {
  StudySession as PrismaStudySession,
  CardReview as PrismaCardReview,
} from '@prisma/client';

@Injectable()
export class PrismaStudySessionRepository implements IStudySessionRepository {
  constructor(private prisma: PrismaService) {}

  private toDomainSession(
    prismaSession: PrismaStudySession,
    prismaReviews?: PrismaCardReview[],
  ): StudySession {
    return new StudySession(
      prismaSession.id,
      prismaSession.userId,
      prismaSession.startedAt,
      prismaSession.endedAt,
      prismaReviews ? prismaReviews.map(this.toDomainReview) : undefined,
      prismaSession.createdAt,
      prismaSession.updatedAt,
    );
  }

  private toDomainReview(prismaReview: PrismaCardReview): CardReview {
    return new CardReview(
      prismaReview.id,
      prismaReview.cardId,
      prismaReview.sessionId,
      prismaReview.rating,
      prismaReview.reviewedAt,
    );
  }

  async findById(id: string): Promise<StudySession | null> {
    const session = await this.prisma.studySession.findUnique({
      where: { id },
      include: { reviews: true },
    });
    return session ? this.toDomainSession(session, session.reviews) : null;
  }

  async findByUserId(userId: string): Promise<StudySession[]> {
    const sessions = await this.prisma.studySession.findMany({
      where: { userId },
      include: { reviews: true },
      orderBy: { startedAt: 'desc' },
    });
    return sessions.map((s) => this.toDomainSession(s, s.reviews));
  }

  async create(session: Partial<StudySession>): Promise<StudySession> {
    const created = await this.prisma.studySession.create({
      data: {
        userId: session.userId!,
        startedAt: session.startedAt ?? new Date(),
        endedAt: session.endedAt,
      },
    });
    return this.toDomainSession(created);
  }

  async update(
    id: string,
    session: Partial<StudySession>,
  ): Promise<StudySession> {
    const updated = await this.prisma.studySession.update({
      where: { id },
      data: {
        endedAt: session.endedAt,
      },
    });
    return this.toDomainSession(updated);
  }

  async createReview(review: Partial<CardReview>): Promise<CardReview> {
    const created = await this.prisma.cardReview.create({
      data: {
        cardId: review.cardId!,
        sessionId: review.sessionId!,
        rating: review.rating!,
        reviewedAt: review.reviewedAt ?? new Date(),
      },
    });
    return this.toDomainReview(created);
  }
}
