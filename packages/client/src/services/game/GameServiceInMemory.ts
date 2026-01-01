import { GameService } from "./GameService";
import { GameSession } from "@cow-sunday/protocol";

export class GameServiceInMemory implements GameService {
  private sessions: GameSession[] = [
    {
      id: "session-1",
      game: { name: "Chess" },
    },
    {
      id: "session-2",
      game: { name: "Checkers" },
    },
    {
      id: "session-3",
      game: { name: "Go" },
    },
  ];

  async listGameSessions(): Promise<GameSession[]> {
    return this.sessions;
  }
}
