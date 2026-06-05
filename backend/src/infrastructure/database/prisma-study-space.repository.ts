import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { IStudySpaceRepository } from '../../domain/repositories/study-space-repository.interface';
import { StudySpace } from '../../domain/entities/study-space';
import { StudySpace as PrismaStudySpace } from '@prisma/client';

@Injectable()
export class PrismaStudySpaceRepository implements IStudySpaceRepository {
  constructor(private prisma: PrismaService) {}

  private toDomain(p: PrismaStudySpace): StudySpace {
    return new StudySpace(p.id, p.userId, p.name, p.color, p.icon, p.createdAt);
  }

  async findByUserId(userId: string): Promise<StudySpace[]> {
    const spaces = await this.prisma.studySpace.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return spaces.map(s => this.toDomain(s));
  }

  async findById(id: string): Promise<StudySpace | null> {
    const space = await this.prisma.studySpace.findUnique({ where: { id } });
    return space ? this.toDomain(space) : null;
  }

  async create(space: Partial<StudySpace>): Promise<StudySpace> {
    const created = await this.prisma.studySpace.create({
      data: {
        userId: space.userId!,
        name: space.name!,
        color: space.color,
        icon: space.icon,
      },
    });
    return this.toDomain(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.studySpace.delete({ where: { id } });
  }
}
