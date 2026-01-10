import { JsonMessageChannel } from "../channel/json-message-channel";
import { IndexedEvent, Snapshot } from "../fst/fst";
import { RoomsProjection } from "../room/rooms-projection";
import { z } from "zod";

// ========================================
// RoomsProjection Sync Messages
// ========================================

const GameServerProxyMessage = z.discriminatedUnion("kind", [
  IndexedEvent(z.any()), // TODO: Define RoomsProjectionEvent type
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

export function createGameServerProxy(channel: JsonMessageChannel): GameServerProxy {
  let currentProjection: RoomsProjection = {
    kind: "RoomsProjection",
    rooms: [],
  };
  let lastAppliedIndex = 0;
  const subscribers: Array<(projection: RoomsProjection) => void> = [];

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
          currentProjection = validatedMessage.state;
          lastAppliedIndex = validatedMessage.lastAppliedIndex;
          notifySubscribers();
          break;
        }

        case "IndexedEvent": {
          // Validate event ordering
          if (validatedMessage.index !== lastAppliedIndex + 1) {
            console.error("Event gap detected", {
              received: validatedMessage.index,
              expected: lastAppliedIndex + 1,
            });
            return;
          }

          // TODO: Apply event to projection
          // For now, we just update the index
          lastAppliedIndex = validatedMessage.index;
          notifySubscribers();
          break;
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });

  function notifySubscribers(): void {
    subscribers.forEach((callback) => callback(currentProjection));
  }

  return {
    subscribeToRooms(callback: (projection: RoomsProjection) => void): () => void {
      subscribers.push(callback);
      // Immediately call with current state
      callback(currentProjection);

      // Return unsubscribe function
      return () => {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      };
    },
  };
}
