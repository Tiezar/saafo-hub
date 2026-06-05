import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { PrismaService } from '../../database/prisma.service';
import { GeminiService } from '../../ai/gemini.service';
import { InsightsService } from '../../ai/insights.service';
import { InsightsController } from '../controllers/insights.controller';
import { PlanGuard } from '../guards/plan.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [InsightsController],
  providers: [GeminiService, InsightsService, PlanGuard, PrismaService],
})
export class InsightsModule {}
