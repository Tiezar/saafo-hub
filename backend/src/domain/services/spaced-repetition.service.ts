export class SpacedRepetitionService {
  /**
   * Calculates the next review date and parameters using the SM-2 algorithm.
   * @param rating User rating from 0 to 5
   * @param previousRepetitions Number of consecutive successful repetitions
   * @param previousInterval Previous interval in days
   * @param previousEaseFactor Previous ease factor (EF)
   * @param now Optional date representing the current time
   */
  public static calculate(
    rating: number,
    previousRepetitions: number,
    previousInterval: number,
    previousEaseFactor: number,
    now: Date = new Date(),
  ): {
    repetitions: number;
    interval: number;
    easeFactor: number;
    nextReview: Date;
  } {
    // Clamping rating between 0 and 5
    const q = Math.max(0, Math.min(5, Math.round(rating)));

    let repetitions = previousRepetitions;
    let interval = previousInterval;
    let easeFactor = previousEaseFactor;

    if (q < 3) {
      // User forgot/got it wrong
      repetitions = 0;
      interval = 1; // 1 day
      // easeFactor remains unchanged in standard SM-2 when rating < 3
    } else {
      // User got it right
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(previousInterval * previousEaseFactor);
      }

      // Calculate new ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
      const efChange = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
      easeFactor = previousEaseFactor + efChange;

      // Increment repetitions count
      repetitions += 1;
    }

    // Ease Factor cannot fall below 1.3
    if (easeFactor < 1.3) {
      easeFactor = 1.3;
    }

    const nextReview = new Date(now);
    nextReview.setDate(nextReview.getDate() + interval);

    return {
      repetitions,
      interval,
      easeFactor,
      nextReview,
    };
  }
}
