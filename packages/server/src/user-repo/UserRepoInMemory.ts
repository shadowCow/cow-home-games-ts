import { UserRepo } from './UserRepo';
import { User } from '../domain/User';

type StoredUser = {
  username: string;
  password: string;
};

export class UserRepoInMemory implements UserRepo {
  private users: StoredUser[] = [
    { username: 'test', password: 'test' },
  ];

  async getUserByCredentials(username: string, password: string): Promise<User | null> {
    const storedUser = this.users.find(
      (u) => u.username === username && u.password === password
    );

    if (!storedUser) {
      return null;
    }

    return {
      username: storedUser.username,
    };
  }
}
