import { readFile } from 'fs/promises';
import { UserRepo } from './UserRepo';
import { User } from '../domain/User';

type StoredUser = {
  username: string;
  password: string;
};

export class UserRepoFs implements UserRepo {
  private readonly filePath = '/var/lib/cow-home-games-ts/users.json';

  async getUserByCredentials(username: string, password: string): Promise<User | null> {
    try {
      const fileContent = await readFile(this.filePath, 'utf-8');
      const users: StoredUser[] = JSON.parse(fileContent);

      const storedUser = users.find(
        (u) => u.username === username && u.password === password
      );

      if (!storedUser) {
        return null;
      }

      return {
        username: storedUser.username,
      };
    } catch (error) {
      // Log error but don't crash - return null for invalid credentials
      console.error('Error reading users file:', error);
      return null;
    }
  }
}
