import { JsonMessageChannel } from "../channel/json-message-channel";
import { createFstFollower } from "../fst/fst";
import { createProjectionStore } from "../fst/projection-store";
import {
  RoomsProjection,
  roomsProjectionReducer,
  roomsProjectionInitialState,
} from "../room/rooms-projection";
import type { RoomState, RoomEvent } from "../room/room";
import type { CollectionEvent } from "../fst/fst-collection";
import { GameServerOutgoingMessage } from "../game-server/game-server";

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
      const parseResult = GameServerOutgoingMessage.safeParse(message);

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
