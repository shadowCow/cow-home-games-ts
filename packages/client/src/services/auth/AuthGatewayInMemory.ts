import { AuthGateway } from "./AuthGateway";
import { User } from "./User";

type StoredUser = {
  username: string;
  password: string;
};

export class AuthGatewayInMemory implements AuthGateway {
  private validUsers: StoredUser[] = [
    { username: "test", password: "test" },
    { username: "super", password: "super" },
  ];

  async login(username: string, password: string): Promise<User> {
    const user = this.validUsers.find(
      (u) => u.username === username && u.password === password
    );

    if (!user) {
      throw new Error("Invalid username or password");
    }

    return {
      username: user.username,
    };
  }

  async logout(): Promise<void> {
    // No-op for in-memory implementation
  }
}
