import { Game, GameSession, RoomState, RoomsProjection } from "@cow-sunday/protocol";
import { GameService } from "./GameService";

export class GameServiceGameServer implements GameService {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  async listGames(): Promise<Game[]> {
    const response = await fetch(`${this.baseUrl}/api/games`);

    if (!response.ok) {
      throw new Error(`Failed to fetch games: ${response.status}`);
    }

    return response.json();
  }

  async listGameSessions(): Promise<GameSession[]> {
    const response = await fetch(`${this.baseUrl}/api/game-sessions`);

    if (!response.ok) {
      throw new Error(`Failed to fetch game sessions: ${response.status}`);
    }

    return response.json();
  }

  async createGameSession(gameName: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/game-sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gameName }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create game session: ${response.status}`);
    }

    const data = await response.json();
    return data.sessionId;
  }

  async getGameSession(id: string): Promise<GameSession> {
    const response = await fetch(`${this.baseUrl}/api/game-sessions/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Game session with id ${id} not found`);
      }
      throw new Error(`Failed to fetch game session: ${response.status}`);
    }

    return response.json();
  }

  async listRooms(): Promise<RoomsProjection> {
    const response = await fetch(`${this.baseUrl}/api/rooms`);

    if (!response.ok) {
      throw new Error(`Failed to fetch rooms: ${response.status}`);
    }

    return response.json();
  }

  async getRoom(id: string): Promise<RoomState> {
    const response = await fetch(`${this.baseUrl}/api/rooms/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Room with id ${id} not found`);
      }
      throw new Error(`Failed to fetch room: ${response.status}`);
    }

    return response.json();
  }
}
