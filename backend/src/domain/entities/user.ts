export class User {
  constructor(
    public readonly id: string,
    public email: string,
    public name: string,
    public nickname?: string | null,
    public googleId?: string | null,
    public passwordHash?: string | null,
    public institutionId?: string | null,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
    public emailVerified?: boolean,
    public phone?: string | null,
    public plan?: string,
    public trialEndsAt?: Date | null,
    public asaasCustomerId?: string | null,
    public asaasSubscriptionId?: string | null,
  ) {}

  get isActivePlan(): boolean {
    if (this.plan === 'STUDENT') return true;
    if (this.plan === 'FREE_TRIAL' && this.trialEndsAt && new Date() <= this.trialEndsAt) return true;
    return false;
  }

  get trialDaysLeft(): number {
    if (this.plan !== 'FREE_TRIAL' || !this.trialEndsAt) return 0;
    return Math.max(0, Math.ceil((this.trialEndsAt.getTime() - Date.now()) / 86_400_000));
  }
}
