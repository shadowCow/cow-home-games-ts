import { Game } from '@cow-sunday/protocol';
import { GameRepo } from './GameRepo';

export class GameRepoInMemory implements GameRepo {
  private games: Game[] = [
    { name: 'Tic Tac Toe' },
    { name: 'Chess' },
    { name: 'Checkers' },
    { name: 'Go' },
    { name: 'Poker' },
  ];

  async listGames(): Promise<Game[]> {
    return this.games;
  }
}
