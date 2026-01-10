import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createGameClient } from "./game-client";
import type { RoomState } from "../room/room";

describe("GameClient", () => {
  test("should create client with empty room collection", () => {
    // Arrange & Act
    const client = createGameClient();
    const state = client.getState();

    // Assert
    assert.deepEqual(state.rooms.getState().entities, {});
    assert.equal(state.rooms.getLastAppliedIndex(), 0);
  });

  test("should return ValidationFailure for invalid message", () => {
    // Arrange
    const client = createGameClient();
    const invalidMessage = { kind: "InvalidMessageType" };

    // Act
    const result = client.handleMessage(invalidMessage);

    // Assert
    assert.equal(result.kind, "ValidationFailure");
  });

  test("should apply RoomCollectionEvent message", () => {
    // Arrange
    const client = createGameClient();
    const initialState: RoomState = {
      owner: "user1",
      code: "ABC123",
      guests: [],
      activeSession: { kind: "RoomNoSession" },
    };

    const eventMessage = {
      kind: "RoomCollectionEvent",
      event: {
        index: 1,
        event: {
          kind: "EntityAdded",
          entityType: "Room",
          id: "room1",
          initialState,
        },
      },
    };

    // Act
    const result = client.handleMessage(eventMessage);

    // Assert
    assert.equal(result.kind, "Ok");
    const state = client.getState();
    assert.ok(state.rooms.getState().entities["room1"]);
    assert.equal(state.rooms.getLastAppliedIndex(), 1);
  });

  test("should apply RoomCollectionSnapshot message", () => {
    // Arrange
    const client = createGameClient();
    const room1State: RoomState = {
      owner: "user1",
      code: "ABC123",
      guests: ["user2"],
      activeSession: { kind: "RoomNoSession" },
    };

    const room2State: RoomState = {
      owner: "user3",
      code: "XYZ789",
      guests: [],
      activeSession: { kind: "RoomSession", sessionId: "session1" },
    };

    const snapshotMessage = {
      kind: "RoomCollectionSnapshot",
      snapshot: {
        entities: {
          room1: { state: room1State, lastAppliedIndex: 0 },
          room2: { state: room2State, lastAppliedIndex: 0 },
        },
        lastAppliedIndex: 5,
      },
    };

    // Act
    const result = client.handleMessage(snapshotMessage);

    // Assert
    assert.equal(result.kind, "Ok");
    const state = client.getState();
    assert.ok(state.rooms.getState().entities["room1"]);
    assert.ok(state.rooms.getState().entities["room2"]);
    assert.equal(state.rooms.getLastAppliedIndex(), 5);

    // Verify room states
    const room1 = state.rooms.getState().entities["room1"];
    assert.deepEqual(room1.getState().guests, ["user2"]);

    const room2 = state.rooms.getState().entities["room2"];
    assert.equal(room2.getState().activeSession.kind, "RoomSession");
  });

  test("should detect event gap", () => {
    // Arrange
    const client = createGameClient();

    // Client receives event at index 1
    const event1 = {
      kind: "RoomCollectionEvent",
      event: {
        index: 1,
        event: {
          kind: "EntityAdded",
          entityType: "Room",
          id: "room1",
          initialState: {
            owner: "user1",
            code: "ABC123",
            guests: [],
            activeSession: { kind: "RoomNoSession" },
          },
        },
      },
    };

    client.handleMessage(event1);

    // Act - Client receives event at index 5 (gap!)
    const event5 = {
      kind: "RoomCollectionEvent",
      event: {
        index: 5,
        event: {
          kind: "EntityAdded",
          entityType: "Room",
          id: "room2",
          initialState: {
            owner: "user2",
            code: "XYZ789",
            guests: [],
            activeSession: { kind: "RoomNoSession" },
          },
        },
      },
    };

    const result = client.handleMessage(event5);

    // Assert
    assert.equal(result.kind, "Err");
    if (result.kind === "Err") {
      assert.equal(result.value.kind, "EventGap");
      assert.equal(result.value.receivedIndex, 5);
      assert.equal(result.value.expectedIndex, 2);
    }
  });

  test("should detect duplicate event", () => {
    // Arrange
    const client = createGameClient();

    const event = {
      kind: "RoomCollectionEvent",
      event: {
        index: 1,
        event: {
          kind: "EntityAdded",
          entityType: "Room",
          id: "room1",
          initialState: {
            owner: "user1",
            code: "ABC123",
            guests: [],
            activeSession: { kind: "RoomNoSession" },
          },
        },
      },
    };

    // Apply event first time
    const result1 = client.handleMessage(event);
    assert.equal(result1.kind, "Ok");

    // Act - Apply same event again
    const result2 = client.handleMessage(event);

    // Assert
    assert.equal(result2.kind, "Err");
    if (result2.kind === "Err") {
      assert.equal(result2.value.kind, "DuplicateEvent");
      assert.equal(result2.value.receivedIndex, 1);
      assert.equal(result2.value.lastAppliedIndex, 1);
    }
  });

  test("should reject stale snapshot", () => {
    // Arrange
    const client = createGameClient();

    // Apply snapshot at index 10
    const snapshot1 = {
      kind: "RoomCollectionSnapshot",
      snapshot: {
        entities: {},
        lastAppliedIndex: 10,
      },
    };

    client.handleMessage(snapshot1);

    // Act - Try to apply older snapshot at index 5
    const snapshot2 = {
      kind: "RoomCollectionSnapshot",
      snapshot: {
        entities: {},
        lastAppliedIndex: 5,
      },
    };

    const result = client.handleMessage(snapshot2);

    // Assert
    assert.equal(result.kind, "Err");
    if (result.kind === "Err") {
      assert.equal(result.value.kind, "StaleSnapshot");
      assert.equal(result.value.snapshotIndex, 5);
      assert.equal(result.value.lastAppliedIndex, 10);
    }
  });

  test("should handle EntityUpdated events", () => {
    // Arrange
    const client = createGameClient();

    // First, add a room
    const addRoomEvent = {
      kind: "RoomCollectionEvent",
      event: {
        index: 1,
        event: {
          kind: "EntityAdded",
          entityType: "Room",
          id: "room1",
          initialState: {
            owner: "user1",
            code: "ABC123",
            guests: [],
            activeSession: { kind: "RoomNoSession" },
          },
        },
      },
    };

    client.handleMessage(addRoomEvent);

    // Act - Guest joins the room
    const updateRoomEvent = {
      kind: "RoomCollectionEvent",
      event: {
        index: 2,
        event: {
          kind: "EntityUpdated",
          entityType: "Room",
          id: "room1",
          event: {
            index: 1,
            event: {
              kind: "GuestJoined",
              roomId: "room1",
              userId: "user2",
            },
          },
        },
      },
    };

    const result = client.handleMessage(updateRoomEvent);

    // Assert
    assert.equal(result.kind, "Ok");
    const state = client.getState();
    const room1 = state.rooms.getState().entities["room1"];
    assert.deepEqual(room1.getState().guests, ["user2"]);
    assert.equal(room1.getLastAppliedIndex(), 1);
  });
});
