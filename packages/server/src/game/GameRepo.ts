import { Game } from '@cow-sunday/protocol';

export interface GameRepo {
  listGames(): Promise<Game[]>;
}
