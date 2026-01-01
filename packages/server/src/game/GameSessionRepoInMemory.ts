import { GameSession } from '@cow-sunday/protocol';
import { GameSessionRepo } from './GameSessionRepo';

export class GameSessionRepoInMemory implements GameSessionRepo {
  private sessions: GameSession[] = [];

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

  async getGameSession(id: string): Promise<GameSession | null> {
    const session = this.sessions.find((s) => s.id === id);
    return session || null;
  }
}
