export class User {
  constructor(
    public readonly id: string,
    public email: string,
    public name: string,
    public nickname?: string | null,
    public googleId?: string | null,
    public passwordHash?: string | null,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}
}
