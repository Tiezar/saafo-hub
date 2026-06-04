import { UpdateProfileUseCase } from './update-profile.use-case';
import { IUserRepository } from '../../domain/repositories/user-repository.interface';
import { User } from '../../domain/entities/user';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UpdateProfileUseCase', () => {
  let useCase: UpdateProfileUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByGoogleId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    useCase = new UpdateProfileUseCase(mockUserRepository);
    jest.clearAllMocks();
  });

  it('should throw an error if user is not found', async () => {
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('1', { name: 'Updated Name' }),
    ).rejects.toThrow('User not found');
    expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });

  it('should update name and nickname but not hash password if password is not provided', async () => {
    const existingUser = new User(
      '1',
      'test@example.com',
      'Old Name',
      'oldnick',
      null,
      'hash',
    );
    const updatedUser = new User(
      '1',
      'test@example.com',
      'New Name',
      'newnick',
      null,
      'hash',
    );
    mockUserRepository.findById.mockResolvedValue(existingUser);
    mockUserRepository.update.mockResolvedValue(updatedUser);

    const result = await useCase.execute('1', {
      name: 'New Name',
      nickname: 'newnick',
    });

    expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
    expect(mockUserRepository.update).toHaveBeenCalledWith('1', {
      name: 'New Name',
      nickname: 'newnick',
    });
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(result).toEqual(updatedUser);
  });

  it('should update password and hash it when password is provided', async () => {
    const existingUser = new User(
      '1',
      'test@example.com',
      'Name',
      null,
      null,
      'oldhash',
    );
    const updatedUser = new User(
      '1',
      'test@example.com',
      'Name',
      null,
      null,
      'newhash',
    );
    mockUserRepository.findById.mockResolvedValue(existingUser);
    mockUserRepository.update.mockResolvedValue(updatedUser);
    (bcrypt.hash as jest.Mock).mockResolvedValue('newhash');

    const result = await useCase.execute('1', { password: 'secretpassword' });

    expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
    expect(bcrypt.hash).toHaveBeenCalledWith('secretpassword', 12);
    expect(mockUserRepository.update).toHaveBeenCalledWith('1', {
      passwordHash: 'newhash',
    });
    expect(result).toEqual(updatedUser);
  });

  it('should update institution when institution is provided', async () => {
    const existingUser = new User(
      '1',
      'test@example.com',
      'Name',
      null,
      null,
      'hash',
      null,
    );
    const updatedUser = new User(
      '1',
      'test@example.com',
      'Name',
      null,
      null,
      'hash',
      'Universidade de São Paulo',
    );
    mockUserRepository.findById.mockResolvedValue(existingUser);
    mockUserRepository.update.mockResolvedValue(updatedUser);

    const result = await useCase.execute('1', { institution: 'Universidade de São Paulo' });

    expect(mockUserRepository.findById).toHaveBeenCalledWith('1');
    expect(mockUserRepository.update).toHaveBeenCalledWith('1', {
      institution: 'Universidade de São Paulo',
    });
    expect(result).toEqual(updatedUser);
  });
});
