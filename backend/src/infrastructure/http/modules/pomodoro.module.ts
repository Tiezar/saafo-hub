import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { PomodoroController } from '../controllers/pomodoro.controller';
import { PrismaService } from '../../database/prisma.service';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [DatabaseModule, PassportModule],
  controllers: [PomodoroController],
  providers: [PrismaService, JwtStrategy],
})
export class PomodoroModule {}
