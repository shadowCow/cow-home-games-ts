import { describe, test } from "node:test";
import assert from "node:assert";
import { createGameServer } from "../../game-server/game-server";
import { createGameServerProxy } from "../../game-server-proxy/game-server-proxy";
import type { JsonMessageChannel } from "../../channel/json-message-channel";
import type { RoomsProjection } from "../../room/rooms-projection";
import type { RoomState } from "../../room/room";

// ========================================
// Test Message Channel Implementation
// ========================================

type MessageHandler = (message: string) => void;

/**
 * In-memory bidirectional message channel for testing.
 * Connects two endpoints (client and server) with synchronous message passing.
 */
class InMemoryMessageChannel implements JsonMessageChannel {
  private messageHandler: MessageHandler | undefined;
  private peerChannel: InMemoryMessageChannel | undefined;

  setPeer(peer: InMemoryMessageChannel): void {
    this.peerChannel = peer;
  }

  send(message: string, authToken: string): void {
    if (this.peerChannel?.messageHandler) {
      // Simulate async delivery with setImmediate
      setImmediate(() => {
        this.peerChannel!.messageHandler!(message);
      });
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
  channel: JsonMessageChannel
): void {
  // Server receives messages from the channel and processes them
  channel.onMessage((messageString: string) => {
    try {
      const message = JSON.parse(messageString);
      const response = server.handleMessage(message);
      // Response handling could be added here if needed
    } catch (error) {
      console.error("Error processing server message:", error);
    }
  });
}

// ========================================
// Test Helpers
// ========================================

/**
 * Helper to wait for a condition to become true.
 */
async function waitFor(
  condition: () => boolean,
  timeoutMs: number = 1000
): Promise<void> {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error("Timeout waiting for condition");
    }
    await new Promise((resolve) => setImmediate(resolve));
  }
}

/**
 * Helper to wait for a specific number of callback invocations.
 */
function createCallbackTracker<T>(): {
  callback: (value: T) => void;
  getCallCount: () => number;
  getLastValue: () => T | undefined;
  getAllValues: () => T[];
} {
  let callCount = 0;
  let lastValue: T | undefined = undefined;
  const allValues: T[] = [];

  return {
    callback: (value: T) => {
      callCount++;
      lastValue = value;
      allValues.push(value);
    },
    getCallCount: () => callCount,
    getLastValue: () => lastValue,
    getAllValues: () => allValues,
  };
}

// ========================================
// Tests
// ========================================

