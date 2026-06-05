import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Inject,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GetStudyMetricsUseCase } from '../../../application/use-cases/get-study-metrics.use-case';
import type { IMetricsRepository } from '../../../domain/repositories/metrics-repository.interface';

@Controller('metrics')
@UseGuards(JwtAuthGuard)
export class MetricsController {
  private getStudyMetricsUseCase: GetStudyMetricsUseCase;

  constructor(
    @Inject('IMetricsRepository') private metricsRepository: IMetricsRepository,
  ) {
    this.getStudyMetricsUseCase = new GetStudyMetricsUseCase(metricsRepository);
  }

  @Get()
  async getMetrics(@Request() req: any, @Query('days') days?: string) {
    const parsed = days ? parseInt(days, 10) : 30;
    const daysLimit = Number.isNaN(parsed) || parsed < 1 ? 30 : Math.min(parsed, 365);
    return await this.getStudyMetricsUseCase.execute(req.user.id, daysLimit);
  }
}
