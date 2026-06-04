import { IUserRepository } from '../../domain/repositories/user-repository.interface';
import { User } from '../../domain/entities/user';

export class LoginGoogleUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(payload: { email: string; name: string; googleId: string }): Promise<User> {
    let user = await this.userRepository.findByGoogleId(payload.googleId);
    
    if (!user) {
      user = await this.userRepository.findByEmail(payload.email);
      
      if (user) {
        user = await this.userRepository.update(user.id, { googleId: payload.googleId });
      } else {
        user = await this.userRepository.create({
          email: payload.email,
          name: payload.name,
          googleId: payload.googleId,
        });
      }
    }
    return user;
  }
}
