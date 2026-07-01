import { DeleteUserUseCase } from './delete-user.use-case';
import type { IUserRepository } from '../../domain/repositories/user-repository.interface';
import type { IPaymentService } from '../../domain/services/payment-service.interface';
import { User } from '../../domain/entities/user';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let userRepository: jest.Mocked<IUserRepository>;
  let paymentService: jest.Mocked<IPaymentService>;

  beforeEach(() => {
    userRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByGoogleId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      verifyEmail: jest.fn(),
      delete: jest.fn(),
    };

    paymentService = {
      cancelSubscription: jest.fn(),
    };

    useCase = new DeleteUserUseCase(userRepository, paymentService);
  });

  it('should delete user and cancel subscription when user has active subscription', async () => {
    const mockUser = new User(
      'user-1',
      'user@example.com',
      'User Name',
      null,
      null,
      'hash',
      null,
      new Date(),
      new Date(),
      true,
      null,
      'STUDENT',
      null,
      'customer-1',
      'sub-123',
    );
    userRepository.findById.mockResolvedValue(mockUser);
    paymentService.cancelSubscription.mockResolvedValue();
    userRepository.delete.mockResolvedValue();

    await useCase.execute('user-1');

    expect(userRepository.findById).toHaveBeenCalledWith('user-1');
    expect(paymentService.cancelSubscription).toHaveBeenCalledWith('sub-123');
    expect(userRepository.delete).toHaveBeenCalledWith('user-1');
  });

  it('should delete user directly without calling paymentService if no active subscription', async () => {
    const mockUser = new User(
      'user-2',
      'user2@example.com',
      'User Name 2',
      null,
      null,
      'hash',
      null,
      new Date(),
      new Date(),
      true,
      null,
      'FREE_TRIAL',
      null,
      null,
      null,
    );
    userRepository.findById.mockResolvedValue(mockUser);
    userRepository.delete.mockResolvedValue();

    await useCase.execute('user-2');

    expect(userRepository.findById).toHaveBeenCalledWith('user-2');
    expect(paymentService.cancelSubscription).not.toHaveBeenCalled();
    expect(userRepository.delete).toHaveBeenCalledWith('user-2');
  });

  it('should throw an error if user does not exist', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('user-invalid')).rejects.toThrow(
      'User not found',
    );
    expect(userRepository.delete).not.toHaveBeenCalled();
    expect(paymentService.cancelSubscription).not.toHaveBeenCalled();
  });
});
