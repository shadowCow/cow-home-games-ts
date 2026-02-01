import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createRoomLeader } from "./room";
import type { RoomCommand, RoomEvent, RoomError } from "./room";

describe("Room", () => {
  const VALID_CODE = "valid-code-123";
  const ROOM_ID = "room1";

  describe("Room Creation", () => {
    test("should create room with owner, code, and no guests", () => {
      // Arrange
      const ownerId = "owner123";
      const code = VALID_CODE;

      // Act
      const room = createRoomLeader(ROOM_ID, ownerId, code);
      const state = room.getState();

      // Assert
      assert.equal(state.owner, ownerId);
      assert.equal(state.code, code);
      assert.deepEqual(state.guests, []);
      assert.equal(state.activeSession.kind, "RoomNoSession");
    });
  });

  describe("JoinRoom", () => {
    test("should allow guest to join room with valid code", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);
      const command: RoomCommand = {
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest1",
        code: VALID_CODE,
      };

      // Act
      const result = room.handleCommand(command);

      // Assert
      assert.equal(result.kind, "Ok");
      if (result.kind === "Ok") {
        assert.equal(result.value.event.kind, "GuestJoined");
        if (result.value.event.kind === "GuestJoined") {
          assert.equal(result.value.event.userId, "guest1");
        }
      }

      const state = room.getState();
      assert.deepEqual(state.guests, ["guest1"]);
    });

    test("should allow multiple guests to join", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);

      // Act
      room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest1",
        code: VALID_CODE,
      });
      room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest2",
        code: VALID_CODE,
      });
      room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest3",
        code: VALID_CODE,
      });

      // Assert
      const state = room.getState();
      assert.deepEqual(state.guests, ["guest1", "guest2", "guest3"]);
    });

    test("should return error when guest already in room", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);
      room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest1",
        code: VALID_CODE,
      });

      // Act
      const result = room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest1",
        code: VALID_CODE,
      });

      // Assert
      assert.equal(result.kind, "Err");
      if (result.kind === "Err") {
        const error: RoomError = result.value;
        assert.equal(error.kind, "GuestAlreadyInRoom");
        if (error.kind === "GuestAlreadyInRoom") {
          assert.equal(error.userId, "guest1");
        }
      }
    });

    test("should return error when owner tries to join as guest", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);

      // Act
      const result = room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "owner123",
        code: VALID_CODE,
      });

      // Assert
      assert.equal(result.kind, "Err");
      if (result.kind === "Err") {
        const error: RoomError = result.value;
        assert.equal(error.kind, "GuestAlreadyInRoom");
        if (error.kind === "GuestAlreadyInRoom") {
          assert.equal(error.userId, "owner123");
        }
      }
    });

    test("should return error when code is invalid", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);

      // Act
      const result = room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest1",
        code: "wrong-code",
      });

      // Assert
      assert.equal(result.kind, "Err");
      if (result.kind === "Err") {
        const error: RoomError = result.value;
        assert.equal(error.kind, "InvalidRoomCode");
      }
    });
  });

  describe("LeaveRoom", () => {
    test("should allow guest to leave room", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);
      room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest1",
        code: VALID_CODE,
      });
      room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest2",
        code: VALID_CODE,
      });

      // Act
      const result = room.handleCommand({
        kind: "LeaveRoom",
        roomId: ROOM_ID,
        userId: "guest1",
      });

      // Assert
      assert.equal(result.kind, "Ok");
      if (result.kind === "Ok") {
        assert.equal(result.value.event.kind, "GuestLeft");
        if (result.value.event.kind === "GuestLeft") {
          assert.equal(result.value.event.userId, "guest1");
        }
      }

      const state = room.getState();
      assert.deepEqual(state.guests, ["guest2"]);
    });

    test("should return error when non-guest tries to leave", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);

      // Act
      const result = room.handleCommand({
        kind: "LeaveRoom",
        roomId: ROOM_ID,
        userId: "nonexistent",
      });

      // Assert
      assert.equal(result.kind, "Err");
      if (result.kind === "Err") {
        const error: RoomError = result.value;
        assert.equal(error.kind, "GuestNotInRoom");
        if (error.kind === "GuestNotInRoom") {
          assert.equal(error.userId, "nonexistent");
        }
      }
    });

    test("should return error when owner tries to leave", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);

      // Act
      const result = room.handleCommand({
        kind: "LeaveRoom",
        roomId: ROOM_ID,
        userId: "owner123",
      });

      // Assert
      assert.equal(result.kind, "Err");
      if (result.kind === "Err") {
        const error: RoomError = result.value;
        assert.equal(error.kind, "OwnerCannotLeave");
      }
    });
  });

  describe("RemoveGuest", () => {
    test("should allow owner to remove guest", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);
      room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest1",
        code: VALID_CODE,
      });
      room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest2",
        code: VALID_CODE,
      });

      // Act
      const result = room.handleCommand({
        kind: "RemoveGuest",
        roomId: ROOM_ID,
        requesterId: "owner123",
        guestId: "guest1",
      });

      // Assert
      assert.equal(result.kind, "Ok");
      if (result.kind === "Ok") {
        assert.equal(result.value.event.kind, "GuestRemoved");
        if (result.value.event.kind === "GuestRemoved") {
          assert.equal(result.value.event.guestId, "guest1");
        }
      }

      const state = room.getState();
      assert.deepEqual(state.guests, ["guest2"]);
    });

    test("should return error when non-owner tries to remove guest", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);
      room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest1",
        code: VALID_CODE,
      });
      room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest2",
        code: VALID_CODE,
      });

      // Act
      const result = room.handleCommand({
        kind: "RemoveGuest",
        roomId: ROOM_ID,
        requesterId: "guest1",
        guestId: "guest2",
      });

      // Assert
      assert.equal(result.kind, "Err");
      if (result.kind === "Err") {
        const error: RoomError = result.value;
        assert.equal(error.kind, "NotOwner");
        if (error.kind === "NotOwner") {
          assert.equal(error.userId, "guest1");
        }
      }
    });

    test("should return error when trying to remove non-existent guest", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);

      // Act
      const result = room.handleCommand({
        kind: "RemoveGuest",
        roomId: ROOM_ID,
        requesterId: "owner123",
        guestId: "nonexistent",
      });

      // Assert
      assert.equal(result.kind, "Err");
      if (result.kind === "Err") {
        const error: RoomError = result.value;
        assert.equal(error.kind, "GuestNotInRoom");
        if (error.kind === "GuestNotInRoom") {
          assert.equal(error.userId, "nonexistent");
        }
      }
    });
  });

  describe("StartGameSession", () => {
    test("should allow owner to start game session", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);

      // Act
      const result = room.handleCommand({
        kind: "StartGameSession",
        roomId: ROOM_ID,
        requesterId: "owner123",
        sessionId: "session456",
      });

      // Assert
      assert.equal(result.kind, "Ok");
      if (result.kind === "Ok") {
        assert.equal(result.value.event.kind, "GameSessionStarted");
        if (result.value.event.kind === "GameSessionStarted") {
          assert.equal(result.value.event.sessionId, "session456");
        }
      }

      const state = room.getState();
      assert.equal(state.activeSession.kind, "RoomSession");
      if (state.activeSession.kind === "RoomSession") {
        assert.equal(state.activeSession.sessionId, "session456");
      }
    });

    test("should return error when non-owner tries to start session", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);
      room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest1",
        code: VALID_CODE,
      });

      // Act
      const result = room.handleCommand({
        kind: "StartGameSession",
        roomId: ROOM_ID,
        requesterId: "guest1",
        sessionId: "session456",
      });

      // Assert
      assert.equal(result.kind, "Err");
      if (result.kind === "Err") {
        const error: RoomError = result.value;
        assert.equal(error.kind, "NotOwner");
        if (error.kind === "NotOwner") {
          assert.equal(error.userId, "guest1");
        }
      }
    });

    test("should return error when session already active", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);
      room.handleCommand({
        kind: "StartGameSession",
        roomId: ROOM_ID,
        requesterId: "owner123",
        sessionId: "session456",
      });

      // Act
      const result = room.handleCommand({
        kind: "StartGameSession",
        roomId: ROOM_ID,
        requesterId: "owner123",
        sessionId: "session789",
      });

      // Assert
      assert.equal(result.kind, "Err");
      if (result.kind === "Err") {
        const error: RoomError = result.value;
        assert.equal(error.kind, "SessionAlreadyActive");
      }
    });
  });

  describe("StartGameSessionBuilder", () => {
    test("should allow owner to start session builder", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);

      // Act
      const result = room.handleCommand({
        kind: "StartGameSessionBuilder",
        roomId: ROOM_ID,
        requesterId: "owner123",
        builderId: "builder789",
        gameId: "tic-tac-toe",
      });

      // Assert
      assert.equal(result.kind, "Ok");
      if (result.kind === "Ok") {
        assert.equal(result.value.event.kind, "GameSessionBuilderStarted");
        if (result.value.event.kind === "GameSessionBuilderStarted") {
          assert.equal(result.value.event.builderId, "builder789");
        }
      }

      const state = room.getState();
      assert.equal(state.activeSession.kind, "RoomSessionBuilder");
      if (state.activeSession.kind === "RoomSessionBuilder") {
        assert.equal(state.activeSession.builderId, "builder789");
      }
    });

    test("should return error when non-owner tries to start builder", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);
      room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest1",
        code: VALID_CODE,
      });

      // Act
      const result = room.handleCommand({
        kind: "StartGameSessionBuilder",
        roomId: ROOM_ID,
        requesterId: "guest1",
        builderId: "builder789",
        gameId: "tic-tac-toe",
      });

      // Assert
      assert.equal(result.kind, "Err");
      if (result.kind === "Err") {
        const error: RoomError = result.value;
        assert.equal(error.kind, "NotOwner");
        if (error.kind === "NotOwner") {
          assert.equal(error.userId, "guest1");
        }
      }
    });

    test("should return error when builder started while session active", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);
      room.handleCommand({
        kind: "StartGameSession",
        roomId: ROOM_ID,
        requesterId: "owner123",
        sessionId: "session456",
      });

      // Act
      const result = room.handleCommand({
        kind: "StartGameSessionBuilder",
        roomId: ROOM_ID,
        requesterId: "owner123",
        builderId: "builder789",
        gameId: "tic-tac-toe",
      });

      // Assert
      assert.equal(result.kind, "Err");
      if (result.kind === "Err") {
        const error: RoomError = result.value;
        assert.equal(error.kind, "SessionAlreadyActive");
      }
    });
  });

  describe("ClearRoomSession", () => {
    test("should allow owner to clear active session", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);
      room.handleCommand({
        kind: "StartGameSession",
        roomId: ROOM_ID,
        requesterId: "owner123",
        sessionId: "session456",
      });

      // Act
      const result = room.handleCommand({
        kind: "ClearRoomSession",
        roomId: ROOM_ID,
        requesterId: "owner123",
      });

      // Assert
      assert.equal(result.kind, "Ok");
      if (result.kind === "Ok") {
        assert.equal(result.value.event.kind, "RoomSessionCleared");
      }

      const state = room.getState();
      assert.equal(state.activeSession.kind, "RoomNoSession");
    });

    test("should allow owner to clear active builder", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);
      room.handleCommand({
        kind: "StartGameSessionBuilder",
        roomId: ROOM_ID,
        requesterId: "owner123",
        builderId: "builder789",
        gameId: "tic-tac-toe",
      });

      // Act
      const result = room.handleCommand({
        kind: "ClearRoomSession",
        roomId: ROOM_ID,
        requesterId: "owner123",
      });

      // Assert
      assert.equal(result.kind, "Ok");
      if (result.kind === "Ok") {
        assert.equal(result.value.event.kind, "RoomSessionCleared");
      }

      const state = room.getState();
      assert.equal(state.activeSession.kind, "RoomNoSession");
    });

    test("should return error when non-owner tries to clear session", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);
      room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest1",
        code: VALID_CODE,
      });
      room.handleCommand({
        kind: "StartGameSession",
        roomId: ROOM_ID,
        requesterId: "owner123",
        sessionId: "session456",
      });

      // Act
      const result = room.handleCommand({
        kind: "ClearRoomSession",
        roomId: ROOM_ID,
        requesterId: "guest1",
      });

      // Assert
      assert.equal(result.kind, "Err");
      if (result.kind === "Err") {
        const error: RoomError = result.value;
        assert.equal(error.kind, "NotOwner");
        if (error.kind === "NotOwner") {
          assert.equal(error.userId, "guest1");
        }
      }
    });

    test("should succeed when clearing with no active session", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);

      // Act
      const result = room.handleCommand({
        kind: "ClearRoomSession",
        roomId: ROOM_ID,
        requesterId: "owner123",
      });

      // Assert
      assert.equal(result.kind, "Ok");
      if (result.kind === "Ok") {
        assert.equal(result.value.event.kind, "RoomSessionCleared");
      }

      const state = room.getState();
      assert.equal(state.activeSession.kind, "RoomNoSession");
    });
  });

  describe("ChangeRoomCode", () => {
    test("should allow owner to change room code", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);
      const newCode = "new-code-456";

      // Act
      const result = room.handleCommand({
        kind: "ChangeRoomCode",
        roomId: ROOM_ID,
        requesterId: "owner123",
        newCode: newCode,
      });

      // Assert
      assert.equal(result.kind, "Ok");
      if (result.kind === "Ok") {
        assert.equal(result.value.event.kind, "RoomCodeChanged");
        if (result.value.event.kind === "RoomCodeChanged") {
          assert.equal(result.value.event.newCode, newCode);
        }
      }

      const state = room.getState();
      assert.equal(state.code, newCode);
    });

    test("should return error when non-owner tries to change code", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);
      room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest1",
        code: VALID_CODE,
      });

      // Act
      const result = room.handleCommand({
        kind: "ChangeRoomCode",
        roomId: ROOM_ID,
        requesterId: "guest1",
        newCode: "new-code",
      });

      // Assert
      assert.equal(result.kind, "Err");
      if (result.kind === "Err") {
        const error: RoomError = result.value;
        assert.equal(error.kind, "NotOwner");
        if (error.kind === "NotOwner") {
          assert.equal(error.userId, "guest1");
        }
      }
    });

    test("should invalidate old code after change", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);
      const newCode = "new-code-456";
      room.handleCommand({
        kind: "ChangeRoomCode",
        roomId: ROOM_ID,
        requesterId: "owner123",
        newCode: newCode,
      });

      // Act - Try to join with old code
      const resultOld = room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest1",
        code: VALID_CODE,
      });

      // Assert
      assert.equal(resultOld.kind, "Err");
      if (resultOld.kind === "Err") {
        assert.equal(resultOld.value.kind, "InvalidRoomCode");
      }

      // Act - Try to join with new code
      const resultNew = room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest1",
        code: newCode,
      });

      // Assert
      assert.equal(resultNew.kind, "Ok");
    });
  });

  describe("Complex Scenarios", () => {
    test("should handle full room lifecycle", () => {
      // Arrange
      const room = createRoomLeader(ROOM_ID, "owner123", VALID_CODE);

      // Act & Assert - Guests join
      room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest1",
        code: VALID_CODE,
      });
      room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest2",
        code: VALID_CODE,
      });
      room.handleCommand({
        kind: "JoinRoom",
        roomId: ROOM_ID,
        userId: "guest3",
        code: VALID_CODE,
      });
      let state = room.getState();
      assert.deepEqual(state.guests, ["guest1", "guest2", "guest3"]);

      // Act & Assert - Start builder
      room.handleCommand({
        kind: "StartGameSessionBuilder",
        roomId: ROOM_ID,
        requesterId: "owner123",
        builderId: "builder1",
        gameId: "tic-tac-toe",
      });
      state = room.getState();
      assert.equal(state.activeSession.kind, "RoomSessionBuilder");

      // Act & Assert - Clear and start session
      room.handleCommand({
        kind: "ClearRoomSession",
        roomId: ROOM_ID,
        requesterId: "owner123",
      });
      room.handleCommand({
        kind: "StartGameSession",
        roomId: ROOM_ID,
        requesterId: "owner123",
        sessionId: "session1",
      });
      state = room.getState();
      assert.equal(state.activeSession.kind, "RoomSession");

      // Act & Assert - Guest leaves
      room.handleCommand({
        kind: "LeaveRoom",
        roomId: ROOM_ID,
        userId: "guest2",
      });
      state = room.getState();
      assert.deepEqual(state.guests, ["guest1", "guest3"]);

      // Act & Assert - Owner removes guest
      room.handleCommand({
        kind: "RemoveGuest",
        roomId: ROOM_ID,
        requesterId: "owner123",
        guestId: "guest3",
      });
      state = room.getState();
      assert.deepEqual(state.guests, ["guest1"]);
    });
  });
});
