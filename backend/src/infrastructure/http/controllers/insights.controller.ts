import {
  Controller,
  Get,
  Delete,
  Req,
  Inject,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PlanGuard } from '../guards/plan.guard';
import { InsightsService } from '../../ai/insights.service';
import type { IUserRepository } from '../../../domain/repositories/user-repository.interface';

@Controller('insights')
@UseGuards(JwtAuthGuard, PlanGuard)
export class InsightsController {
  constructor(
    private readonly insightsService: InsightsService,
    @Inject('IUserRepository') private readonly userRepository: IUserRepository,
  ) {}

  @Get()
  async getInsights(@Req() req: any) {
    const user = await this.userRepository.findById(req.user.id);
    if (!user) throw new NotFoundException();
    return this.insightsService.getInsights(req.user.id, user.name);
  }

  /** Força atualização do cache de insights */
  @Delete('cache')
  async invalidateCache(@Req() req: any) {
    await this.insightsService.invalidateCache(req.user.id);
    const user = await this.userRepository.findById(req.user.id);
    if (!user) throw new NotFoundException();
    return this.insightsService.getInsights(req.user.id, user.name);
  }
}
