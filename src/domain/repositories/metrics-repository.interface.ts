import { StudyMetrics } from '../entities/study-metrics';

export interface IMetricsRepository {
  getMetricsForUser(userId: string, daysLimit: number): Promise<StudyMetrics>;
}
