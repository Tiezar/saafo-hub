import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaUserRepository } from './prisma-user.repository';
import { PrismaSubjectRepository } from './prisma-subject.repository';
import { PrismaTopicRepository } from './prisma-topic.repository';
import { PrismaCardRepository } from './prisma-card.repository';
import { PrismaStudySessionRepository } from './prisma-study-session.repository';
import { PrismaMetricsRepository } from './prisma-metrics.repository';

@Module({
  providers: [
    PrismaService,
    {
      provide: 'IUserRepository',
      useClass: PrismaUserRepository,
    },
    {
      provide: 'ISubjectRepository',
      useClass: PrismaSubjectRepository,
    },
    {
      provide: 'ITopicRepository',
      useClass: PrismaTopicRepository,
    },
    {
      provide: 'ICardRepository',
      useClass: PrismaCardRepository,
    },
    {
      provide: 'IStudySessionRepository',
      useClass: PrismaStudySessionRepository,
    },
    {
      provide: 'IMetricsRepository',
      useClass: PrismaMetricsRepository,
    },
  ],
  exports: [
    PrismaService,
    'IUserRepository',
    'ISubjectRepository',
    'ITopicRepository',
    'ICardRepository',
    'IStudySessionRepository',
    'IMetricsRepository',
  ],
})
export class DatabaseModule {}
