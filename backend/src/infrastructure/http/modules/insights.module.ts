import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { PrismaService } from '../../database/prisma.service';
import { AIModule } from '../../ai/ai.module';
import { InsightsService } from '../../ai/insights.service';
import { InsightsController } from '../controllers/insights.controller';
import { PlanGuard } from '../guards/plan.guard';

@Module({
  imports: [DatabaseModule, AIModule],
  controllers: [InsightsController],
  providers: [InsightsService, PlanGuard, PrismaService],
})
export class InsightsModule {}
