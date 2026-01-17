import { RoomState, RoomsProjection } from '@cow-sunday/protocol';

export interface RoomRepo {
  listRooms(): Promise<RoomsProjection>;
  getRoom(id: string): Promise<RoomState | null>;
}
