import { Game, GameSession } from "@cow-sunday/protocol";

export interface GameService {
  listGames(): Promise<Game[]>;
  listGameSessions(): Promise<GameSession[]>;
}
