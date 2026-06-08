import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user as
      | { id: string; email: string }
      | undefined;
    if (!user) throw new UnauthorizedException();

    const allowed = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (!allowed.includes(user.email.toLowerCase())) {
      throw new ForbiddenException('Acesso restrito.');
    }
    return true;
  }
}
