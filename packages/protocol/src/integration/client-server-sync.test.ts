import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createGameServer, GameServer } from "../game-server/game-server";
import {
  createGameClient,
  GameClient,
  GameClientMessage,
} from "../game-client/game-client";
import type { RoomCollectionCommand } from "../room/room-collection";
import type { IndexedEvent } from "../fst/fst";
import type { RoomCollectionEvent } from "../room/room-collection";

// ========================================
// Test Helpers
// ========================================

type TestEnv = {
  server: GameServer;
  clients: Map<string, GameClient>;
};

function createTestEnvironment(clientIds: string[]): TestEnv {
  const clients = new Map<string, GameClient>();

  // Create server with broadcast callback
  const server = createGameServer({
    maxSubscribers: 100,
    onBroadcast: (message: GameClientMessage, clientId: string) => {
      const client = clients.get(clientId);
      if (client) {
        const result = client.handleMessage(message);
        assert.equal(
          result.kind,
          "Ok",
          `Client ${clientId} should handle broadcast successfully`
        );
      }
    },
  });

  // Register and sync all clients
  for (const id of clientIds) {
    const client = createGameClient();
    clients.set(id, client);
    server.registerClient(id);
    server.syncClient(id);
  }

  return { server, clients };
}

function sendCommand(
  env: TestEnv,
  command: RoomCollectionCommand
): IndexedEvent<RoomCollectionEvent> {
  // Server processes command and automatically broadcasts to clients
  const response = env.server.handleMessage(command);

  // Assert - Command should succeed
  assert.equal(response.kind, "RoomCollectionResponse");
  if (response.kind === "RoomCollectionResponse") {
    assert.equal(response.result.kind, "Ok");
    if (response.result.kind === "Ok") {
      return response.result.value;
    }
  }

  throw new Error("Command failed unexpectedly");
}

// ========================================
// Integration Tests
// ========================================

