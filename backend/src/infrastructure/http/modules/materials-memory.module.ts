import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { GeminiService } from '../../ai/gemini.service';
import { SubjectController } from '../controllers/subject.controller';
import { TopicController } from '../controllers/topic.controller';
import { CardController } from '../controllers/card.controller';
import { StudySessionController } from '../controllers/study-session.controller';
import { AiController } from '../controllers/ai.controller';
import { MetricsController } from '../controllers/metrics.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [
    SubjectController,
    TopicController,
    CardController,
    StudySessionController,
    AiController,
    MetricsController,
  ],
  providers: [GeminiService],
})
export class MaterialsMemoryModule {}
