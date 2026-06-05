import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { ISubjectRepository } from '../../domain/repositories/subject-repository.interface';
import { Subject } from '../../domain/entities/subject';
import { Subject as PrismaSubject } from '@prisma/client';

@Injectable()
export class PrismaSubjectRepository implements ISubjectRepository {
  constructor(private prisma: PrismaService) {}

  private toDomain(prismaSubject: PrismaSubject): Subject {
    return new Subject(
      prismaSubject.id,
      prismaSubject.name,
      prismaSubject.color,
      prismaSubject.userId,
      prismaSubject.createdAt,
      prismaSubject.updatedAt,
      prismaSubject.spaceId,
    );
  }

  async findById(id: string): Promise<Subject | null> {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    return subject ? this.toDomain(subject) : null;
  }

  async findByUserId(userId: string): Promise<Subject[]> {
    const subjects = await this.prisma.subject.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    return subjects.map(this.toDomain);
  }

  async create(subject: Partial<Subject>): Promise<Subject> {
    const created = await this.prisma.subject.create({
      data: {
        name: subject.name!,
        color: subject.color,
        userId: subject.userId!,
        spaceId: subject.spaceId,
      },
    });
    return this.toDomain(created);
  }

  async update(id: string, subject: Partial<Subject>): Promise<Subject> {
    const updated = await this.prisma.subject.update({
      where: { id },
      data: {
        name: subject.name,
        color: subject.color,
        ...(subject.spaceId !== undefined && { spaceId: subject.spaceId }),
      },
    });
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.subject.delete({ where: { id } });
  }
}
