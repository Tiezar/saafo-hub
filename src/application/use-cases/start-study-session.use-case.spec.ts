import { StartStudySessionUseCase } from './start-study-session.use-case';
import type { IStudySessionRepository } from '../../domain/repositories/study-session-repository.interface';
import { StudySession } from '../../domain/entities/study-session';

describe('StartStudySessionUseCase', () => {
  let useCase: StartStudySessionUseCase;
  let repository: jest.Mocked<IStudySessionRepository>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
    } as any;
    useCase = new StartStudySessionUseCase(repository);
  });

  it('should start a study session successfully', async () => {
    const mockSession = new StudySession(
      'session-1',
      'user-1',
      new Date(),
      null,
    );
    repository.create.mockResolvedValue(mockSession);

    const result = await useCase.execute('user-1');

    expect(result).toBe(mockSession);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        endedAt: null,
      }),
    );
  });
});
