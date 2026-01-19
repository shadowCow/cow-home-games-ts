import {
  createGameServerProxy,
  createGameServer,
  JsonMessageChannel,
} from "@cow-sunday/protocol";
import { GameServerProxyWs } from "./ProxyWithWebsocket";

// ========================================
// In-Memory Message Channel
// ========================================

type MessageHandler = (message: string) => void;

/**
 * In-memory bidirectional message channel for local game server.
 * Simulates network communication without actual network calls.
 */
class InMemoryMessageChannel implements JsonMessageChannel {
  private messageHandler: MessageHandler | undefined;
  private peerChannel: InMemoryMessageChannel | undefined;

  setPeer(peer: InMemoryMessageChannel): void {
    this.peerChannel = peer;
  }

  send(message: string, _authToken: string): void {
    if (this.peerChannel?.messageHandler) {
      // Simulate async delivery with setTimeout
      setTimeout(() => {
        this.peerChannel!.messageHandler!(message);
      }, 0);
    }
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }
}

/**
 * Creates a pair of connected in-memory channels for client-server communication.
 */
function createChannelPair(): {
  clientChannel: JsonMessageChannel;
  serverChannel: JsonMessageChannel;
} {
  const clientChannel = new InMemoryMessageChannel();
  const serverChannel = new InMemoryMessageChannel();

  clientChannel.setPeer(serverChannel);
  serverChannel.setPeer(clientChannel);

  return { clientChannel, serverChannel };
}

/**
 * Wires up a GameServer to its channel for bidirectional communication.
 */
function connectServerToChannel(
  server: ReturnType<typeof createGameServer>,
  channel: JsonMessageChannel,
): void {
  channel.onMessage((messageString: string) => {
    try {
      const message = JSON.parse(messageString);
      server.handleMessage(message);
    } catch (error) {
      console.error("Error processing server message:", error);
    }
  });
}

// ========================================
// Proxy Factory
// ========================================

/**
 * Creates a GameServerProxy backed by an in-memory GameServer.
 * Useful for local development, testing, or offline mode.
 */
export function createProxyInMemory(): GameServerProxyWs {
  const { clientChannel, serverChannel } = createChannelPair();

  // Create server with broadcast callback that sends messages to server channel
  const server = createGameServer({
    maxSubscribers: 100,
    onBroadcast: (message, _clientId) => {
      serverChannel.send(JSON.stringify(message), "");
    },
  });

  // Wire server to receive messages from its channel
  connectServerToChannel(server, serverChannel);

  // Create and return proxy
  const proxy = createGameServerProxy(clientChannel);

  return {
    offerRoomsCommand(command) {
      return proxy.offerRoomsCommand(command);
    },
    subscribeToRooms(callback) {
      return proxy.subscribeToRooms(callback);
    },
    offerRoomCommand(command) {
      return proxy.offerRoomCommand(command);
    },
    subscribeToRoom(roomId, callback) {
      return proxy.subscribeToRoom(roomId, callback);
    },
    connect() {
      // no-op for inmem
    },
    close() {
      // no-op for inmem
    },
  };
}
