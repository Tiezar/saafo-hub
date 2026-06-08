import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PrismaService } from '../../database/prisma.service';

@Controller('pomodoro')
@UseGuards(JwtAuthGuard)
export class PomodoroController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('tracks')
  async getTracks() {
    return this.prisma.curatedTrack.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }
}
