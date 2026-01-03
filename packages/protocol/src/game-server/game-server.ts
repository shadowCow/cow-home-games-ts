import { z } from "zod";
import { Result } from "@cow-sunday/fp-ts";
import {
  createRoomCollection,
  RoomCollectionCommand,
  RoomCollectionEvent,
  RoomCollectionError,
  RoomCollectionFstLeader,
} from "../room/room-collection";
import { ValidationFailure } from "../common/validation";
import { IndexedEvent } from "../fst/fst";

// ========================================
// Game Server Message Schema
// ========================================

export const GameServerMessage = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("RoomCollectionCommand"),
    command: RoomCollectionCommand,
  }),
]);

export type GameServerMessage = z.infer<typeof GameServerMessage>;

// ========================================
// Game Server Response Types
// ========================================

export type RoomCollectionResponse = {
  kind: "RoomCollectionResponse";
  result: Result<IndexedEvent<RoomCollectionEvent>, RoomCollectionError>;
};

export type GameServerResponse = RoomCollectionResponse;

// ========================================
// Game Server State
// ========================================

export type GameServerState = {
  rooms: RoomCollectionFstLeader;
};

// ========================================
// Game Server
// ========================================

export type GameServer = {
  handleMessage(message: any): ValidationFailure | GameServerResponse;
  getState(): Readonly<GameServerState>;
};

export function createGameServer(): GameServer {
  const rooms = createRoomCollection();

  const state: GameServerState = {
    rooms,
  };

  return {
    handleMessage(message: any): ValidationFailure | GameServerResponse {
      // Validate message with Zod
      const parseResult = GameServerMessage.safeParse(message);

      if (!parseResult.success) {
        return {
          kind: "ValidationFailure",
          message: parseResult.error.message,
        };
      }

      const validatedMessage = parseResult.data;

      // Route message to appropriate FST
      switch (validatedMessage.kind) {
        case "RoomCollectionCommand": {
          const result = state.rooms.handleCommand(validatedMessage.command);
          return {
            kind: "RoomCollectionResponse",
            result,
          };
        }
      }
    },

    getState(): Readonly<GameServerState> {
      return state;
    },
  };
}
