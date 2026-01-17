import { GameService } from "./GameService";
import { Game, GameSession, RoomState, RoomsProjection } from "@cow-sunday/protocol";

export class GameServiceInMemory implements GameService {
  private games: Game[] = [
    { name: "Tic Tac Toe" },
    { name: "Chess" },
    { name: "Checkers" },
    { name: "Go" },
    { name: "Poker" },
  ];

  private sessions: GameSession[] = [];

  private rooms: RoomState[] = [
    {
      id: "room-1",
      owner: "Alice",
      code: "ABC123",
      guests: ["Bob"],
      activeSession: { kind: "RoomNoSession" },
    },
    {
      id: "room-2",
      owner: "Charlie",
      code: "DEF456",
      guests: [],
      activeSession: { kind: "RoomNoSession" },
    },
  ];

  async listGames(): Promise<Game[]> {
    return this.games;
  }

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

  async getGameSession(id: string): Promise<GameSession> {
    const session = this.sessions.find((s) => s.id === id);
    if (!session) {
      throw new Error(`Game session with id ${id} not found`);
    }
    return session;
  }

  async listRooms(): Promise<RoomsProjection> {
    return {
      kind: "RoomsProjection",
      rooms: this.rooms.map((room) => ({
        entityId: room.id,
        roomOwner: room.owner,
      })),
    };
  }

  async getRoom(id: string): Promise<RoomState> {
    const room = this.rooms.find((r) => r.id === id);
    if (!room) {
      throw new Error(`Room with id ${id} not found`);
    }
    return room;
  }
}
