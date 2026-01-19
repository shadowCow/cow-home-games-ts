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
import { RoomState, RoomEvent } from "../room/room";

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

export const SubscribeRoom = z.object({
  kind: z.literal("SubscribeRoom"),
  clientId: z.string(),
  roomId: z.string(),
});

export type SubscribeRoom = z.infer<typeof SubscribeRoom>;

export const UnsubscribeRoom = z.object({
  kind: z.literal("UnsubscribeRoom"),
  clientId: z.string(),
  roomId: z.string(),
});

export type UnsubscribeRoom = z.infer<typeof UnsubscribeRoom>;

// Combined message type that server can receive from clients
export const GameServerIncomingMessage = z.discriminatedUnion("kind", [
  RoomCollectionCommand,
  SubscribeRooms,
  UnsubscribeRooms,
  SubscribeRoom,
  UnsubscribeRoom,
]);

export type GameServerIncomingMessage = z.infer<
  typeof GameServerIncomingMessage
>;

// Messages that server can send to clients
// Can send snapshots and events for both RoomsProjection and individual RoomState
export const GameServerOutgoingMessage = z.discriminatedUnion("kind", [
  IndexedEvent(z.any()), // Can be CollectionEvent or RoomEvent
  Snapshot(z.any()), // Can be RoomsProjection or RoomState
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

  // Track subscriptions granularly
  const roomsSubscribers = new Set<string>(); // Clients subscribed to Rooms collection
  const roomSubscribers = new Map<string, Set<string>>(); // Map roomId -> Set of clientIds

  // Helper to broadcast to all Rooms collection subscribers
  const broadcastToRoomsSubscribers = (message: GameServerOutgoingMessage): void => {
    if (!onBroadcast) return;

    for (const clientId of roomsSubscribers) {
      onBroadcast(message, clientId);
    }
  };

  // Helper to broadcast to all subscribers of a specific room
  const broadcastToRoomSubscribers = (roomId: string, message: GameServerOutgoingMessage): void => {
    if (!onBroadcast) return;

    const subscribers = roomSubscribers.get(roomId);
    if (subscribers) {
      for (const clientId of subscribers) {
        onBroadcast(message, clientId);
      }
    }
  };

  const subscribeClientToRooms = (clientId: string): void => {
    roomsSubscribers.add(clientId);
  };

  const unsubscribeClientFromRooms = (clientId: string): void => {
    roomsSubscribers.delete(clientId);
  };

  const subscribeClientToRoom = (clientId: string, roomId: string): void => {
    if (!roomSubscribers.has(roomId)) {
      roomSubscribers.set(roomId, new Set());
    }
    roomSubscribers.get(roomId)!.add(clientId);
  };

  const unsubscribeClientFromRoom = (clientId: string, roomId: string): void => {
    const subscribers = roomSubscribers.get(roomId);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        roomSubscribers.delete(roomId);
      }
    }
  };

  const syncRoomsClient = (clientId: string): void => {
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

  const syncRoomClient = (clientId: string, roomId: string): void => {
    // Get the room FST
    const collectionSnapshot = state.rooms.getSnapshot();
    const roomFst = collectionSnapshot.state.entities[roomId];

    if (!roomFst) {
      // Room doesn't exist - could send an error or just ignore
      console.error(`Attempted to sync non-existent room: ${roomId}`);
      return;
    }

    // Get the room snapshot
    const roomSnapshot = roomFst.getSnapshot();

    // Create snapshot message
    const snapshotMessage: GameServerOutgoingMessage = {
      kind: "Snapshot",
      state: roomSnapshot.state,
      lastAppliedIndex: roomSnapshot.lastAppliedIndex,
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
        case "RemoveEntity": {
          const result = state.rooms.handleCommand(validatedMessage);

          // If command succeeded, broadcast the event to all Rooms collection subscribers
          if (result.kind === "Ok") {
            const collectionEvent = result.value;
            const message: GameServerOutgoingMessage = {
              kind: "IndexedEvent",
              index: collectionEvent.index,
              event: collectionEvent.event,
            };
            broadcastToRoomsSubscribers(message);
          }

          return {
            kind: "RoomCollectionResponse",
            result,
          };
        }

        case "UpdateEntity": {
          const result = state.rooms.handleCommand(validatedMessage);

          // If command succeeded, broadcast to both collection and room subscribers
          if (result.kind === "Ok") {
            const collectionEvent = result.value;

            // Broadcast collection event to Rooms subscribers
            const collectionIndexedEvent: GameServerOutgoingMessage = {
              kind: "IndexedEvent",
              index: collectionEvent.index,
              event: collectionEvent.event,
            };
            broadcastToRoomsSubscribers(collectionIndexedEvent);

            // Extract room event and broadcast to room subscribers
            if (collectionEvent.event.kind === "EntityUpdated") {
              const roomIndexedEvent = collectionEvent.event.event;
              broadcastToRoomSubscribers(validatedMessage.id, roomIndexedEvent);
            }
          }

          return {
            kind: "RoomCollectionResponse",
            result,
          };
        }

        case "SubscribeRooms": {
          // Check if max subscribers limit reached
          if (roomsSubscribers.size >= maxSubscribers) {
            return {
              kind: "SubscribeRoomsRejected",
              clientId: validatedMessage.clientId,
              message: `Maximum number of subscribers (${maxSubscribers}) reached`,
            };
          }

          // Register client and sync current state
          subscribeClientToRooms(validatedMessage.clientId);
          syncRoomsClient(validatedMessage.clientId);

          return {
            kind: "SubscribeRoomsAccepted",
            clientId: validatedMessage.clientId,
          };
        }

        case "UnsubscribeRooms": {
          // Unregister client
          unsubscribeClientFromRooms(validatedMessage.clientId);

          // Return a validation failure for now (unsubscription is handled via side effects)
          return {
            kind: "ValidationFailure",
            message: "UnsubscribeRooms processed",
          };
        }

        case "SubscribeRoom": {
          // Check if max subscribers limit reached (across all subscriptions)
          const totalSubscribers = roomsSubscribers.size +
            Array.from(roomSubscribers.values()).reduce((sum, set) => sum + set.size, 0);

          if (totalSubscribers >= maxSubscribers) {
            return {
              kind: "ValidationFailure",
              message: `Maximum number of subscribers (${maxSubscribers}) reached`,
            };
          }

          // Subscribe client to the specific room
          subscribeClientToRoom(validatedMessage.clientId, validatedMessage.roomId);
          syncRoomClient(validatedMessage.clientId, validatedMessage.roomId);

          return {
            kind: "ValidationFailure",
            message: "SubscribeRoom processed",
          };
        }

        case "UnsubscribeRoom": {
          // Unsubscribe client from the specific room
          unsubscribeClientFromRoom(validatedMessage.clientId, validatedMessage.roomId);

          return {
            kind: "ValidationFailure",
            message: "UnsubscribeRoom processed",
          };
        }
      }
    },

    getState(): Readonly<GameServerState> {
      return state;
    },

    getConnectedClients(): string[] {
      // Collect all unique clients from both subscription types
      const allClients = new Set<string>();

      // Add Rooms collection subscribers
      for (const clientId of roomsSubscribers) {
        allClients.add(clientId);
      }

      // Add room subscribers
      for (const subscribers of roomSubscribers.values()) {
        for (const clientId of subscribers) {
          allClients.add(clientId);
        }
      }

      return Array.from(allClients);
    },
  };
}
