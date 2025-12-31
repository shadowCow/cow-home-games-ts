import { JWT } from '@fastify/jwt';
import { AuthGateway } from './AuthGateway';
import { User } from '../domain/User';
import { UserRepo } from '../user-repo/UserRepo';

export class AuthGatewayJwt implements AuthGateway {
  constructor(
    private jwt: JWT,
    private userRepo: UserRepo
  ) {}

  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const user = await this.userRepo.getUserByCredentials(username, password);

    if (!user) {
      throw new Error('Invalid username or password');
    }

    const token = this.jwt.sign({ username: user.username });

    return { token, user };
  }

  async logout(): Promise<void> {
    // No-op for now
  }
}
