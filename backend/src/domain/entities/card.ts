export class Card {
  constructor(
    public readonly id: string,
    public front: string,
    public back: string,
    public topicId: string,
    public userId: string,
    public repetitions: number,
    public interval: number, // em dias
    public easeFactor: number,
    public nextReview: Date,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}
}
