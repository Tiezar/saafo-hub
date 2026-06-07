import {
  CanActivate, ExecutionContext, HttpException, Inject, Injectable, UnauthorizedException,
} from '@nestjs/common';
import type { IUserRepository } from '../../../domain/repositories/user-repository.interface';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.id;
    const userEmail: string | undefined = req.user?.email;
    if (!userId) throw new UnauthorizedException();

    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    if (userEmail && adminEmails.includes(userEmail.toLowerCase())) return true;

    const user = await this.userRepository.findById(userId);
    if (!user) throw new UnauthorizedException();

    if (user.isActivePlan) return true;

    throw new HttpException(
      {
        message: 'Seu período gratuito expirou. Assine o Plano Estudante para continuar usando a IA.',
        code: 'PLAN_EXPIRED',
        trialEndsAt: user.trialEndsAt,
      },
      402,
    );
  }
}
