import { IUserRepository } from '../../domain/repositories/user-repository.interface';
import { User } from '../../domain/entities/user';
import * as bcrypt from 'bcrypt';

export interface UpdateProfileInput {
  name?: string;
  nickname?: string;
  password?: string;
  institution?: string;
}

export class UpdateProfileUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(userId: string, data: UpdateProfileInput): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updateData: Partial<User> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (data.institution !== undefined) updateData.institution = data.institution;
    if (data.password !== undefined) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }

    return this.userRepository.update(userId, updateData);
  }
}
