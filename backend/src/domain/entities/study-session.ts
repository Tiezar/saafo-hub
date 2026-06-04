import type { CardReview } from './card-review';

export class StudySession {
  constructor(
    public readonly id: string,
    public userId: string,
    public startedAt: Date,
    public endedAt: Date | null,
    public reviews?: CardReview[],
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}
}
