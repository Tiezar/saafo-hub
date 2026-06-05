import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Inject,
  Res,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { LoginGoogleUseCase } from '../../../application/use-cases/login-google.use-case';
import type { IUserRepository } from '../../../domain/repositories/user-repository.interface';
import { ResendService } from '../../email/resend.service';
import { IsNotEmpty, IsString, IsEmail, MinLength } from 'class-validator';
import * as bcrypt from 'bcrypt';

class LoginGoogleDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @MinLength(6)
  password: string;
}

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

@Controller('auth')
export class AuthController {
  private googleClient: OAuth2Client;
  private loginGoogleUseCase: LoginGoogleUseCase;

  constructor(
    @Inject('IUserRepository') private userRepository: IUserRepository,
    private jwtService: JwtService,
    private resendService: ResendService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    this.loginGoogleUseCase = new LoginGoogleUseCase(userRepository);
  }

  private signToken(userId: string, email: string) {
    return this.jwtService.sign({ sub: userId, email });
  }

  private signEmailVerifyToken(userId: string) {
    return this.jwtService.sign(
      { sub: userId, type: 'email-verify' },
      { expiresIn: '24h' },
    );
  }

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const existing = await this.userRepository.findByEmail(body.email);
    if (existing) {
      throw new BadRequestException('E-mail já cadastrado');
    }

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
      await this.resendService.sendVerificationEmail(user.email, user.name, verifyUrl);
    } catch (err) {
      // Auto-verify email so they can test/login immediately without Resend domain verification blockage
      await this.userRepository.verifyEmail(user.id);
      return {
        message: `Conta criada com sucesso! (O envio de e-mail falhou por conta do domínio do Resend não verificado, mas sua conta foi ativada automaticamente para fins de teste).`,
      };
    }

    return {
      message: `Email de verificação enviado para ${user.email}. Verifique sua caixa de entrada para ativar sua conta.`,
    };
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    const user = await this.userRepository.findByEmail(body.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException(
        'E-mail não verificado. Verifique sua caixa de entrada antes de fazer login.',
      );
    }

    return {
      access_token: this.signToken(user.id, user.email),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        nickname: user.nickname,
      },
    };
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
      .split(',')[0]
      .trim();

    if (!token) {
      return res.redirect(`${frontendUrl}?auth_error=token_missing`);
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        type: string;
      }>(token);

      if (payload.type !== 'email-verify') {
        return res.redirect(`${frontendUrl}?auth_error=invalid_token`);
      }

      const user = await this.userRepository.findById(payload.sub);
      if (!user) {
        return res.redirect(`${frontendUrl}?auth_error=user_not_found`);
      }

      await this.userRepository.verifyEmail(user.id);

      const accessToken = this.signToken(user.id, user.email);
      return res.redirect(
        `${frontendUrl}?access_token=${accessToken}&verified=true`,
      );
    } catch {
      return res.redirect(`${frontendUrl}?auth_error=expired_token`);
    }
  }

  @Post('google')
  async loginGoogle(@Body() body: LoginGoogleDto) {
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
    if (!payload || !payload.email || !payload.sub || !payload.name) {
      throw new BadRequestException(
        'Token do Google sem as informações necessárias',
      );
    }

    try {
      const user = await this.loginGoogleUseCase.execute({
        email: payload.email,
        name: payload.name,
        googleId: payload.sub,
      });

      return {
        access_token: this.signToken(user.id, user.email),
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
}
