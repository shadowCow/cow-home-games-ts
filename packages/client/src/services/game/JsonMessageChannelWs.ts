import { JsonMessageChannel } from "@cow-sunday/protocol";

// ========================================
// Configuration
// ========================================

export type WebSocketChannelConfig = {
  url: string;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
  onConnectionStateChange?: (connected: boolean) => void;
};

// ========================================
// WebSocket Message Channel
// ========================================

export type JsonMessageChannelWs = JsonMessageChannel & {
  connect(): void;
  close(): void;
};
/**
 * Creates a JsonMessageChannel that communicates over WebSocket.
 * Automatically connects on creation and handles reconnection on disconnect.
 */
export function createJsonMessageChannelWs(
  config: WebSocketChannelConfig
): JsonMessageChannelWs {
  const {
    url,
    reconnectDelayMs = 1000,
    maxReconnectDelayMs = 30000,
    onConnectionStateChange,
  } = config;

  let ws: WebSocket | null = null;
  let messageHandler: (message: string) => void = () => {};
  let currentReconnectDelay = reconnectDelayMs;
  let reconnectTimeoutId: number | null = null;
  let intentionallyClosed = false;

  // Queue for messages sent while disconnected
  const messageQueue: Array<{ message: string; authToken: string }> = [];

  function connect(): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      ws = new WebSocket(url);

      ws.onopen = () => {
        console.log("WebSocket connected:", url);
        currentReconnectDelay = reconnectDelayMs; // Reset backoff
        onConnectionStateChange?.(true);

        // Send any queued messages
        while (messageQueue.length > 0) {
          const queued = messageQueue.shift();
          if (queued && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(queued.message);
          }
        }
      };

      ws.onmessage = (event) => {
        if (typeof event.data === "string") {
          messageHandler(event.data);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        onConnectionStateChange?.(false);

        // Attempt reconnection unless intentionally closed
        if (!intentionallyClosed) {
          scheduleReconnect();
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      scheduleReconnect();
    }
  }

  function scheduleReconnect(): void {
    if (reconnectTimeoutId !== null) {
      return; // Already scheduled
    }

    console.log(`Reconnecting in ${currentReconnectDelay}ms...`);

    reconnectTimeoutId = window.setTimeout(() => {
      reconnectTimeoutId = null;
      connect();

      // Exponential backoff up to max
      currentReconnectDelay = Math.min(
        currentReconnectDelay * 2,
        maxReconnectDelayMs
      );
    }, currentReconnectDelay);
  }

  function close(): void {
    intentionallyClosed = true;

    if (reconnectTimeoutId !== null) {
      clearTimeout(reconnectTimeoutId);
      reconnectTimeoutId = null;
    }

    if (ws) {
      ws.close();
      ws = null;
    }

    messageQueue.length = 0;
  }

  // Auto-connect on creation
  connect();

  return {
    send(message: string, _authToken: string): void {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      } else {
        // Queue message if not connected
        console.warn("WebSocket not connected, queueing message");
        messageQueue.push({ message, authToken: _authToken });
      }
    },

    onMessage(handler: (message: string) => void): void {
      messageHandler = handler;
    },

    connect(): void {
      intentionallyClosed = false;
      connect();
    },

    close,
  };
}
