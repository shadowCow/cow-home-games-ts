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

    // Add some rooms to the server before client subscribes
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

    // Act
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

    // Add a room
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

    const proxy = createGameServerProxy(clientChannel);
    const tracker = createCallbackTracker<RoomsProjection>();
    const unsubscribe = proxy.subscribeToRooms(tracker.callback);

    // Wait for initial snapshot with 1 room
    await waitFor(() => tracker.getCallCount() > 0);
    assert.equal(tracker.getLastValue()?.rooms.length, 1);

    // Act
    server.handleMessage({
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
    const server = createGameServer({ maxSubscribers: 10 });

    // Add a room to the server
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

    const proxy = createGameServerProxy(clientChannel);
    const tracker = createCallbackTracker<RoomState>();

    // Act
    const unsubscribe = proxy.subscribeToRoom("room1", tracker.callback);

    // TODO: Send room subscription message to server
    // TODO: Server should send room state snapshot

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
    const server = createGameServer({ maxSubscribers: 10 });

    // Add a room
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

    const proxy = createGameServerProxy(clientChannel);
    const tracker = createCallbackTracker<RoomState>();
    const unsubscribe = proxy.subscribeToRoom("room1", tracker.callback);

    // TODO: Wait for initial room state
    await waitFor(() => tracker.getCallCount() > 0);
    assert.equal(tracker.getLastValue()?.guests.length, 0);

    // Act
    server.handleMessage({
      kind: "UpdateEntity",
      entityType: "Room",
      id: "room1",
      command: {
        kind: "JoinRoom",
        roomId: "room1",
        userId: "user2",
        code: "ABC123",
      },
    });

    // TODO: Server should send EntityUpdated event with GuestJoined

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
    // Arrange
    const { clientChannel, serverChannel } = createChannelPair();
    const server = createGameServer({ maxSubscribers: 10 });

    // Add two rooms
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

    const proxy = createGameServerProxy(clientChannel);

    const tracker1 = createCallbackTracker<RoomState>();
    const tracker2 = createCallbackTracker<RoomState>();

    // Act
    const unsubscribe1 = proxy.subscribeToRoom("room1", tracker1.callback);

    // TODO: Wait for room1 state
    await waitFor(() => tracker1.getCallCount() > 0);

    // Subscribe to room2 (should unsubscribe from room1)
    const unsubscribe2 = proxy.subscribeToRoom("room2", tracker2.callback);

    // TODO: Wait for room2 state
    await waitFor(() => tracker2.getCallCount() > 0);

    // Assert
    assert.equal(tracker1.getLastValue()?.id, "room1");
    assert.equal(tracker2.getLastValue()?.id, "room2");

    // Make a change to room1 - tracker1 should not receive it
    const room1CallCount = tracker1.getCallCount();
    server.handleMessage({
      kind: "UpdateEntity",
      entityType: "Room",
      id: "room1",
      command: {
        kind: "JoinRoom",
        roomId: "room1",
        userId: "user3",
        code: "ABC123",
      },
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
    const server = createGameServer({ maxSubscribers: 10 });

    const { clientChannel: clientChannel1, serverChannel: serverChannel1 } =
      createChannelPair();
    const { clientChannel: clientChannel2, serverChannel: serverChannel2 } =
      createChannelPair();

    const proxy1 = createGameServerProxy(clientChannel1);
    const proxy2 = createGameServerProxy(clientChannel2);

    const tracker1 = createCallbackTracker<RoomsProjection>();
    const tracker2 = createCallbackTracker<RoomsProjection>();

    // Act
    const unsubscribe1 = proxy1.subscribeToRooms(tracker1.callback);
    const unsubscribe2 = proxy2.subscribeToRooms(tracker2.callback);

    // TODO: Both clients should receive initial snapshots
    await waitFor(() => tracker1.getCallCount() > 0 && tracker2.getCallCount() > 0);

    // Add a room
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

    // TODO: Both clients should receive EntityAdded event

    // Assert
    await waitFor(() => {
      const proj1 = tracker1.getLastValue();
      const proj2 = tracker2.getLastValue();
      return !!(
        proj1 && proj2 && proj1.rooms.length === 1 && proj2.rooms.length === 1
      );
    });

    assert.equal(tracker1.getLastValue()?.rooms.length, 1);
    assert.equal(tracker2.getLastValue()?.rooms.length, 1);

    unsubscribe1();
    unsubscribe2();
  });

  test("should handle client sending room command through proxy", async () => {
    // Arrange
    const { clientChannel, serverChannel } = createChannelPair();
    const server = createGameServer({ maxSubscribers: 10 });

    // Add a room
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

    const proxy = createGameServerProxy(clientChannel);

    // Act
    const result = await proxy.offerRoomCommand({
      kind: "JoinRoom",
      roomId: "room1",
      userId: "user2",
      code: "ABC123",
    });

    // TODO: Proxy should send UpdateEntity command to server
    // TODO: Server should process and return result

    // Assert
    assert.equal(result.kind, "Ok");
    if (result.kind === "Ok") {
      assert.equal(result.value.kind, "GuestJoined");
      if (result.value.kind === "GuestJoined") {
        assert.equal(result.value.userId, "user2");
      }
    }
  });

  test("should handle client sending rooms collection command through proxy", async () => {
    // Arrange
    const { clientChannel, serverChannel } = createChannelPair();
    const server = createGameServer({ maxSubscribers: 10 });
    const proxy = createGameServerProxy(clientChannel);

    // Act
    const result = await proxy.offerRoomsCommand({
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

    // TODO: Proxy should send AddEntity command to server
    // TODO: Server should process and return result

    // Assert
    assert.equal(result.kind, "Ok");
    if (result.kind === "Ok") {
      assert.equal(result.value.kind, "EntityAdded");
      assert.equal(result.value.id, "room1");
    }
  });
});
