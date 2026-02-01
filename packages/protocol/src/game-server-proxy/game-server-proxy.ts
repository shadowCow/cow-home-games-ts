import { JsonMessageChannel } from "../channel/json-message-channel";
import { createFstFollower, Snapshot, IndexedEvent } from "../fst/fst";
import { createProjectionStore } from "../fst/projection-store";
import {
  RoomsProjection,
  roomsProjectionReducer,
  roomsProjectionInitialState,
  roomsProjectionInitialSnapshot,
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
import { RoomDoor } from "../room/rooms-projection";
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

  getRoomDoor(owner: string): Promise<RoomDoor | null>;
};

// ========================================
// Game Server Proxy Factory
// ========================================

export function createGameServerProxy(
  channel: JsonMessageChannel
): GameServerProxy {
  // Client ID assigned by the server via handshake
  let clientId: string | undefined = undefined;
  const outgoingQueue: Array<() => void> = [];

  function sendWhenReady(send: () => void): void {
    if (clientId) {
      send();
    } else {
      outgoingQueue.push(send);
    }
  }

  function flushOutgoingQueue(): void {
    while (outgoingQueue.length > 0) {
      const send = outgoingQueue.shift()!;
      send();
    }
  }

  // Create FstFollower with the roomsProjectionReducer for rooms list
  const roomsFollower = createFstFollower<
    RoomsProjection,
    CollectionEvent<RoomState, RoomEvent>
  >(roomsProjectionReducer, roomsProjectionInitialSnapshot());

  // Wrap follower in ProjectionStore for subscription management
  const roomsStore = createProjectionStore(roomsFollower);

  // Track subscribed room state
  let subscribedRoomId: string | undefined = undefined;
  let roomStore: ProjectionStore<RoomState, RoomEvent> | undefined = undefined;
  const roomCallbacks = new Map<
    number,
    {
      callback: (room: RoomState) => void;
      unsubscribe?: () => void;
    }
  >();
  let nextCallbackId = 0;

  // Pending request-response tracking
  const pendingRequests = new Map<string, (response: any) => void>();
  let nextRequestId = 0;

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
        case "ClientConnected": {
          clientId = validatedMessage.clientId;
          flushOutgoingQueue();
          break;
        }

        case "Snapshot": {
          // Try to parse as RoomsProjection snapshot
          const roomsProjectionParseResult = RoomsProjection.safeParse(
            validatedMessage.state
          );
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
          if (subscribedRoomId) {
            const roomStateParseResult = RoomState.safeParse(
              validatedMessage.state
            );
            if (roomStateParseResult.success) {
              const roomSnapshot: Snapshot<RoomState> = {
                kind: "Snapshot",
                state: roomStateParseResult.data,
                lastAppliedIndex: validatedMessage.lastAppliedIndex,
              };

              // Create roomStore if this is the first snapshot
              if (!roomStore) {
                const roomFollower = createRoomFollower(roomSnapshot);
                roomStore = createProjectionStore(roomFollower);

                // Subscribe all pending callbacks and store their unsubscribe functions
                for (const [callbackId, entry] of roomCallbacks.entries()) {
                  entry.unsubscribe = roomStore.subscribe(entry.callback);
                }
              } else {
                // Apply snapshot to existing store
                const result = roomStore.applySnapshot(roomSnapshot);
                if (result.kind === "Err") {
                  console.error("Failed to apply room snapshot:", result.value);
                }
              }
              break;
            }
          }

          console.error(
            "Could not parse snapshot state as RoomsProjection or RoomState"
          );
          break;
        }

        case "IndexedEvent": {
          // Try to parse as collection event first
          const collectionEventParseResult = RoomCollectionEvent.safeParse(
            validatedMessage.event
          );
          if (collectionEventParseResult.success) {
            const collectionIndexedEvent: IndexedEvent<
              CollectionEvent<RoomState, RoomEvent>
            > = {
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
          const roomEventParseResult = RoomEvent.safeParse(
            validatedMessage.event
          );
          if (roomEventParseResult.success) {
            if (roomStore && subscribedRoomId) {
              const roomIndexedEvent: IndexedEvent<RoomEvent> = {
                kind: "IndexedEvent",
                index: validatedMessage.index,
                event: roomEventParseResult.data,
              };
              const result = roomStore.applyEvent(roomIndexedEvent);
              if (result.kind === "Err") {
                console.error("Failed to apply room event:", result.value);
              }
            }
            break;
          }

          console.error(
            "Could not parse event as CollectionEvent or RoomEvent"
          );
          break;
        }

        case "GetRoomDoorResponse": {
          const resolver = pendingRequests.get(validatedMessage.requestId);
          if (resolver) {
            pendingRequests.delete(validatedMessage.requestId);
            resolver(validatedMessage.roomDoor);
          }
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
      // Send command to server
      sendWhenReady(() => channel.send(JSON.stringify(command), ""));

      // TODO: Implement proper request-response pattern
      // For now, return a placeholder success result
      // The actual result will be delivered via the event stream
      return err({ kind: "EntityNotFound", entityType: "Room", id: "unknown" });
    },

    subscribeToRooms(
      callback: (projection: RoomsProjection) => void
    ): () => void {
      // Send subscription request to server
      sendWhenReady(() => {
        const subscribeMessage = {
          kind: "SubscribeRooms",
          clientId,
        };
        channel.send(JSON.stringify(subscribeMessage), "");
      });

      // Subscribe to the rooms store
      return roomsStore.subscribe(callback);
    },

    async offerRoomCommand(
      command: RoomCommand
    ): Promise<Result<RoomEvent, RoomError>> {
      // Send UpdateEntity command to server
      sendWhenReady(() => {
        const updateCommand = {
          kind: "UpdateEntity",
          entityType: "Room",
          id: command.roomId,
          command: command,
        };
        channel.send(JSON.stringify(updateCommand), "");
      });

      // TODO: Implement proper request-response pattern
      // For now, return a placeholder success result
      // The actual result will be delivered via the event stream
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
      roomCallbacks.clear();

      subscribedRoomId = roomId;

      // Add callback to pending list
      const callbackId = nextCallbackId++;
      const entry = { callback, unsubscribe: undefined };
      roomCallbacks.set(callbackId, entry);

      // Send subscription request to server
      sendWhenReady(() => {
        const subscribeMessage = {
          kind: "SubscribeRoom",
          clientId,
          roomId,
        };
        channel.send(JSON.stringify(subscribeMessage), "");
      });

      // Return unsubscribe function that works before and after store creation
      return () => {
        const entry = roomCallbacks.get(callbackId);
        if (entry?.unsubscribe) {
          entry.unsubscribe();
        }
        roomCallbacks.delete(callbackId);
      };
    },

    getRoomDoor(owner: string): Promise<RoomDoor | null> {
      const requestId = `req-${nextRequestId++}`;

      return new Promise((resolve) => {
        pendingRequests.set(requestId, resolve);

        sendWhenReady(() => {
          const message = {
            kind: "GetRoomDoor",
            clientId,
            requestId,
            owner,
          };
          channel.send(JSON.stringify(message), "");
        });
      });
    },
  };
}
