import { IUserRepository } from '../../domain/repositories/user-repository.interface';
import { IPaymentService } from '../../domain/services/payment-service.interface';
import { ResourceNotFoundException } from '../../domain/exceptions/resource-not-found.exception';

export class DeleteUserUseCase {
  constructor(
    private userRepository: IUserRepository,
    private paymentService: IPaymentService,
  ) {}

  async execute(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new ResourceNotFoundException('User not found');
    }

    if (user.asaasSubscriptionId) {
      await this.paymentService.cancelSubscription(user.asaasSubscriptionId);
    }

    await this.userRepository.delete(userId);
  }
}
