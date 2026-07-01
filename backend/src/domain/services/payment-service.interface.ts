export interface IPaymentService {
  cancelSubscription(subscriptionId: string): Promise<void>;
}