describe("GameServerProxy - Client-Server Communication", () => {
  test("should connect client to server and receive initial empty rooms projection", async () => {
    // Arrange
    const { clientChannel, serverChannel } = createChannelPair();

    // Create server with broadcast callback that sends messages to server channel
    const server = createGameServer({
      maxSubscribers: 10,
      onBroadcast: (message, clientId) => {
        serverChannel.send(JSON.stringify(message), "");
      },
    });

    // Wire server to receive messages from its channel
    connectServerToChannel(server, serverChannel);

    const proxy = createGameServerProxy(clientChannel);
    const tracker = createCallbackTracker<RoomsProjection>();

    // Act
    const unsubscribe = proxy.subscribeToRooms(tracker.callback);

    // Assert
    await waitFor(() => tracker.getCallCount() > 0);
    const projection = tracker.getLastValue();
    assert.ok(projection);
    assert.equal(projection.kind, "RoomsProjection");
    assert.equal(projection.rooms.length, 0);

    unsubscribe();
  });

  test("should receive rooms projection with existing rooms on subscription", async () => {
    // Arrange
    const { clientChannel, serverChannel } = createChannelPair();

    // Create server with broadcast callback
    const server = createGameServer({
      maxSubscribers: 10,
      onBroadcast: (message, clientId) => {
        serverChannel.send(JSON.stringify(message), "");
      },
    });

    // Wire server to receive messages from its channel
    connectServerToChannel(server, serverChannel);

    // Add rooms directly via server.handleMessage (setup only, not testing client-server communication here)
    server.handleMessage({
      kind: "AddEntity",
      entityType: "Room",
      id: "room1",
      initialState: {
        id: "room1",
        owner: "user1",
        code: "ABC123",
        guests: [],
        activeSession: { kind: "RoomNoSession" },
      },
    });

    server.handleMessage({
      kind: "AddEntity",
      entityType: "Room",
      id: "room2",
      initialState: {
        id: "room2",
        owner: "user2",
        code: "XYZ789",
        guests: [],
        activeSession: { kind: "RoomNoSession" },
      },
    });

    // Now create proxy AFTER setup is complete
    const proxy = createGameServerProxy(clientChannel);
    const tracker = createCallbackTracker<RoomsProjection>();

    // Act
    const unsubscribe = proxy.subscribeToRooms(tracker.callback);

    // Assert
    await waitFor(() => tracker.getCallCount() > 0);
    const projection = tracker.getLastValue();
    assert.ok(projection);
    assert.equal(projection.rooms.length, 2);
    assert.ok(projection.rooms.some((r) => r.entityId === "room1"));
    assert.ok(projection.rooms.some((r) => r.entityId === "room2"));

    unsubscribe();
  });

  test("should receive room added event when new room is created", async () => {
    // Arrange
    const { clientChannel, serverChannel } = createChannelPair();

    // Create server with broadcast callback
    const server = createGameServer({
      maxSubscribers: 10,
      onBroadcast: (message, clientId) => {
        serverChannel.send(JSON.stringify(message), "");
      },
    });

    // Wire server to receive messages from its channel
    connectServerToChannel(server, serverChannel);

    const proxy = createGameServerProxy(clientChannel);

    const tracker = createCallbackTracker<RoomsProjection>();
    const unsubscribe = proxy.subscribeToRooms(tracker.callback);

    // Wait for initial snapshot
    await waitFor(() => tracker.getCallCount() > 0);

    // Act - add room via proxy
    await proxy.offerRoomsCommand({
      kind: "AddEntity",
      entityType: "Room",
      id: "room1",
      initialState: {
        id: "room1",
        owner: "user1",
        code: "ABC123",
        guests: [],
        activeSession: { kind: "RoomNoSession" },
      },
    });

    // Assert
    await waitFor(() => tracker.getCallCount() > 1);
    const projection = tracker.getLastValue();
    assert.ok(projection);
    assert.equal(projection.rooms.length, 1);
    assert.equal(projection.rooms[0].entityId, "room1");
    assert.equal(projection.rooms[0].roomOwner, "user1");

    unsubscribe();
  });

  test("should receive room removed event when room is deleted", async () => {
    // Arrange
    const { clientChannel, serverChannel } = createChannelPair();

    // Create server with broadcast callback
    const server = createGameServer({
      maxSubscribers: 10,
      onBroadcast: (message, clientId) => {
        serverChannel.send(JSON.stringify(message), "");
      },
    });

    // Wire server to receive messages from its channel
    connectServerToChannel(server, serverChannel);

    // Add a room directly via server.handleMessage (setup only)
    server.handleMessage({
      kind: "AddEntity",
      entityType: "Room",
      id: "room1",
      initialState: {
        id: "room1",
        owner: "user1",
        code: "ABC123",
        guests: [],
        activeSession: { kind: "RoomNoSession" },
      },
    });

    // Create proxy AFTER setup is complete
    const proxy = createGameServerProxy(clientChannel);
    const tracker = createCallbackTracker<RoomsProjection>();
    const unsubscribe = proxy.subscribeToRooms(tracker.callback);

    // Wait for initial snapshot with 1 room
    await waitFor(() => tracker.getCallCount() > 0);
    assert.equal(tracker.getLastValue()?.rooms.length, 1);

    // Act - remove room via proxy
    await proxy.offerRoomsCommand({
      kind: "RemoveEntity",
      entityType: "Room",
      id: "room1",
    });

    // Assert
    await waitFor(() => {
      const projection = tracker.getLastValue();
      return projection ? projection.rooms.length === 0 : false;
    });

    unsubscribe();
  });

  test("should subscribe to individual room and receive room state", async () => {
    // Arrange
    const { clientChannel, serverChannel } = createChannelPair();

    // Create server with broadcast callback
    const server = createGameServer({
      maxSubscribers: 10,
      onBroadcast: (message, clientId) => {
        serverChannel.send(JSON.stringify(message), "");
      },
    });

    // Wire server to receive messages from its channel
    connectServerToChannel(server, serverChannel);

    // Add a room directly via server.handleMessage (setup only)
    server.handleMessage({
      kind: "AddEntity",
      entityType: "Room",
      id: "room1",
      initialState: {
        id: "room1",
        owner: "user1",
        code: "ABC123",
        guests: [],
        activeSession: { kind: "RoomNoSession" },
      },
    });

    // Create proxy AFTER setup is complete
    const proxy = createGameServerProxy(clientChannel);
    const tracker = createCallbackTracker<RoomState>();

    // Act
    const unsubscribe = proxy.subscribeToRoom("room1", tracker.callback);

    // Assert
    await waitFor(() => tracker.getCallCount() > 0);
    const roomState = tracker.getLastValue();
    assert.ok(roomState);
    assert.equal(roomState.id, "room1");
    assert.equal(roomState.owner, "user1");
    assert.equal(roomState.code, "ABC123");
    assert.equal(roomState.guests.length, 0);

    unsubscribe();
  });

  test("should receive room state updates when guest joins", async () => {
    // Arrange
    const { clientChannel, serverChannel } = createChannelPair();

    // Create server with broadcast callback
    const server = createGameServer({
      maxSubscribers: 10,
      onBroadcast: (message, clientId) => {
        serverChannel.send(JSON.stringify(message), "");
      },
    });

    // Wire server to receive messages from its channel
    connectServerToChannel(server, serverChannel);

    // Add a room directly via server.handleMessage (setup only)
    server.handleMessage({
      kind: "AddEntity",
      entityType: "Room",
      id: "room1",
      initialState: {
        id: "room1",
        owner: "user1",
        code: "ABC123",
        guests: [],
        activeSession: { kind: "RoomNoSession" },
      },
    });

    // Create proxy AFTER setup is complete
    const proxy = createGameServerProxy(clientChannel);
    const tracker = createCallbackTracker<RoomState>();
    const unsubscribe = proxy.subscribeToRoom("room1", tracker.callback);

    // Wait for initial room state
    await waitFor(() => tracker.getCallCount() > 0);
    assert.equal(tracker.getLastValue()?.guests.length, 0);

    // Act - send JoinRoom command via proxy
    await proxy.offerRoomCommand({
      kind: "JoinRoom",
      roomId: "room1",
      userId: "user2",
      code: "ABC123",
    });

    // Assert
    await waitFor(() => {
      const roomState = tracker.getLastValue();
      return roomState ? roomState.guests.length === 1 : false;
    });

    const finalState = tracker.getLastValue();
    assert.ok(finalState);
    assert.equal(finalState.guests.length, 1);
    assert.equal(finalState.guests[0], "user2");

    unsubscribe();
  });

  test("should only allow one room subscription at a time", async () => {
    // Arrange - use separate channels for setup and other client
    const { clientChannel: setupChannel, serverChannel: setupServerChannel } =
      createChannelPair();
    const { clientChannel, serverChannel } = createChannelPair();
    const { clientChannel: otherChannel, serverChannel: otherServerChannel } =
      createChannelPair();

    // Create server with broadcast callback that sends to all channels
    const server = createGameServer({
      maxSubscribers: 10,
      onBroadcast: (message, clientId) => {
        setupServerChannel.send(JSON.stringify(message), "");
        serverChannel.send(JSON.stringify(message), "");
        otherServerChannel.send(JSON.stringify(message), "");
      },
    });

    // Wire server to receive messages from all channels
    connectServerToChannel(server, setupServerChannel);
    connectServerToChannel(server, serverChannel);
    connectServerToChannel(server, otherServerChannel);

    // Create a setup proxy to add two rooms
    const setupProxy = createGameServerProxy(setupChannel);
    await setupProxy.offerRoomsCommand({
      kind: "AddEntity",
      entityType: "Room",
      id: "room1",
      initialState: {
        id: "room1",
        owner: "user1",
        code: "ABC123",
        guests: [],
        activeSession: { kind: "RoomNoSession" },
      },
    });

    await setupProxy.offerRoomsCommand({
      kind: "AddEntity",
      entityType: "Room",
      id: "room2",
      initialState: {
        id: "room2",
        owner: "user2",
        code: "XYZ789",
        guests: [],
        activeSession: { kind: "RoomNoSession" },
      },
    });

    const proxy = createGameServerProxy(clientChannel);

    const tracker1 = createCallbackTracker<RoomState>();
    const tracker2 = createCallbackTracker<RoomState>();

    // Act
    const unsubscribe1 = proxy.subscribeToRoom("room1", tracker1.callback);

    // Wait for room1 state
    await waitFor(() => tracker1.getCallCount() > 0);

    // Subscribe to room2 (should unsubscribe from room1)
    const unsubscribe2 = proxy.subscribeToRoom("room2", tracker2.callback);

    // Wait for room2 state
    await waitFor(() => tracker2.getCallCount() > 0);

    // Assert
    assert.equal(tracker1.getLastValue()?.id, "room1");
    assert.equal(tracker2.getLastValue()?.id, "room2");

    // Make a change to room1 via another client - tracker1 should not receive it
    const room1CallCount = tracker1.getCallCount();
    const otherClientProxy = createGameServerProxy(otherChannel);
    await otherClientProxy.offerRoomCommand({
      kind: "JoinRoom",
      roomId: "room1",
      userId: "user3",
      code: "ABC123",
    });

    // Wait a bit to ensure no callback happens
    await new Promise((resolve) => setTimeout(resolve, 100));

    assert.equal(
      tracker1.getCallCount(),
      room1CallCount,
      "Should not receive updates for unsubscribed room"
    );

    unsubscribe2();
  });

  test("should support multiple clients subscribing to rooms", async () => {
    // Arrange
    const { clientChannel: clientChannel1, serverChannel: serverChannel1 } =
      createChannelPair();
    const { clientChannel: clientChannel2, serverChannel: serverChannel2 } =
      createChannelPair();

    // Create server with broadcast callback that sends to both channels
    const server = createGameServer({
      maxSubscribers: 10,
      onBroadcast: (message, clientId) => {
        // Broadcast to both server channels
        serverChannel1.send(JSON.stringify(message), "");
        serverChannel2.send(JSON.stringify(message), "");
      },
    });

    // Wire server to receive messages from both channels
    connectServerToChannel(server, serverChannel1);
    connectServerToChannel(server, serverChannel2);

    const proxy1 = createGameServerProxy(clientChannel1);
    const proxy2 = createGameServerProxy(clientChannel2);

    const tracker1 = createCallbackTracker<RoomsProjection>();
    const tracker2 = createCallbackTracker<RoomsProjection>();

    // Act
    const unsubscribe1 = proxy1.subscribeToRooms(tracker1.callback);
    const unsubscribe2 = proxy2.subscribeToRooms(tracker2.callback);

    // Both clients should receive initial snapshots
    await waitFor(
      () => tracker1.getCallCount() > 0 && tracker2.getCallCount() > 0
    );

    // Add a room via one of the proxies
    await proxy1.offerRoomsCommand({
      kind: "AddEntity",
      entityType: "Room",
      id: "room1",
      initialState: {
        id: "room1",
        owner: "user1",
        code: "ABC123",
        guests: [],
        activeSession: { kind: "RoomNoSession" },
      },
    });

    // Assert - both clients should receive EntityAdded event
    await waitFor(() => {
      const proj1 = tracker1.getLastValue();
      const proj2 = tracker2.getLastValue();
      return !!(
        proj1 &&
        proj2 &&
        proj1.rooms.length === 1 &&
        proj2.rooms.length === 1
      );
    });

    assert.equal(tracker1.getLastValue()?.rooms.length, 1);
    assert.equal(tracker2.getLastValue()?.rooms.length, 1);

    unsubscribe1();
    unsubscribe2();
  });
});
