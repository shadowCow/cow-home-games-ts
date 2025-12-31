import { User } from './User';

export interface AuthGateway {
  login(username: string, password: string): Promise<{ token: string; user: User }>;
  logout(): Promise<void>;
}
