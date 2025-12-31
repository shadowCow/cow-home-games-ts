import { JWT } from '@fastify/jwt';
import { AuthGateway } from './AuthGateway';
import { User } from './User';

type StoredUser = {
  username: string;
  password: string;
};

export class AuthGatewayJwt implements AuthGateway {
  private validUsers: StoredUser[] = [
    { username: 'test', password: 'test' },
  ];

  constructor(private jwt: JWT) {}

  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const storedUser = this.validUsers.find(
      (u) => u.username === username && u.password === password
    );

    if (!storedUser) {
      throw new Error('Invalid username or password');
    }

    const user: User = {
      username: storedUser.username,
    };

    const token = this.jwt.sign({ username: user.username });

    return { token, user };
  }

  async logout(): Promise<void> {
    // No-op for now
  }
}
