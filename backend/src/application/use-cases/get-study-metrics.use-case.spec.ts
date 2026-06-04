import { GetStudyMetricsUseCase } from './get-study-metrics.use-case';
import { IMetricsRepository } from '../../domain/repositories/metrics-repository.interface';
import {
  StudyMetrics,
  DailyActivity,
  ForecastDay,
  SubjectPerformance,
} from '../../domain/entities/study-metrics';

describe('GetStudyMetricsUseCase', () => {
  let useCase: GetStudyMetricsUseCase;
  let metricsRepository: jest.Mocked<IMetricsRepository>;

  const mockMetrics = new StudyMetrics(
    'user-id-123',
    10, // totalCards
    85.5, // retentionRate
    4.2, // averageRating
    4, // matureCardsCount
    4, // learningCardsCount
    2, // newCardsCount
    [new DailyActivity('2026-06-04', 15)],
    [new ForecastDay('2026-06-05', 5)],
    [new SubjectPerformance('sub-1', 'Constitucional', '#ff0000', 10, 85.5)],
  );

  beforeEach(() => {
    metricsRepository = {
      getMetricsForUser: jest.fn().mockResolvedValue(mockMetrics),
    };

    useCase = new GetStudyMetricsUseCase(metricsRepository);
  });

  it('deve chamar o repositório com o userId e limite de dias padrão e retornar as métricas', async () => {
    const result = await useCase.execute('user-id-123');

    expect(metricsRepository.getMetricsForUser).toHaveBeenCalledWith(
      'user-id-123',
      30,
    );
    expect(result).toBe(mockMetrics);
  });

  it('deve chamar o repositório com o limite de dias customizado especificado', async () => {
    const result = await useCase.execute('user-id-123', 7);

    expect(metricsRepository.getMetricsForUser).toHaveBeenCalledWith(
      'user-id-123',
      7,
    );
    expect(result).toBe(mockMetrics);
  });
});
