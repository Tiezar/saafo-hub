import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ITopicRepository } from '../../domain/repositories/topic-repository.interface';
import { Topic } from '../../domain/entities/topic';
import { Topic as PrismaTopic } from '@prisma/client';

@Injectable()
export class PrismaTopicRepository implements ITopicRepository {
  constructor(private prisma: PrismaService) {}

  private toDomain(prismaTopic: PrismaTopic): Topic {
    return new Topic(
      prismaTopic.id,
      prismaTopic.name,
      prismaTopic.subjectId,
      prismaTopic.createdAt,
      prismaTopic.updatedAt,
    );
  }

  async findById(id: string): Promise<Topic | null> {
    const topic = await this.prisma.topic.findUnique({ where: { id } });
    return topic ? this.toDomain(topic) : null;
  }

  async findBySubjectId(subjectId: string): Promise<Topic[]> {
    const topics = await this.prisma.topic.findMany({
      where: { subjectId },
      orderBy: { name: 'asc' },
    });
    return topics.map(this.toDomain);
  }

  async create(topic: Partial<Topic>): Promise<Topic> {
    const created = await this.prisma.topic.create({
      data: {
        name: topic.name!,
        subjectId: topic.subjectId!,
      },
    });
    return this.toDomain(created);
  }

  async update(id: string, topic: Partial<Topic>): Promise<Topic> {
    const updated = await this.prisma.topic.update({
      where: { id },
      data: {
        name: topic.name,
      },
    });
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.topic.delete({ where: { id } });
  }
}
