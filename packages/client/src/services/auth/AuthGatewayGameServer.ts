import { jwtDecode } from "jwt-decode";
import { AuthGateway } from "./AuthGateway";
import { User } from "./User";

interface JwtPayload {
  username: string;
}

export class AuthGatewayGameServer implements AuthGateway {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  async login(username: string, password: string): Promise<User> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const { token } = await response.json();
    const decoded = jwtDecode<JwtPayload>(token);

    return {
      username: decoded.username,
    };
  }

  async logout(): Promise<void> {
    await fetch(`${this.baseUrl}/api/auth/logout`, {
      method: "POST",
    });
  }
}
