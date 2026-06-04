import {
  Controller,
  Post,
  Body,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { LoginGoogleUseCase } from '../../../application/use-cases/login-google.use-case';
import type { IUserRepository } from '../../../domain/repositories/user-repository.interface';
import { IsNotEmpty, IsString } from 'class-validator';

class LoginGoogleDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

@Controller('auth')
export class AuthController {
  private googleClient: OAuth2Client;
  private loginGoogleUseCase: LoginGoogleUseCase;

  constructor(
    @Inject('IUserRepository') private userRepository: IUserRepository,
    private jwtService: JwtService,
  ) {
    this.googleClient = new OAuth2Client();
    this.loginGoogleUseCase = new LoginGoogleUseCase(userRepository);
  }

  @Post('google')
  async loginGoogle(@Body() body: LoginGoogleDto) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: body.token,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email || !payload.sub || !payload.name) {
        throw new BadRequestException(
          'Token do Google inválido ou sem as informações necessárias',
        );
      }

      const user = await this.loginGoogleUseCase.execute({
        email: payload.email,
        name: payload.name,
        googleId: payload.sub,
      });

      const jwtPayload = { email: user.email, sub: user.id };
      return {
        access_token: this.jwtService.sign(jwtPayload),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          nickname: user.nickname,
        },
      };
    } catch (err) {
      throw new BadRequestException(
        'Falha na validação do token do Google: ' + (err as Error).message,
      );
    }
  }
}
