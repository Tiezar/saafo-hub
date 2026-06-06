import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../../database/database.module';
import { AuthController } from '../controllers/auth.controller';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { ResendService } from '../../email/resend.service';

@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, ResendService],
})
export class AuthModule {}
