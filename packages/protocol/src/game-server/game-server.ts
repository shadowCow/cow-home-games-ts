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
import { GameClientMessage } from "../game-client/game-client";

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
// Broadcast Callback
// ========================================

export type BroadcastCallback = (message: GameClientMessage, clientId: string) => void;

// ========================================
// Game Server
// ========================================

export type GameServer = {
  handleMessage(message: any): ValidationFailure | GameServerResponse;
  getState(): Readonly<GameServerState>;
  registerClient(clientId: string): void;
  unregisterClient(clientId: string): void;
  getConnectedClients(): string[];
  syncClient(clientId: string): void;
};

export type GameServerConfig = {
  onBroadcast?: BroadcastCallback;
};

export function createGameServer(config: GameServerConfig = {}): GameServer {
  const { onBroadcast } = config;
  const rooms = createRoomCollection();

  const state: GameServerState = {
    rooms,
  };

  // Track connected clients
  const connectedClients = new Set<string>();

  // Helper to broadcast to all clients
  const broadcast = (message: GameClientMessage): void => {
    if (!onBroadcast) return;

    for (const clientId of connectedClients) {
      onBroadcast(message, clientId);
    }
  };

  // Helper to send to specific client
  const sendToClient = (message: GameClientMessage, clientId: string): void => {
    if (!onBroadcast) return;
    onBroadcast(message, clientId);
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

          // If command succeeded, broadcast the event to all clients
          if (result.kind === "Ok") {
            const eventMessage: GameClientMessage = {
              kind: "RoomCollectionEvent",
              event: result.value,
            };
            broadcast(eventMessage);
          }

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

    registerClient(clientId: string): void {
      connectedClients.add(clientId);
    },

    unregisterClient(clientId: string): void {
      connectedClients.delete(clientId);
    },

    getConnectedClients(): string[] {
      return Array.from(connectedClients);
    },

    syncClient(clientId: string): void {
      // Serialize the current state as a snapshot
      const snapshot = state.rooms.getSnapshot();

      // Only send snapshot if there's state to sync (index > 0 or has entities)
      const hasState =
        snapshot.lastAppliedIndex > 0 || Object.keys(snapshot.state.entities).length > 0;

      if (!hasState) {
        return; // Client is already in sync with empty state
      }

      const serializedSnapshot = {
        entities: Object.fromEntries(
          Object.entries(snapshot.state.entities).map(([roomId, fst]) => [
            roomId,
            fst.getSnapshot(),
          ])
        ),
        lastAppliedIndex: snapshot.lastAppliedIndex,
      };

      const snapshotMessage: GameClientMessage = {
        kind: "RoomCollectionSnapshot",
        snapshot: serializedSnapshot,
      };

      sendToClient(snapshotMessage, clientId);
    },
  };
}
