import { IUserRepository } from '../../domain/repositories/user-repository.interface';
import { User } from '../../domain/entities/user';
import * as bcrypt from 'bcrypt';

export interface UpdateProfileInput {
  name?: string;
  nickname?: string;
  password?: string;
  institutionId?: string;
  phone?: string;
}

export class UpdateProfileUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(userId: string, data: UpdateProfileInput): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updateData: Partial<User> = {};
    if (data.name !== undefined) {
      if (data.name.trim() === '') throw new Error('Name cannot be empty');
      updateData.name = data.name.trim();
    }
    if (data.nickname !== undefined) {
      if (data.nickname.trim() === '')
        throw new Error('Nickname cannot be empty');
      updateData.nickname = data.nickname.trim();
    }
    if (data.institutionId !== undefined)
      updateData.institutionId = data.institutionId;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.password !== undefined) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }

    return this.userRepository.update(userId, updateData);
  }
}
