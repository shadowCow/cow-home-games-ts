import { User } from '../domain/User';

export interface UserRepo {
  getUserByCredentials(username: string, password: string): Promise<User | null>;
}
