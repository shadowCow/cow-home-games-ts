import { z } from "zod";
import { Result } from "@cow-sunday/fp-ts";
import {
  createRoomCollection,
  RoomCollectionCommand,
  RoomCollectionEvent,
  RoomCollectionError,
  RoomCollectionFst,
} from "../room/room-collection";

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
  result: Result<RoomCollectionEvent, RoomCollectionError>;
};

export type GameServerResponse = RoomCollectionResponse;

// ========================================
// Game Server Validation Error
// ========================================

export type ValidationError = {
  kind: "ValidationError";
  errors: z.ZodError;
};

// ========================================
// Game Server State
// ========================================

export type GameServerState = {
  rooms: RoomCollectionFst;
};

// ========================================
// Game Server
// ========================================

export type GameServer = {
  handleMessage(message: any): ValidationError | GameServerResponse;
  getState(): Readonly<GameServerState>;
};

export function createGameServer(): GameServer {
  const rooms = createRoomCollection();

  const state: GameServerState = {
    rooms,
  };

  return {
    handleMessage(message: any): ValidationError | GameServerResponse {
      // Validate message with Zod
      const parseResult = GameServerMessage.safeParse(message);

      if (!parseResult.success) {
        return {
          kind: "ValidationError",
          errors: parseResult.error,
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
