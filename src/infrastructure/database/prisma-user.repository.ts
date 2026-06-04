import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { IUserRepository } from '../../domain/repositories/user-repository.interface';
import { User } from '../../domain/entities/user';
import { User as PrismaUser } from '@prisma/client';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  private toDomain(prismaUser: PrismaUser): User {
    return new User(
      prismaUser.id,
      prismaUser.email,
      prismaUser.name,
      prismaUser.nickname,
      prismaUser.googleId,
      prismaUser.passwordHash,
      prismaUser.institutionId,
      prismaUser.createdAt,
      prismaUser.updatedAt,
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? this.toDomain(user) : null;
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toDomain(user) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { googleId } });
    return user ? this.toDomain(user) : null;
  }

  async create(user: Partial<User>): Promise<User> {
    const created = await this.prisma.user.create({
      data: {
        email: user.email!,
        name: user.name!,
        googleId: user.googleId,
        passwordHash: user.passwordHash,
        institutionId: user.institutionId,
      },
    });
    return this.toDomain(created);
  }

  async update(id: string, user: Partial<User>): Promise<User> {
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: user.name,
        nickname: user.nickname,
        googleId: user.googleId,
        passwordHash: user.passwordHash,
        institutionId: user.institutionId,
      },
    });
    return this.toDomain(updated);
  }
}
