import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { IUserRepository } from '../../domain/repositories/user-repository.interface';
import { User } from '../../domain/entities/user';
import { Prisma, User as PrismaUser } from '@prisma/client';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaService) {}

  private toDomain(p: PrismaUser): User {
    return new User(
      p.id,
      p.email,
      p.name,
      p.nickname,
      p.googleId,
      p.passwordHash,
      p.institutionId,
      p.createdAt,
      p.updatedAt,
      p.emailVerified,
      p.phone,
      p.plan,
      p.trialEndsAt,
      p.asaasCustomerId,
      p.asaasSubscriptionId,
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    const u = await this.prisma.user.findUnique({ where: { email } });
    return u ? this.toDomain(u) : null;
  }

  async findById(id: string): Promise<User | null> {
    const u = await this.prisma.user.findUnique({ where: { id } });
    return u ? this.toDomain(u) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const u = await this.prisma.user.findUnique({ where: { googleId } });
    return u ? this.toDomain(u) : null;
  }

  async create(user: Partial<User>): Promise<User> {
    const trialEndsAt =
      user.trialEndsAt ??
      (() => {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        return d;
      })();
    const created = await this.prisma.user.create({
      data: {
        email: user.email!,
        name: user.name!,
        googleId: user.googleId,
        passwordHash: user.passwordHash,
        institutionId: user.institutionId,
        emailVerified: user.emailVerified ?? false,
        plan: user.plan ?? 'FREE_TRIAL',
        trialEndsAt,
      },
    });
    return this.toDomain(created);
  }

  async update(id: string, user: Partial<User>): Promise<User> {
    try {
      const updated = await this.prisma.user.update({
        where: { id },
        data: {
          ...(user.name !== undefined && { name: user.name }),
          ...(user.nickname !== undefined && { nickname: user.nickname }),
          ...(user.googleId !== undefined && { googleId: user.googleId }),
          ...(user.passwordHash !== undefined && {
            passwordHash: user.passwordHash,
          }),
          ...(user.institutionId !== undefined && {
            institutionId: user.institutionId,
          }),
          ...(user.emailVerified !== undefined && {
            emailVerified: user.emailVerified,
          }),
          ...(user.phone !== undefined && { phone: user.phone }),
          ...(user.plan !== undefined && { plan: user.plan }),
          ...(user.trialEndsAt !== undefined && {
            trialEndsAt: user.trialEndsAt,
          }),
          ...(user.asaasCustomerId !== undefined && {
            asaasCustomerId: user.asaasCustomerId,
          }),
          ...(user.asaasSubscriptionId !== undefined && {
            asaasSubscriptionId: user.asaasSubscriptionId,
          }),
        },
      });
      return this.toDomain(updated);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new Error('Institution not found');
      }
      throw err;
    }
  }

  async verifyEmail(id: string): Promise<User> {
    const updated = await this.prisma.user.update({
      where: { id },
      data: { emailVerified: true },
    });
    return this.toDomain(updated);
  }
}
