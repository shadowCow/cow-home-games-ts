import { Game } from '@cow-sunday/protocol';
import { GameRepo } from './GameRepo';

export class GameRepoInMemory implements GameRepo {
  private games: Game[] = [
    { name: 'Chess' },
    { name: 'Checkers' },
    { name: 'Go' },
    { name: 'Poker' },
    { name: 'Backgammon' },
  ];

  async listGames(): Promise<Game[]> {
    return this.games;
  }
}
