import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AIModule } from '../../ai/ai.module';
import { PlanGuard } from '../guards/plan.guard';
import { SubjectController } from '../controllers/subject.controller';
import { TopicController } from '../controllers/topic.controller';
import { CardController } from '../controllers/card.controller';
import { StudySessionController } from '../controllers/study-session.controller';
import { AiController } from '../controllers/ai.controller';
import { MetricsController } from '../controllers/metrics.controller';
import { ExamHistoryController } from '../controllers/exam-history.controller';

@Module({
  imports: [DatabaseModule, AIModule],
  controllers: [
    SubjectController,
    TopicController,
    CardController,
    StudySessionController,
    AiController,
    MetricsController,
    ExamHistoryController,
  ],
  providers: [PlanGuard],
})
export class MaterialsMemoryModule {}
