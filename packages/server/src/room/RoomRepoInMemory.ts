import { RoomState, RoomsProjection } from '@cow-sunday/protocol';
import { RoomRepo } from './RoomRepo';

export class RoomRepoInMemory implements RoomRepo {
  private rooms: RoomState[] = [
    {
      id: 'room-1',
      owner: 'Alice',
      code: 'ABC123',
      guests: ['Bob', 'Charlie'],
      activeSession: { kind: 'RoomNoSession' },
    },
    {
      id: 'room-2',
      owner: 'Diana',
      code: 'DEF456',
      guests: [],
      activeSession: { kind: 'RoomNoSession' },
    },
    {
      id: 'room-3',
      owner: 'Eve',
      code: 'GHI789',
      guests: ['Frank', 'Grace', 'Henry'],
      activeSession: {
        kind: 'RoomSession',
        sessionId: 'session-123',
      },
    },
    {
      id: 'room-4',
      owner: 'Isaac',
      code: 'JKL012',
      guests: ['Jack'],
      activeSession: {
        kind: 'RoomSessionBuilder',
        builderId: 'builder-456',
      },
    },
    {
      id: 'room-5',
      owner: 'Kelly',
      code: 'MNO345',
      guests: ['Laura', 'Mike'],
      activeSession: { kind: 'RoomNoSession' },
    },
  ];

  async listRooms(): Promise<RoomsProjection> {
    // Convert full room objects to projection
    return {
      kind: 'RoomsProjection',
      rooms: this.rooms.map((room) => ({
        entityId: room.id,
        roomOwner: room.owner,
      })),
    };
  }

  async getRoom(id: string): Promise<RoomState | null> {
    const room = this.rooms.find((r) => r.id === id);
    return room || null;
  }
}
