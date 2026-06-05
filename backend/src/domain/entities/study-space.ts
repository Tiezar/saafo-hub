export class StudySpace {
  constructor(
    public readonly id: string,
    public userId: string,
    public name: string,
    public color: string | null,
    public icon: string | null,
    public readonly createdAt?: Date,
  ) {}
}
