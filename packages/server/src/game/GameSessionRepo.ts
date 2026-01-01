import { GameSession } from '@cow-sunday/protocol';

export interface GameSessionRepo {
  listGameSessions(): Promise<GameSession[]>;
  createGameSession(gameName: string): Promise<string>;
  getGameSession(id: string): Promise<GameSession | null>;
}
