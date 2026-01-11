import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { roomsProjectionInitialState, roomsProjectionReducer, RoomsProjection } from "./rooms-projection";
import type { RoomState } from "./room";
import type { CollectionEvent } from "../fst/fst-collection";

describe("RoomsProjection", () => {
  describe("roomsProjectionInitialState", () => {
    test("should return empty projection", () => {
      // Act
      const state = roomsProjectionInitialState();

      // Assert
      assert.equal(state.kind, "RoomsProjection");
      assert.deepEqual(state.rooms, []);
    });
  });

  describe("roomsProjectionReducer", () => {
    describe("EntityAdded", () => {
      test("should add room to empty projection", () => {
        // Arrange
        const state = roomsProjectionInitialState();
        const event: CollectionEvent<RoomState, any> = {
          kind: "EntityAdded",
          entityType: "Room",
          id: "room-1",
          initialState: {
            owner: "alice",
            code: "ABC123",
            guests: [],
            activeSession: { kind: "RoomNoSession" },
          },
        };

        // Act
        const newState = roomsProjectionReducer(state, event);

        // Assert
        assert.equal(newState.rooms.length, 1);
        assert.equal(newState.rooms[0].entityId, "room-1");
        assert.equal(newState.rooms[0].roomOwner, "alice");
      });

      test("should add room to projection with existing rooms", () => {
        // Arrange
        const state: RoomsProjection = {
          kind: "RoomsProjection",
          rooms: [
            { entityId: "room-1", roomOwner: "alice" },
            { entityId: "room-2", roomOwner: "bob" },
          ],
        };
        const event: CollectionEvent<RoomState, any> = {
          kind: "EntityAdded",
          entityType: "Room",
          id: "room-3",
          initialState: {
            owner: "charlie",
            code: "XYZ789",
            guests: ["dave"],
            activeSession: { kind: "RoomNoSession" },
          },
        };

        // Act
        const newState = roomsProjectionReducer(state, event);

        // Assert
        assert.equal(newState.rooms.length, 3);
        assert.equal(newState.rooms[2].entityId, "room-3");
        assert.equal(newState.rooms[2].roomOwner, "charlie");
      });

      test("should preserve existing rooms when adding new room", () => {
        // Arrange
        const state: RoomsProjection = {
          kind: "RoomsProjection",
          rooms: [{ entityId: "room-1", roomOwner: "alice" }],
        };
        const event: CollectionEvent<RoomState, any> = {
          kind: "EntityAdded",
          entityType: "Room",
          id: "room-2",
          initialState: {
            owner: "bob",
            code: "CODE",
            guests: [],
            activeSession: { kind: "RoomNoSession" },
          },
        };

        // Act
        const newState = roomsProjectionReducer(state, event);

        // Assert
        assert.equal(newState.rooms[0].entityId, "room-1");
        assert.equal(newState.rooms[0].roomOwner, "alice");
      });
    });

    describe("EntityRemoved", () => {
      test("should remove room from projection", () => {
        // Arrange
        const state: RoomsProjection = {
          kind: "RoomsProjection",
          rooms: [
            { entityId: "room-1", roomOwner: "alice" },
            { entityId: "room-2", roomOwner: "bob" },
            { entityId: "room-3", roomOwner: "charlie" },
          ],
        };
        const event: CollectionEvent<RoomState, any> = {
          kind: "EntityRemoved",
          entityType: "Room",
          id: "room-2",
        };

        // Act
        const newState = roomsProjectionReducer(state, event);

        // Assert
        assert.equal(newState.rooms.length, 2);
        assert.equal(newState.rooms[0].entityId, "room-1");
        assert.equal(newState.rooms[1].entityId, "room-3");
      });

      test("should remove only the specified room", () => {
        // Arrange
        const state: RoomsProjection = {
          kind: "RoomsProjection",
          rooms: [
            { entityId: "room-1", roomOwner: "alice" },
            { entityId: "room-2", roomOwner: "bob" },
          ],
        };
        const event: CollectionEvent<RoomState, any> = {
          kind: "EntityRemoved",
          entityType: "Room",
          id: "room-1",
        };

        // Act
        const newState = roomsProjectionReducer(state, event);

        // Assert
        assert.equal(newState.rooms.length, 1);
        assert.equal(newState.rooms[0].entityId, "room-2");
        assert.equal(newState.rooms[0].roomOwner, "bob");
      });

      test("should handle removing non-existent room gracefully", () => {
        // Arrange
        const state: RoomsProjection = {
          kind: "RoomsProjection",
          rooms: [{ entityId: "room-1", roomOwner: "alice" }],
        };
        const event: CollectionEvent<RoomState, any> = {
          kind: "EntityRemoved",
          entityType: "Room",
          id: "room-999",
        };

        // Act
        const newState = roomsProjectionReducer(state, event);

        // Assert
        assert.equal(newState.rooms.length, 1);
        assert.equal(newState.rooms[0].entityId, "room-1");
      });

      test("should handle removing from empty projection", () => {
        // Arrange
        const state = roomsProjectionInitialState();
        const event: CollectionEvent<RoomState, any> = {
          kind: "EntityRemoved",
          entityType: "Room",
          id: "room-1",
        };

        // Act
        const newState = roomsProjectionReducer(state, event);

        // Assert
        assert.equal(newState.rooms.length, 0);
      });
    });

    describe("EntityUpdated", () => {
      test("should return state unchanged", () => {
        // Arrange
        const state: RoomsProjection = {
          kind: "RoomsProjection",
          rooms: [
            { entityId: "room-1", roomOwner: "alice" },
            { entityId: "room-2", roomOwner: "bob" },
          ],
        };
        const event: CollectionEvent<RoomState, any> = {
          kind: "EntityUpdated",
          entityType: "Room",
          id: "room-1",
          event: {
            kind: "IndexedEvent",
            index: 1,
            event: {
              kind: "GuestJoined",
              roomId: "room-1",
              userId: "charlie",
            },
          },
        };

        // Act
        const newState = roomsProjectionReducer(state, event);

        // Assert
        assert.equal(newState, state);
        assert.equal(newState.rooms.length, 2);
      });
    });

    describe("Complex scenarios", () => {
      test("should handle add, remove, add sequence", () => {
        // Arrange
        let state = roomsProjectionInitialState();

        // Act - Add room-1
        state = roomsProjectionReducer(state, {
          kind: "EntityAdded",
          entityType: "Room",
          id: "room-1",
          initialState: {
            owner: "alice",
            code: "CODE1",
            guests: [],
            activeSession: { kind: "RoomNoSession" },
          },
        });

        // Act - Add room-2
        state = roomsProjectionReducer(state, {
          kind: "EntityAdded",
          entityType: "Room",
          id: "room-2",
          initialState: {
            owner: "bob",
            code: "CODE2",
            guests: [],
            activeSession: { kind: "RoomNoSession" },
          },
        });

        // Act - Remove room-1
        state = roomsProjectionReducer(state, {
          kind: "EntityRemoved",
          entityType: "Room",
          id: "room-1",
        });

        // Act - Add room-3
        state = roomsProjectionReducer(state, {
          kind: "EntityAdded",
          entityType: "Room",
          id: "room-3",
          initialState: {
            owner: "charlie",
            code: "CODE3",
            guests: [],
            activeSession: { kind: "RoomNoSession" },
          },
        });

        // Assert
        assert.equal(state.rooms.length, 2);
        assert.equal(state.rooms[0].entityId, "room-2");
        assert.equal(state.rooms[0].roomOwner, "bob");
        assert.equal(state.rooms[1].entityId, "room-3");
        assert.equal(state.rooms[1].roomOwner, "charlie");
      });
    });
  });
});
