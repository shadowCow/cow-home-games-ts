import { z } from "zod";
import { Result } from "@cow-sunday/fp-ts";
import { IndexedEvent, Snapshot, SyncError } from "../fst/fst";
import {
  createRoomCollectionFollower,
  RoomCollectionEvent,
  RoomCollectionFollowerState,
  RoomCollectionFstFollower,
} from "../room/room-collection";
import { ValidationFailure } from "../common/validation";
import { RoomState, createRoomFollower } from "../room/room";

// ========================================
// Game Client Messages (Server → Client)
// ========================================

const RoomCollectionEventMessage = z.object({
  kind: z.literal("RoomCollectionEvent"),
  event: IndexedEvent(RoomCollectionEvent),
});

const RoomCollectionSnapshotMessage = z.object({
  kind: z.literal("RoomCollectionSnapshot"),
  snapshot: z.object({
    entities: z.record(z.string(), Snapshot(RoomState)),
    lastAppliedIndex: z.number(),
  }),
});

export const GameClientMessage = z.discriminatedUnion("kind", [
  RoomCollectionEventMessage,
  RoomCollectionSnapshotMessage,
]);

export type GameClientMessage = z.infer<typeof GameClientMessage>;

// ========================================
// Game Client State
// ========================================

export type GameClientState = {
  rooms: RoomCollectionFstFollower;
};

// ========================================
// Game Client Interface
// ========================================

export type GameClient = {
  getState(): Readonly<GameClientState>;
  handleMessage(message: any): ValidationFailure | Result<void, SyncError>;
};

// ========================================
// Game Client Factory
// ========================================

export function createGameClient(): GameClient {
  const rooms = createRoomCollectionFollower();

  return {
    getState: function (): Readonly<GameClientState> {
      return { rooms };
    },

    handleMessage: function (message: any): ValidationFailure | Result<void, SyncError> {
      // Validate message
      const parseResult = GameClientMessage.safeParse(message);

      if (!parseResult.success) {
        return {
          kind: "ValidationFailure",
          message: "Invalid message format",
        };
      }

      const validatedMessage = parseResult.data;

      // Handle different message types
      switch (validatedMessage.kind) {
        case "RoomCollectionEvent": {
          // Apply event to rooms follower
          return rooms.applyEvent(validatedMessage.event);
        }

        case "RoomCollectionSnapshot": {
          // Deserialize snapshot and apply to rooms follower
          const deserializedSnapshot = deserializeRoomCollectionSnapshot(validatedMessage.snapshot);
          return rooms.applySnapshot(deserializedSnapshot);
        }
      }
    },
  };
}

// ========================================
// Snapshot Serialization Helpers
// ========================================

type SerializedRoomCollectionSnapshot = {
  entities: Record<string, Snapshot<RoomState>>;
  lastAppliedIndex: number;
};

function deserializeRoomCollectionSnapshot(
  serialized: SerializedRoomCollectionSnapshot
): Snapshot<RoomCollectionFollowerState> {
  return {
    state: {
      entities: Object.fromEntries(
        Object.entries(serialized.entities).map(([id, entitySnapshot]) => {
          // Create follower and restore its index by applying the snapshot
          const follower = createRoomFollower(entitySnapshot.state);

          // Apply snapshot to restore the correct lastAppliedIndex
          if (entitySnapshot.lastAppliedIndex > 0) {
            follower.applySnapshot(entitySnapshot);
          }

          return [id, follower];
        })
      ),
    },
    lastAppliedIndex: serialized.lastAppliedIndex,
  };
}
