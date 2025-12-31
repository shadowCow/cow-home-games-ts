import { User } from "./User";

export interface AuthGateway {
  login(username: string, password: string): Promise<User>;
  logout(): Promise<void>;
}
