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
import { IndexedEvent, Snapshot } from "../fst/fst";
import { RoomsProjection } from "../room/rooms-projection";

// ========================================
// Game Server Message Schema
// ========================================

// Subscription messages from client to server
export const SubscribeRooms = z.object({
  kind: z.literal("SubscribeRooms"),
  clientId: z.string(),
});

export type SubscribeRooms = z.infer<typeof SubscribeRooms>;

export const UnsubscribeRooms = z.object({
  kind: z.literal("UnsubscribeRooms"),
  clientId: z.string(),
});

export type UnsubscribeRooms = z.infer<typeof UnsubscribeRooms>;

// Combined message type that server can receive from clients
export const GameServerIncomingMessage = z.discriminatedUnion("kind", [
  RoomCollectionCommand,
  SubscribeRooms,
  UnsubscribeRooms,
]);

export type GameServerIncomingMessage = z.infer<
  typeof GameServerIncomingMessage
>;

// Messages that server can send to clients (for RoomsProjection sync)
// These are IndexedEvent and Snapshot directly
export const GameServerOutgoingMessage = z.discriminatedUnion("kind", [
  IndexedEvent(z.any()), // CollectionEvent<RoomState, RoomEvent>
  Snapshot(RoomsProjection),
]);

export type GameServerOutgoingMessage = z.infer<
  typeof GameServerOutgoingMessage
>;

// ========================================
// Game Server Response Types
// ========================================

export type RoomCollectionResponse = {
  kind: "RoomCollectionResponse";
  result: Result<IndexedEvent<RoomCollectionEvent>, RoomCollectionError>;
};

export type SubscribeRoomsAccepted = {
  kind: "SubscribeRoomsAccepted";
  clientId: string;
};

export type SubscribeRoomsRejected = {
  kind: "SubscribeRoomsRejected";
  clientId: string;
  message: string;
};

export type GameServerResponse =
  | RoomCollectionResponse
  | SubscribeRoomsAccepted
  | SubscribeRoomsRejected;

// ========================================
// Game Server State
// ========================================

export type GameServerState = {
  rooms: RoomCollectionFstLeader;
};

// ========================================
// Broadcast Callback
// ========================================

export type BroadcastCallback = (
  message: GameServerOutgoingMessage,
  clientId: string
) => void;

// ========================================
// Game Server
// ========================================

export type GameServer = {
  handleMessage(message: any): ValidationFailure | GameServerResponse;
  getState(): Readonly<GameServerState>;
  getConnectedClients(): string[];
};

export type GameServerConfig = {
  onBroadcast?: BroadcastCallback;
  maxSubscribers: number;
};

export function createGameServer(config: GameServerConfig): GameServer {
  const { onBroadcast, maxSubscribers } = config;
  const rooms = createRoomCollection();

  const state: GameServerState = {
    rooms,
  };

  // Track connected clients
  const connectedClients = new Set<string>();

  // Helper to broadcast to all clients
  const broadcast = (message: GameServerOutgoingMessage): void => {
    if (!onBroadcast) return;

    for (const clientId of connectedClients) {
      onBroadcast(message, clientId);
    }
  };

  const registerClient = (clientId: string): void => {
    connectedClients.add(clientId);
  };

  const unregisterClient = (clientId: string): void => {
    connectedClients.delete(clientId);
  };

  const syncClient = (clientId: string): void => {
    // Get the current collection state
    const collectionSnapshot = state.rooms.getSnapshot();

    // Build RoomsProjection from collection state
    const roomsProjection: RoomsProjection = {
      kind: "RoomsProjection",
      rooms: Object.entries(collectionSnapshot.state.entities).map(
        ([roomId, roomFst]) => {
          const roomState = roomFst.getState();
          return {
            entityId: roomId,
            roomOwner: roomState.owner,
          };
        }
      ),
    };

    // Create snapshot message
    const snapshotMessage: GameServerOutgoingMessage = {
      kind: "Snapshot",
      state: roomsProjection,
      lastAppliedIndex: collectionSnapshot.lastAppliedIndex,
    };

    sendToClient(snapshotMessage, clientId);
  };

  // Helper to send to specific client
  const sendToClient = (
    message: GameServerOutgoingMessage,
    clientId: string
  ): void => {
    if (!onBroadcast) return;
    onBroadcast(message, clientId);
  };

  return {
    handleMessage(message: any): ValidationFailure | GameServerResponse {
      // Validate message with Zod
      const parseResult = GameServerIncomingMessage.safeParse(message);

      if (!parseResult.success) {
        return {
          kind: "ValidationFailure",
          message: parseResult.error.message,
        };
      }

      const validatedMessage = parseResult.data;

      // Route message to appropriate FST
      switch (validatedMessage.kind) {
        case "AddEntity":
        case "RemoveEntity":
        case "UpdateEntity": {
          const result = state.rooms.handleCommand(validatedMessage);

          // If command succeeded, broadcast the event to all clients
          if (result.kind === "Ok") {
            broadcast(result.value);
          }

          return {
            kind: "RoomCollectionResponse",
            result,
          };
        }

        case "SubscribeRooms": {
          // Check if max subscribers limit reached
          if (connectedClients.size >= maxSubscribers) {
            return {
              kind: "SubscribeRoomsRejected",
              clientId: validatedMessage.clientId,
              message: `Maximum number of subscribers (${maxSubscribers}) reached`,
            };
          }

          // Register client and sync current state
          registerClient(validatedMessage.clientId);
          syncClient(validatedMessage.clientId);

          return {
            kind: "SubscribeRoomsAccepted",
            clientId: validatedMessage.clientId,
          };
        }

        case "UnsubscribeRooms": {
          // Unregister client
          unregisterClient(validatedMessage.clientId);

          // Return a validation failure for now (unsubscription is handled via side effects)
          return {
            kind: "ValidationFailure",
            message: "UnsubscribeRooms processed",
          };
        }
      }
    },

    getState(): Readonly<GameServerState> {
      return state;
    },

    getConnectedClients(): string[] {
      return Array.from(connectedClients);
    },
  };
}
