import { LoginGoogleUseCase } from './login-google.use-case';
import { IUserRepository } from '../../domain/repositories/user-repository.interface';
import { User } from '../../domain/entities/user';

describe('LoginGoogleUseCase', () => {
  let useCase: LoginGoogleUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByGoogleId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    useCase = new LoginGoogleUseCase(mockUserRepository);
  });

  it('should return user if user exists with googleId', async () => {
    const existingUser = new User(
      '1',
      'test@example.com',
      'Test User',
      null,
      'google-123',
      null,
    );
    mockUserRepository.findByGoogleId.mockResolvedValue(existingUser);

    const result = await useCase.execute({
      email: 'test@example.com',
      name: 'Test User',
      googleId: 'google-123',
    });

    expect(mockUserRepository.findByGoogleId).toHaveBeenCalledWith(
      'google-123',
    );
    expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    expect(result).toEqual(existingUser);
  });

  it('should update user with googleId if user exists with email but not googleId', async () => {
    const existingUser = new User(
      '1',
      'test@example.com',
      'Test User',
      null,
      null,
      null,
    );
    const updatedUser = new User(
      '1',
      'test@example.com',
      'Test User',
      null,
      'google-123',
      null,
    );
    mockUserRepository.findByGoogleId.mockResolvedValue(null);
    mockUserRepository.findByEmail.mockResolvedValue(existingUser);
    mockUserRepository.update.mockResolvedValue(updatedUser);

    const result = await useCase.execute({
      email: 'test@example.com',
      name: 'Test User',
      googleId: 'google-123',
    });

    expect(mockUserRepository.findByGoogleId).toHaveBeenCalledWith(
      'google-123',
    );
    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
      'test@example.com',
    );
    expect(mockUserRepository.update).toHaveBeenCalledWith('1', {
      googleId: 'google-123',
    });
    expect(result).toEqual(updatedUser);
  });

  it('should create new user if user does not exist by googleId or email', async () => {
    const newUser = new User(
      '1',
      'new@example.com',
      'New User',
      null,
      'google-123',
      null,
    );
    mockUserRepository.findByGoogleId.mockResolvedValue(null);
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.create.mockResolvedValue(newUser);

    const result = await useCase.execute({
      email: 'new@example.com',
      name: 'New User',
      googleId: 'google-123',
    });

    expect(mockUserRepository.findByGoogleId).toHaveBeenCalledWith(
      'google-123',
    );
    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
      'new@example.com',
    );
    expect(mockUserRepository.create).toHaveBeenCalledWith({
      email: 'new@example.com',
      name: 'New User',
      googleId: 'google-123',
    });
    expect(result).toEqual(newUser);
  });
});
