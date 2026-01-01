import { GameSession } from "@cow-sunday/protocol";

export interface GameService {
  listGameSessions(): Promise<GameSession[]>;
}
