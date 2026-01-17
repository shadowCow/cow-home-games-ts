import { Game, GameSession, RoomState, RoomsProjection } from "@cow-sunday/protocol";

export interface GameService {
  listGames(): Promise<Game[]>;
  listGameSessions(): Promise<GameSession[]>;
  createGameSession(gameName: string): Promise<string>;
  getGameSession(id: string): Promise<GameSession>;
  listRooms(): Promise<RoomsProjection>;
  getRoom(id: string): Promise<RoomState>;
}
