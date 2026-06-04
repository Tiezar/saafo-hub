import { User } from '../entities/user';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  findByGoogleId(googleId: string): Promise<User | null>;
  create(user: Partial<User>): Promise<User>;
  update(id: string, user: Partial<User>): Promise<User>;
}
