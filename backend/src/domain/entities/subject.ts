export class Subject {
  constructor(
    public readonly id: string,
    public name: string,
    public color: string | null,
    public userId: string,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}
}
