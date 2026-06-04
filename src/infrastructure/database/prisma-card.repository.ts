import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ICardRepository } from '../../domain/repositories/card-repository.interface';
import { Card } from '../../domain/entities/card';
import { Card as PrismaCard } from '@prisma/client';

@Injectable()
export class PrismaCardRepository implements ICardRepository {
  constructor(private prisma: PrismaService) {}

  private toDomain(prismaCard: PrismaCard): Card {
    return new Card(
      prismaCard.id,
      prismaCard.front,
      prismaCard.back,
      prismaCard.topicId,
      prismaCard.userId,
      prismaCard.repetitions,
      prismaCard.interval,
      prismaCard.easeFactor,
      prismaCard.nextReview,
      prismaCard.createdAt,
      prismaCard.updatedAt,
    );
  }

  async findById(id: string): Promise<Card | null> {
    const card = await this.prisma.card.findUnique({ where: { id } });
    return card ? this.toDomain(card) : null;
  }

  async findByTopicId(topicId: string): Promise<Card[]> {
    const cards = await this.prisma.card.findMany({
      where: { topicId },
      orderBy: { createdAt: 'asc' },
    });
    return cards.map(this.toDomain);
  }

  async findDueCards(userId: string, date: Date): Promise<Card[]> {
    const cards = await this.prisma.card.findMany({
      where: {
        userId,
        nextReview: {
          lte: date,
        },
      },
      orderBy: {
        nextReview: 'asc',
      },
    });
    return cards.map(this.toDomain);
  }

  async create(card: Partial<Card>): Promise<Card> {
    const created = await this.prisma.card.create({
      data: {
        front: card.front!,
        back: card.back!,
        topicId: card.topicId!,
        userId: card.userId!,
        repetitions: card.repetitions ?? 0,
        interval: card.interval ?? 0,
        easeFactor: card.easeFactor ?? 2.5,
        nextReview: card.nextReview ?? new Date(),
      },
    });
    return this.toDomain(created);
  }

  async update(id: string, card: Partial<Card>): Promise<Card> {
    const updated = await this.prisma.card.update({
      where: { id },
      data: {
        front: card.front,
        back: card.back,
        repetitions: card.repetitions,
        interval: card.interval,
        easeFactor: card.easeFactor,
        nextReview: card.nextReview,
      },
    });
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.card.delete({ where: { id } });
  }
}
