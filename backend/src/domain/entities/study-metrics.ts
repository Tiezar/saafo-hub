export class DailyActivity {
  constructor(
    public readonly date: string, // Formato "YYYY-MM-DD"
    public readonly count: number,
  ) {}
}

export class ForecastDay {
  constructor(
    public readonly date: string, // Formato "YYYY-MM-DD"
    public readonly count: number,
  ) {}
}

export class SubjectPerformance {
  constructor(
    public readonly subjectId: string,
    public readonly subjectName: string,
    public readonly subjectColor: string | null,
    public readonly totalCards: number,
    public readonly retentionRate: number, // 0 a 100
  ) {}
}

export class StudyMetrics {
  constructor(
    public readonly userId: string,
    public readonly totalCards: number,
    public readonly retentionRate: number, // 0 a 100
    public readonly averageRating: number, // 0 a 5
    public readonly matureCardsCount: number,
    public readonly learningCardsCount: number,
    public readonly newCardsCount: number,
    public readonly dailyActivity: DailyActivity[],
    public readonly forecast: ForecastDay[],
    public readonly subjectsPerformance: SubjectPerformance[],
    public readonly totalReviewed: number = 0,
  ) {}
}
