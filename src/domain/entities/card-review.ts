export class CardReview {
  constructor(
    public readonly id: string,
    public cardId: string,
    public sessionId: string,
    public rating: number, // 0 a 5
    public reviewedAt: Date,
  ) {}
}
