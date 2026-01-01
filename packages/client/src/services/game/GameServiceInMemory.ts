import { GameService } from "./GameService";
import { Game, GameSession } from "@cow-sunday/protocol";

export class GameServiceInMemory implements GameService {
  private games: Game[] = [
    { name: "Chess" },
    { name: "Checkers" },
    { name: "Go" },
    { name: "Poker" },
    { name: "Backgammon" },
  ];

  private sessions: GameSession[] = [];

  async listGames(): Promise<Game[]> {
    return this.games;
  }

  async listGameSessions(): Promise<GameSession[]> {
    return this.sessions;
  }

  async createGameSession(gameName: string): Promise<string> {
    // Generate a 6-digit code
    const id = Math.floor(100000 + Math.random() * 900000).toString();
    const session: GameSession = {
      id,
      game: { name: gameName },
    };
    this.sessions.push(session);
    return id;
  }

  async getGameSession(id: string): Promise<GameSession> {
    const session = this.sessions.find((s) => s.id === id);
    if (!session) {
      throw new Error(`Game session with id ${id} not found`);
    }
    return session;
  }
}
