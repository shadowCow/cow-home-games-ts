import { JsonMessageChannel } from "../channel/json-message-channel";
import { createFstFollower, IndexedEvent, Snapshot } from "../fst/fst";
import { createProjectionStore } from "../fst/projection-store";
import {
  RoomsProjection,
  roomsProjectionReducer,
  roomsProjectionInitialState,
} from "../room/rooms-projection";
import type { RoomState, RoomEvent } from "../room/room";
import type { CollectionEvent } from "../fst/fst-collection";
import { z } from "zod";

// ========================================
// RoomsProjection Sync Messages
// ========================================

// Event type for RoomsProjection is CollectionEvent<RoomState, RoomEvent>
// We use z.any() here as a placeholder since we validate the shape via the store
const GameServerProxyMessage = z.discriminatedUnion("kind", [
  IndexedEvent(z.any()),
  Snapshot(RoomsProjection),
]);

type GameServerProxyMessage = z.infer<typeof GameServerProxyMessage>;

// ========================================
// Game Server Proxy Interface
// ========================================

export type GameServerProxy = {
  subscribeToRooms(callback: (projection: RoomsProjection) => void): () => void;
};

// ========================================
// Game Server Proxy Factory
// ========================================

export function createGameServerProxy(
  channel: JsonMessageChannel
): GameServerProxy {
  // Create FstFollower with the roomsProjectionReducer
  const follower = createFstFollower<
    RoomsProjection,
    CollectionEvent<RoomState, RoomEvent>
  >(roomsProjectionReducer, roomsProjectionInitialState());

  // Wrap follower in ProjectionStore for subscription management
  const store = createProjectionStore(follower);

  // Handle incoming messages from the server
  channel.onMessage((messageString: string) => {
    try {
      const message = JSON.parse(messageString);
      const parseResult = GameServerProxyMessage.safeParse(message);

      if (!parseResult.success) {
        console.error("Invalid message format:", parseResult.error);
        return;
      }

      const validatedMessage = parseResult.data;

      switch (validatedMessage.kind) {
        case "Snapshot": {
          const result = store.applySnapshot(validatedMessage);
          if (result.kind === "Err") {
            console.error("Failed to apply snapshot:", result.value);
          }
          break;
        }

        case "IndexedEvent": {
          const result = store.applyEvent(validatedMessage);
          if (result.kind === "Err") {
            console.error("Failed to apply event:", result.value);
          }
          break;
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });

  return {
    subscribeToRooms(
      callback: (projection: RoomsProjection) => void
    ): () => void {
      return store.subscribe(callback);
    },
  };
}