describe("Client-Server Synchronization", () => {
  test("should sync multiple clients when adding room", () => {
    // Arrange
    const env = createTestEnvironment(["client1", "client2", "client3"]);

    // Act
    sendCommand(env, {
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
    const serverRooms = env.server.getState().rooms.getState().entities;
    assert.ok(serverRooms["room1"], "Server should have room1");

    for (const [clientId, client] of env.clients) {
      const clientRooms = client.getState().rooms.getState().entities;
      assert.ok(clientRooms["room1"], `Client ${clientId} should have room1`);

      const clientRoom = clientRooms["room1"];
      const serverRoom = serverRooms["room1"];

      assert.deepEqual(
        clientRoom.getState(),
        serverRoom.getState(),
        `Client ${clientId} state should match server`
      );
    }
  });

  test("should sync all clients when guest joins room", () => {
    // Arrange
    const env = createTestEnvironment(["client1", "client2"]);

    sendCommand(env, {
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

    // Act
    sendCommand(env, {
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

    // Assert
    const client1Guests = env.clients
      .get("client1")!
      .getState()
      .rooms.getState()
      .entities["room1"].getState().guests;

    const client2Guests = env.clients
      .get("client2")!
      .getState()
      .rooms.getState()
      .entities["room1"].getState().guests;

    assert.deepEqual(client1Guests, ["user2"]);
    assert.deepEqual(client2Guests, ["user2"]);
  });

  test("should sync late-joining client via snapshot", () => {
    // Arrange
    const env = createTestEnvironment(["client1"]);

    // Perform some operations
    sendCommand(env, {
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

    sendCommand(env, {
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

    sendCommand(env, {
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

    // Act - New client joins late
    const lateClient = createGameClient();
    env.clients.set("lateClient", lateClient);
    env.server.registerClient("lateClient");
    env.server.syncClient("lateClient");

    // Assert

    const lateClientRoom = lateClient.getState().rooms.getState().entities[
      "room1"
    ];
    const client1Room = env.clients.get("client1")!.getState().rooms.getState()
      .entities["room1"];

    assert.deepEqual(lateClientRoom.getState(), client1Room.getState());
    assert.equal(
      lateClientRoom.getLastAppliedIndex(),
      client1Room.getLastAppliedIndex()
    );
    assert.deepEqual(lateClientRoom.getState().guests, ["user2", "user3"]);
  });

  test("should handle multiple room operations across clients", () => {
    // Arrange
    const env = createTestEnvironment(["client1", "client2", "client3"]);

    // Act - Create multiple rooms
    sendCommand(env, {
      kind: "AddEntity",
      entityType: "Room",
      id: "room1",
      initialState: {
        id: "room1",
        owner: "user1",
        code: "ABC",
        guests: [],
        activeSession: { kind: "RoomNoSession" },
      },
    });

    sendCommand(env, {
      kind: "AddEntity",
      entityType: "Room",
      id: "room2",
      initialState: {
        id: "room1",
        owner: "user2",
        code: "XYZ",
        guests: [],
        activeSession: { kind: "RoomNoSession" },
      },
    });

    // Guest joins room1
    sendCommand(env, {
      kind: "UpdateEntity",
      entityType: "Room",
      id: "room1",
      command: {
        kind: "JoinRoom",
        roomId: "room1",
        userId: "user3",
        code: "ABC",
      },
    });

    // Guest joins room2
    sendCommand(env, {
      kind: "UpdateEntity",
      entityType: "Room",
      id: "room2",
      command: {
        kind: "JoinRoom",
        roomId: "room2",
        userId: "user4",
        code: "XYZ",
      },
    });

    // Start session in room1
    sendCommand(env, {
      kind: "UpdateEntity",
      entityType: "Room",
      id: "room1",
      command: {
        kind: "StartGameSession",
        roomId: "room1",
        requesterId: "user1",
        sessionId: "session123",
      },
    });

    // Assert - All clients have same state
    for (const [clientId, client] of env.clients) {
      const rooms = client.getState().rooms.getState().entities;

      assert.ok(rooms["room1"], `${clientId} should have room1`);
      assert.ok(rooms["room2"], `${clientId} should have room2`);

      assert.deepEqual(
        rooms["room1"].getState().guests,
        ["user3"],
        `${clientId} room1 guests should match`
      );

      assert.deepEqual(
        rooms["room2"].getState().guests,
        ["user4"],
        `${clientId} room2 guests should match`
      );

      assert.equal(
        rooms["room1"].getState().activeSession.kind,
        "RoomSession",
        `${clientId} room1 should have active session`
      );

      assert.equal(
        rooms["room2"].getState().activeSession.kind,
        "RoomNoSession",
        `${clientId} room2 should have no session`
      );
    }
  });

  test("should handle room removal across clients", () => {
    // Arrange
    const env = createTestEnvironment(["client1", "client2"]);

    sendCommand(env, {
      kind: "AddEntity",
      entityType: "Room",
      id: "room1",
      initialState: {
        id: "room1",
        owner: "user1",
        code: "ABC",
        guests: [],
        activeSession: { kind: "RoomNoSession" },
      },
    });

    // Act - Remove room
    sendCommand(env, {
      kind: "RemoveEntity",
      entityType: "Room",
      id: "room1",
    });

    // Assert
    const serverRooms = env.server.getState().rooms.getState().entities;
    assert.equal(
      serverRooms["room1"],
      undefined,
      "Server should not have room1"
    );

    for (const [clientId, client] of env.clients) {
      const clientRooms = client.getState().rooms.getState().entities;
      assert.equal(
        clientRooms["room1"],
        undefined,
        `${clientId} should not have room1`
      );
    }
  });

  test("should verify collection and entity indices are separate", () => {
    // Arrange
    const env = createTestEnvironment(["client1"]);

    // Act - Add room (collection event index 1)
    sendCommand(env, {
      kind: "AddEntity",
      entityType: "Room",
      id: "room1",
      initialState: {
        id: "room1",
        owner: "user1",
        code: "ABC",
        guests: [],
        activeSession: { kind: "RoomNoSession" },
      },
    });

    // Update room with JoinRoom (collection event index 2, room event index 1)
    sendCommand(env, {
      kind: "UpdateEntity",
      entityType: "Room",
      id: "room1",
      command: {
        kind: "JoinRoom",
        roomId: "room1",
        userId: "user2",
        code: "ABC",
      },
    });

    // Update room with another JoinRoom (collection event index 3, room event index 2)
    sendCommand(env, {
      kind: "UpdateEntity",
      entityType: "Room",
      id: "room1",
      command: {
        kind: "JoinRoom",
        roomId: "room1",
        userId: "user3",
        code: "ABC",
      },
    });

    // Assert
    const client = env.clients.get("client1")!;
    const collectionIndex = client.getState().rooms.getLastAppliedIndex();
    const roomIndex = client
      .getState()
      .rooms.getState()
      .entities["room1"].getLastAppliedIndex();

    assert.equal(collectionIndex, 3, "Collection should have applied 3 events");
    assert.equal(
      roomIndex,
      2,
      "Room should have applied 2 events (2 JoinRoom commands)"
    );
  });
});
