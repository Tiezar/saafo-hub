import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Inject,
  Res,
  Req,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import * as crypto from 'crypto';
import { LoginGoogleUseCase } from '../../../application/use-cases/login-google.use-case';
import type { IUserRepository } from '../../../domain/repositories/user-repository.interface';
import { ResendService } from '../../email/resend.service';
import { PrismaService } from '../../database/prisma.service';
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  MinLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import * as bcrypt from 'bcrypt';

// ─── Cookie config ─────────────────────────────────────────────────────────

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: REFRESH_TTL_MS,
};

// ─── DTOs ─────────────────────────────────────────────────────────────────

class LoginGoogleDto {
  @IsString() @IsNotEmpty() token: string;
}

class RegisterDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsEmail({}, { message: 'E-mail inválido' })
  @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, { message: 'E-mail inválido' })
  email: string;

  @IsString() @IsNotEmpty() name: string;
  @IsString() @MinLength(6) password: string;
}

class LoginDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string;

  @IsString() @IsNotEmpty() password: string;
}

// ─── Controller ────────────────────────────────────────────────────────────

@Controller('auth')
export class AuthController {
  private googleClient: OAuth2Client;
  private loginGoogleUseCase: LoginGoogleUseCase;

  constructor(
    @Inject('IUserRepository') private userRepository: IUserRepository,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private resendService: ResendService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    this.loginGoogleUseCase = new LoginGoogleUseCase(userRepository);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private signAccessToken(userId: string, email: string) {
    return this.jwtService.sign({ sub: userId, email });
  }

  private signEmailVerifyToken(userId: string) {
    return this.jwtService.sign(
      { sub: userId, type: 'email-verify' },
      { expiresIn: '24h' },
    );
  }

  private async issueRefreshToken(
    userId: string,
    family: string,
    res: Response,
  ) {
    const rawToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, family, expiresAt },
    });

    // Background cleanup of expired/revoked tokens for this user
    this.prisma.refreshToken
      .deleteMany({
        where: {
          userId,
          OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
        },
      })
      .catch(() => {});

    res.cookie(REFRESH_COOKIE, rawToken, cookieOpts);
    return rawToken;
  }

  // ── Register ────────────────────────────────────────────────────────────

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const existing = await this.userRepository.findByEmail(body.email);
    if (existing) throw new BadRequestException('E-mail já cadastrado');

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await this.userRepository.create({
      email: body.email,
      name: body.name,
      passwordHash,
      emailVerified: false,
    });

    const verifyToken = this.signEmailVerifyToken(user.id);
    const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
    const verifyUrl = `${apiUrl}/auth/verify-email?token=${verifyToken}`;

    try {
      await this.resendService.sendVerificationEmail(
        user.email,
        user.name,
        verifyUrl,
      );
    } catch {
      throw new BadRequestException(
        'Cadastro realizado, mas falhou ao enviar o e-mail de verificação. Por favor, solicite o reenvio de confirmação na tela de login.',
      );
    }

    return {
      message: `Email de verificação enviado para ${user.email}. Verifique sua caixa de entrada para ativar sua conta.`,
    };
  }

  // ── Resend verification ─────────────────────────────────────────────────

  @Post('resend-verification')
  async resendVerification(@Body() body: { email: string }) {
    if (!body.email) throw new BadRequestException('E-mail é obrigatório');

    const user = await this.userRepository.findByEmail(body.email);
    if (!user) throw new BadRequestException('Usuário não encontrado');
    if (user.emailVerified)
      throw new BadRequestException('Este e-mail já está verificado');

    const verifyToken = this.signEmailVerifyToken(user.id);
    const apiUrl = process.env.API_URL ?? 'http://localhost:3000';
    const verifyUrl = `${apiUrl}/auth/verify-email?token=${verifyToken}`;

    try {
      await this.resendService.sendVerificationEmail(
        user.email,
        user.name,
        verifyUrl,
      );
    } catch {
      throw new BadRequestException(
        'Falha ao enviar o e-mail de verificação. Por favor, tente novamente mais tarde.',
      );
    }

    return {
      message: `Novo e-mail de verificação enviado com sucesso para ${user.email}.`,
    };
  }

  // ── Login ────────────────────────────────────────────────────────────────

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.userRepository.findByEmail(body.email);
    if (!user || !user.passwordHash)
      throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    if (!user.emailVerified)
      throw new ForbiddenException(
        'E-mail não verificado. Verifique sua caixa de entrada antes de fazer login.',
      );

    await this.issueRefreshToken(user.id, crypto.randomUUID(), res);

    return {
      access_token: this.signAccessToken(user.id, user.email),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
      },
    };
  }

  // ── Google login ─────────────────────────────────────────────────────────

  @Post('google')
  async loginGoogle(
    @Body() body: LoginGoogleDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    let ticket;
    try {
      ticket = await this.googleClient.verifyIdToken({
        idToken: body.token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch {
      throw new BadRequestException('Token do Google inválido ou expirado');
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub || !payload.name)
      throw new BadRequestException(
        'Token do Google sem as informações necessárias',
      );

    try {
      const user = await this.loginGoogleUseCase.execute({
        email: payload.email,
        name: payload.name,
        googleId: payload.sub,
      });

      await this.issueRefreshToken(user.id, crypto.randomUUID(), res);

      return {
        access_token: this.signAccessToken(user.id, user.email),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          nickname: user.nickname,
        },
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new BadRequestException((err as Error).message);
    }
  }

  // ── Email verification redirect ──────────────────────────────────────────

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
      .split(',')[0]
      .trim();

    if (!token) return res.redirect(`${frontendUrl}?auth_error=token_missing`);

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        type: string;
      }>(token);
      if (payload.type !== 'email-verify')
        return res.redirect(`${frontendUrl}?auth_error=invalid_token`);

      const user = await this.userRepository.findById(payload.sub);
      if (!user)
        return res.redirect(`${frontendUrl}?auth_error=user_not_found`);

      await this.userRepository.verifyEmail(user.id);
      await this.issueRefreshToken(user.id, crypto.randomUUID(), res);

      return res.redirect(`${frontendUrl}?verified=true`);
    } catch {
      return res.redirect(`${frontendUrl}?auth_error=expired_token`);
    }
  }

  // ── Refresh ──────────────────────────────────────────────────────────────

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken: string | undefined = (
      req.cookies as Record<string, string>
    )?.[REFRESH_COOKIE];
    if (!rawToken) throw new UnauthorizedException('Sem sessão ativa.');

    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!record) throw new UnauthorizedException('Token inválido.');

    // Reuse attack: token already revoked → revoke entire family
    if (record.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: {
          userId: record.userId,
          family: record.family,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      res.clearCookie(REFRESH_COOKIE, { path: '/' });
      throw new UnauthorizedException(
        'Sessão comprometida. Faça login novamente.',
      );
    }

    if (record.expiresAt < new Date()) {
      res.clearCookie(REFRESH_COOKIE, { path: '/' });
      throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
    }

    // Revoke used token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.userRepository.findById(record.userId);
    if (!user) throw new UnauthorizedException('Usuário não encontrado.');

    await this.issueRefreshToken(user.id, record.family, res);

    return { access_token: this.signAccessToken(user.id, user.email) };
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken: string | undefined = (
      req.cookies as Record<string, string>
    )?.[REFRESH_COOKIE];
    if (rawToken) {
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');
      await this.prisma.refreshToken
        .updateMany({
          where: { tokenHash, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        .catch(() => {});
    }
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
    return { ok: true };
  }
}
