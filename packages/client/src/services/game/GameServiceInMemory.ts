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

  async listGames(): Promise<Game[]> {
    return this.games;
  }

  async listGameSessions(): Promise<GameSession[]> {
    return this.sessions;
  }
}
