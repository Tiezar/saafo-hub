import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AdminController } from '../controllers/admin.controller';
import { PrismaService } from '../../database/prisma.service';
import { EvoApiService } from '../../notifications/evo-api.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../strategies/jwt.strategy';

@Module({
  imports: [
    DatabaseModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AdminController],
  providers: [PrismaService, JwtStrategy, EvoApiService],
})
export class AdminModule {}
