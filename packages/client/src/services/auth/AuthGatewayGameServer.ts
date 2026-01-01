import { jwtDecode } from "jwt-decode";
import {
  LoginCommand,
  UserLoggedIn,
  InvalidLogin,
  LogoutCommand,
  UserLoggedOut,
  ValidationFailure,
} from "@cow-sunday/protocol";
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
    const command: LoginCommand = {
      kind: "LoginCommand",
      username,
      password,
    };

    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      const body = await response.json();

      // Handle validation errors (400)
      if (response.status === 400) {
        const result = ValidationFailure.safeParse(body);
        if (result.success) {
          throw new Error(`Validation error: ${result.data.message}`);
        }
        throw new Error("Validation failed with unexpected response format");
      }

      // Handle authentication errors (401)
      if (response.status === 401) {
        const result = InvalidLogin.safeParse(body);
        if (result.success) {
          throw new Error(result.data.error);
        }
        throw new Error("Authentication failed with unexpected response format");
      }

      // Handle other errors
      throw new Error(`Login failed with status ${response.status}`);
    }

    const body = await response.json();
    const result = UserLoggedIn.safeParse(body);

    if (!result.success) {
      throw new Error("Login succeeded but received unexpected response format");
    }

    const event = result.data;
    const decoded = jwtDecode<JwtPayload>(event.token);

    return {
      username: decoded.username,
    };
  }

  async logout(): Promise<void> {
    const command: LogoutCommand = {
      kind: "LogoutCommand",
    };

    const response = await fetch(`${this.baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      const body = await response.json();

      // Handle validation errors (400)
      if (response.status === 400) {
        const result = ValidationFailure.safeParse(body);
        if (result.success) {
          throw new Error(`Validation error: ${result.data.message}`);
        }
        throw new Error("Validation failed with unexpected response format");
      }

      // Handle other errors
      throw new Error(`Logout failed with status ${response.status}`);
    }

    const body = await response.json();
    const result = UserLoggedOut.safeParse(body);

    if (!result.success) {
      throw new Error("Logout succeeded but received unexpected response format");
    }
  }
}
