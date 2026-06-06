import { SpacedRepetitionService } from './spaced-repetition.service';

describe('SpacedRepetitionService (SM-2 Algorithm)', () => {
  const baseDate = new Date('2026-06-04T12:00:00Z');

  it('should reset repetitions to 0 and interval to 1 when rating is below 3 (forgotten)', () => {
    // Rating = 2, previous repetitions = 5, previous interval = 12, previous EF = 2.5
    const result = SpacedRepetitionService.calculate(2, 5, 12, 2.5, baseDate);

    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
    expect(result.easeFactor).toBe(2.5); // Remains unchanged

    // nextReview should be +1 day normalized to 00:00:00 local time
    const expectedDate = new Date(baseDate);
    expectedDate.setDate(expectedDate.getDate() + 1);
    expectedDate.setHours(0, 0, 0, 0);
    expect(result.nextReview.getTime()).toBe(expectedDate.getTime());
  });

  it('should set interval to 1 and increment repetitions when rating >= 3 and repetitions is 0', () => {
    const result = SpacedRepetitionService.calculate(4, 0, 0, 2.5, baseDate);

    expect(result.repetitions).toBe(1);
    expect(result.interval).toBe(1);
    // EF for q=4: 2.5 + (0.1 - (5 - 4) * (0.08 + (5 - 4) * 0.02)) = 2.5 + (0.1 - 1 * 0.10) = 2.5
    expect(result.easeFactor).toBeCloseTo(2.5);

    const expectedDate = new Date(baseDate);
    expectedDate.setDate(expectedDate.getDate() + 1);
    expectedDate.setHours(0, 0, 0, 0);
    expect(result.nextReview.getTime()).toBe(expectedDate.getTime());
  });

  it('should set interval to 6 and increment repetitions when rating >= 3 and repetitions is 1', () => {
    const result = SpacedRepetitionService.calculate(5, 1, 1, 2.5, baseDate);

    expect(result.repetitions).toBe(2);
    expect(result.interval).toBe(6);
    // EF for q=5: 2.5 + (0.1 - (5 - 5) * ...) = 2.5 + 0.1 = 2.6
    expect(result.easeFactor).toBeCloseTo(2.6);

    const expectedDate = new Date(baseDate);
    expectedDate.setDate(expectedDate.getDate() + 6);
    expectedDate.setHours(0, 0, 0, 0);
    expect(result.nextReview.getTime()).toBe(expectedDate.getTime());
  });

  it('should calculate interval as round(prevInterval * EF) when rating >= 3 and repetitions > 1', () => {
    const result = SpacedRepetitionService.calculate(5, 2, 6, 2.6, baseDate);

    expect(result.repetitions).toBe(3);
    // interval = round(6 * 2.6) = round(15.6) = 16
    expect(result.interval).toBe(16);
    // EF for q=5: 2.6 + 0.1 = 2.7
    expect(result.easeFactor).toBeCloseTo(2.7);

    const expectedDate = new Date(baseDate);
    expectedDate.setDate(expectedDate.getDate() + 16);
    expectedDate.setHours(0, 0, 0, 0);
    expect(result.nextReview.getTime()).toBe(expectedDate.getTime());
  });

  it('should clamp easeFactor to 1.3 minimum', () => {
    // If rating is 3, easeFactor decreases: EF' = EF + (0.1 - 2 * (0.08 + 2 * 0.02)) = EF + (0.1 - 2 * 0.12) = EF - 0.14
    // Start with EF = 1.4, rating = 3. Expected EF = 1.4 - 0.14 = 1.26 -> clamped to 1.3
    const result = SpacedRepetitionService.calculate(3, 3, 10, 1.4, baseDate);

    expect(result.easeFactor).toBe(1.3);
  });
});
