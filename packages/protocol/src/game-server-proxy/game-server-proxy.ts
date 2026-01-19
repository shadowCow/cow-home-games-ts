import { JsonMessageChannel } from "../channel/json-message-channel";
import { createFstFollower, Snapshot, IndexedEvent } from "../fst/fst";
import { createProjectionStore } from "../fst/projection-store";
import {
  RoomsProjection,
  roomsProjectionReducer,
  roomsProjectionInitialState,
} from "../room/rooms-projection";
import {
  RoomState,
  RoomEvent,
  RoomCommand,
  RoomError,
  createRoomFollower,
} from "../room/room";
import type { CollectionEvent } from "../fst/fst-collection";
import { GameServerOutgoingMessage } from "../game-server/game-server";
import {
  RoomCollectionCommand,
  RoomCollectionError,
  RoomCollectionEvent,
} from "../room/room-collection";
import { Result, err } from "@cow-sunday/fp-ts";
import type { ProjectionStore } from "../fst/projection-store";

// ========================================
// Game Server Proxy Interface
// ========================================

export type GameServerProxy = {
  offerRoomsCommand(
    command: RoomCollectionCommand
  ): Promise<Result<RoomCollectionEvent, RoomCollectionError>>;
  subscribeToRooms(callback: (projection: RoomsProjection) => void): () => void;

  offerRoomCommand(command: RoomCommand): Promise<Result<RoomEvent, RoomError>>;
  subscribeToRoom(
    roomId: string,
    callback: (room: RoomState) => void
  ): () => void;
};

// ========================================
// Game Server Proxy Factory
// ========================================

export function createGameServerProxy(
  channel: JsonMessageChannel
): GameServerProxy {
  // Create FstFollower with the roomsProjectionReducer for rooms list
  const roomsFollower = createFstFollower<
    RoomsProjection,
    CollectionEvent<RoomState, RoomEvent>
  >(roomsProjectionReducer, roomsProjectionInitialState());

  // Wrap follower in ProjectionStore for subscription management
  const roomsStore = createProjectionStore(roomsFollower);

  // Track subscribed room state
  let subscribedRoomId: string | undefined = undefined;
  let roomStore: ProjectionStore<RoomState, RoomEvent> | undefined = undefined;

  // Handle incoming messages from the server
  channel.onMessage((messageString: string) => {
    try {
      const message = JSON.parse(messageString);
      const parseResult = GameServerOutgoingMessage.safeParse(message);

      if (!parseResult.success) {
        console.error("Invalid message format:", parseResult.error);
        return;
      }

      const validatedMessage = parseResult.data;

      // Route to appropriate store based on message context
      switch (validatedMessage.kind) {
        case "Snapshot": {
          // Try to parse as RoomsProjection snapshot
          const roomsProjectionParseResult = RoomsProjection.safeParse(validatedMessage.state);
          if (roomsProjectionParseResult.success) {
            const roomsSnapshot: Snapshot<RoomsProjection> = {
              kind: "Snapshot",
              state: roomsProjectionParseResult.data,
              lastAppliedIndex: validatedMessage.lastAppliedIndex,
            };
            const result = roomsStore.applySnapshot(roomsSnapshot);
            if (result.kind === "Err") {
              console.error("Failed to apply rooms snapshot:", result.value);
            }
            break;
          }

          // Try to parse as RoomState snapshot (for subscribed room)
          if (roomStore && subscribedRoomId) {
            const roomStateParseResult = RoomState.safeParse(validatedMessage.state);
            if (roomStateParseResult.success) {
              const roomSnapshot: Snapshot<RoomState> = {
                kind: "Snapshot",
                state: roomStateParseResult.data,
                lastAppliedIndex: validatedMessage.lastAppliedIndex,
              };
              const result = roomStore.applySnapshot(roomSnapshot);
              if (result.kind === "Err") {
                console.error("Failed to apply room snapshot:", result.value);
              }
              break;
            }
          }

          console.error("Could not parse snapshot state as RoomsProjection or RoomState");
          break;
        }

        case "IndexedEvent": {
          // Try to parse as collection event first
          const collectionEventParseResult = RoomCollectionEvent.safeParse(validatedMessage.event);
          if (collectionEventParseResult.success) {
            const collectionIndexedEvent: IndexedEvent<CollectionEvent<RoomState, RoomEvent>> = {
              kind: "IndexedEvent",
              index: validatedMessage.index,
              event: collectionEventParseResult.data,
            };
            const result = roomsStore.applyEvent(collectionIndexedEvent);
            if (result.kind === "Err") {
              console.error("Failed to apply rooms event:", result.value);
            }
            break;
          }

          // Try to parse as room event (for subscribed room)
          if (roomStore && subscribedRoomId) {
            const roomEventParseResult = RoomEvent.safeParse(validatedMessage.event);
            if (roomEventParseResult.success) {
              const roomIndexedEvent: IndexedEvent<RoomEvent> = {
                kind: "IndexedEvent",
                index: validatedMessage.index,
                event: roomEventParseResult.data,
              };
              const result = roomStore.applyEvent(roomIndexedEvent);
              if (result.kind === "Err") {
                console.error("Failed to apply room event:", result.value);
              }
              break;
            }
          }

          console.error("Could not parse event as CollectionEvent or RoomEvent");
          break;
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });

  return {
    async offerRoomsCommand(
      command: RoomCollectionCommand
    ): Promise<Result<RoomCollectionEvent, RoomCollectionError>> {
      // TODO: Implement command sending and response handling
      // For now, return an error
      return err({ kind: "EntityNotFound", entityType: "Room", id: "unknown" });
    },

    subscribeToRooms(
      callback: (projection: RoomsProjection) => void
    ): () => void {
      return roomsStore.subscribe(callback);
    },

    async offerRoomCommand(
      command: RoomCommand
    ): Promise<Result<RoomEvent, RoomError>> {
      // TODO: Implement command sending and response handling
      // For now, return an error
      return err({ kind: "NotOwner", userId: "unknown" });
    },

    subscribeToRoom(
      roomId: string,
      callback: (room: RoomState) => void
    ): () => void {
      // Unsubscribe from previous room if any
      if (roomStore) {
        roomStore = undefined;
      }

      subscribedRoomId = roomId;

      // Create initial room state (will be updated by snapshot from server)
      const initialRoomState: RoomState = {
        id: roomId,
        owner: "",
        code: "",
        guests: [],
        activeSession: { kind: "RoomNoSession" },
      };

      const roomFollower = createRoomFollower(initialRoomState);
      roomStore = createProjectionStore(roomFollower);

      // TODO: Send subscription message to server

      return roomStore.subscribe(callback);
    },
  };
}
