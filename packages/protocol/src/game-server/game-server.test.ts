import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "./game-server";

describe("Game Server", () => {
  test("should handle valid RoomCollectionCommand - AddEntity", () => {
    // Arrange
    const server = createGameServer();
    const message = {
      kind: "AddEntity",
      entityType: "Room",
      id: "room1",
      initialState: {
        owner: "user1",
        code: "ABC123",
        guests: [],
        activeSession: { kind: "RoomNoSession" },
      },
    };

    // Act
    const response = server.handleMessage(message);

    // Assert
    assert.equal(response.kind, "RoomCollectionResponse");
    if (response.kind === "RoomCollectionResponse") {
      assert.equal(response.result.kind, "Ok");
      if (response.result.kind === "Ok") {
        assert.equal(response.result.value.event.kind, "EntityAdded");
        assert.equal(response.result.value.event.entityType, "Room");
        assert.equal(response.result.value.event.id, "room1");
      }
    }

    const state = server.getState();
    assert.ok(state.rooms.getState().entities["room1"]);
  });

  test("should handle valid RoomCollectionCommand - UpdateEntity", () => {
    // Arrange
    const server = createGameServer();
    server.handleMessage({
      kind: "AddEntity",
      entityType: "Room",
      id: "room1",
      initialState: {
        owner: "user1",
        code: "ABC123",
        guests: [],
        activeSession: { kind: "RoomNoSession" },
      },
    });

    // Act
    const response = server.handleMessage({
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
    assert.equal(response.kind, "RoomCollectionResponse");
    if (response.kind === "RoomCollectionResponse") {
      assert.equal(response.result.kind, "Ok");
      if (response.result.kind === "Ok") {
        assert.equal(response.result.value.event.kind, "EntityUpdated");
        assert.equal(response.result.value.event.entityType, "Room");
        assert.equal(response.result.value.event.id, "room1");
        if (response.result.value.event.kind === "EntityUpdated") {
          assert.equal(response.result.value.event.event.event.kind, "GuestJoined");
          if (response.result.value.event.event.event.kind === "GuestJoined") {
            assert.equal(response.result.value.event.event.event.userId, "user2");
          }
        }
      }
    }

    const state = server.getState();
    const room = state.rooms.getState().entities["room1"];
    assert.ok(room);
    assert.deepEqual(room.getState().guests, ["user2"]);
  });

  test("should handle valid RoomCollectionCommand - RemoveEntity", () => {
    // Arrange
    const server = createGameServer();
    server.handleMessage({
      kind: "AddEntity",
      entityType: "Room",
      id: "room1",
      initialState: {
        owner: "user1",
        code: "ABC123",
        guests: [],
        activeSession: { kind: "RoomNoSession" },
      },
    });

    // Act
    const response = server.handleMessage({
      kind: "RemoveEntity",
      entityType: "Room",
      id: "room1",
    });

    // Assert
    assert.equal(response.kind, "RoomCollectionResponse");
    if (response.kind === "RoomCollectionResponse") {
      assert.equal(response.result.kind, "Ok");
      if (response.result.kind === "Ok") {
        assert.equal(response.result.value.event.kind, "EntityRemoved");
        assert.equal(response.result.value.event.entityType, "Room");
        assert.equal(response.result.value.event.id, "room1");
      }
    }

    const state = server.getState();
    assert.equal(state.rooms.getState().entities["room1"], undefined);
  });

  test("should return ValidationFailure for invalid message", () => {
    // Arrange
    const server = createGameServer();
    const invalidMessage = {
      kind: "InvalidKind",
      data: "some data",
    };

    // Act
    const response = server.handleMessage(invalidMessage);

    // Assert
    assert.equal(response.kind, "ValidationFailure");
    if (response.kind === "ValidationFailure") {
      assert.ok(response.message);
    }
  });

  test("should return ValidationFailure for message with missing fields", () => {
    // Arrange
    const server = createGameServer();
    const invalidMessage = {
      kind: "AddEntity",
      // missing required fields like entityType, id, initialState
    };

    // Act
    const response = server.handleMessage(invalidMessage);

    // Assert
    assert.equal(response.kind, "ValidationFailure");
    if (response.kind === "ValidationFailure") {
      assert.ok(response.message);
    }
  });

  test("should return error when adding duplicate room", () => {
    // Arrange
    const server = createGameServer();
    const addRoomMessage = {
      kind: "AddEntity",
      entityType: "Room",
      id: "room1",
      initialState: {
        owner: "user1",
        code: "ABC123",
        guests: [],
        activeSession: { kind: "RoomNoSession" },
      },
    };

    server.handleMessage(addRoomMessage);

    // Act
    const response = server.handleMessage(addRoomMessage);

    // Assert
    assert.equal(response.kind, "RoomCollectionResponse");
    if (response.kind === "RoomCollectionResponse") {
      assert.equal(response.result.kind, "Err");
      if (response.result.kind === "Err") {
        assert.equal(response.result.value.kind, "EntityAlreadyExists");
        if (response.result.value.kind === "EntityAlreadyExists") {
          assert.equal(response.result.value.entityType, "Room");
          assert.equal(response.result.value.id, "room1");
        }
      }
    }
  });

  test("should return error when updating non-existent room", () => {
    // Arrange
    const server = createGameServer();

    // Act
    const response = server.handleMessage({
      kind: "UpdateEntity",
      entityType: "Room",
      id: "nonexistent",
      command: {
        kind: "JoinRoom",
        roomId: "nonexistent",
        userId: "user1",
        code: "ABC123",
      },
    });

    // Assert
    assert.equal(response.kind, "RoomCollectionResponse");
    if (response.kind === "RoomCollectionResponse") {
      assert.equal(response.result.kind, "Err");
      if (response.result.kind === "Err") {
        assert.equal(response.result.value.kind, "EntityNotFound");
        if (response.result.value.kind === "EntityNotFound") {
          assert.equal(response.result.value.entityType, "Room");
          assert.equal(response.result.value.id, "nonexistent");
        }
      }
    }
  });

  test("should return entity error when room command fails", () => {
    // Arrange
    const server = createGameServer();
    server.handleMessage({
      kind: "AddEntity",
      entityType: "Room",
      id: "room1",
      initialState: {
        owner: "user1",
        code: "ABC123",
        guests: [],
        activeSession: { kind: "RoomNoSession" },
      },
    });

    // Act - Try to join with wrong code
    const response = server.handleMessage({
      kind: "UpdateEntity",
      entityType: "Room",
      id: "room1",
      command: {
        kind: "JoinRoom",
        roomId: "room1",
        userId: "user2",
        code: "WRONG",
      },
    });

    // Assert
    assert.equal(response.kind, "RoomCollectionResponse");
    if (response.kind === "RoomCollectionResponse") {
      assert.equal(response.result.kind, "Err");
      if (response.result.kind === "Err") {
        assert.equal(response.result.value.kind, "EntityError");
        if (response.result.value.kind === "EntityError") {
          assert.equal(response.result.value.entityType, "Room");
          assert.equal(response.result.value.id, "room1");
          assert.equal(response.result.value.error.kind, "InvalidRoomCode");
        }
      }
    }
  });
});
