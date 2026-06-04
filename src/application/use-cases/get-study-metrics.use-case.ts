import { IMetricsRepository } from '../../domain/repositories/metrics-repository.interface';
import { StudyMetrics } from '../../domain/entities/study-metrics';

export class GetStudyMetricsUseCase {
  constructor(private metricsRepository: IMetricsRepository) {}

  async execute(userId: string, daysLimit = 30): Promise<StudyMetrics> {
    return this.metricsRepository.getMetricsForUser(userId, daysLimit);
  }
}
