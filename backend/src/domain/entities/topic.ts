export class Topic {
  constructor(
    public readonly id: string,
    public name: string,
    public subjectId: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}
}
