import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ok, err } from "@cow-sunday/fp-ts";
import { createFstLeader, createFstFollower, Snapshot } from "./fst";

// ========================================
// Test Counter Types
// ========================================

type CounterState = { count: number };

type CounterCommand = { kind: "Increment"; amount: number } | { kind: "Decrement"; amount: number };

type CounterEvent = { kind: "Incremented"; amount: number } | { kind: "Decremented"; amount: number };

type CounterError = { kind: "NegativeResult" };

// ========================================
// Test Counter FST Factory
// ========================================

function createCounterLeader(snapshot: Snapshot<CounterState>) {
  return createFstLeader<CounterState, CounterCommand, CounterEvent, CounterError, void>(
    (state, command) => {
      switch (command.kind) {
        case "Increment":
          return ok({ kind: "Incremented", amount: command.amount });
        case "Decrement":
          if (state.count - command.amount < 0) {
            return err({ kind: "NegativeResult" });
          }
          return ok({ kind: "Decremented", amount: command.amount });
      }
    },
    (state, event) => {
      switch (event.kind) {
        case "Incremented":
          return { count: state.count + event.amount };
        case "Decremented":
          return { count: state.count - event.amount };
      }
    },
    undefined,
    snapshot
  );
}

function createCounterFollower(initialState: CounterState) {
  return createFstFollower<CounterState, CounterEvent>(
    (state, event) => {
      switch (event.kind) {
        case "Incremented":
          return { count: state.count + event.amount };
        case "Decremented":
          return { count: state.count - event.amount };
      }
    },
    initialState
  );
}

// ========================================
// FST Leader Tests
// ========================================

describe("FST Leader", () => {
  describe("Initialization", () => {
    test("should create leader with initial snapshot", () => {
      // Arrange
      const snapshot: Snapshot<CounterState> = {
        state: { count: 5 },
        lastAppliedIndex: 0,
      };

      // Act
      const leader = createCounterLeader(snapshot);

      // Assert
      assert.deepEqual(leader.getState(), { count: 5 });
      assert.equal(leader.getCurrentIndex(), 0);
    });

    test("should create leader with non-zero lastAppliedIndex", () => {
      // Arrange
      const snapshot: Snapshot<CounterState> = {
        state: { count: 10 },
        lastAppliedIndex: 5,
      };

      // Act
      const leader = createCounterLeader(snapshot);

      // Assert
      assert.deepEqual(leader.getState(), { count: 10 });
      assert.equal(leader.getCurrentIndex(), 5);
    });
  });

  describe("handleCommand", () => {
    test("should handle valid command and return indexed event", () => {
      // Arrange
      const leader = createCounterLeader({ state: { count: 0 }, lastAppliedIndex: 0 });
      const command: CounterCommand = { kind: "Increment", amount: 3 };

      // Act
      const result = leader.handleCommand(command);

      // Assert
      assert.equal(result.kind, "Ok");
      if (result.kind === "Ok") {
        assert.equal(result.value.index, 1);
        assert.equal(result.value.event.kind, "Incremented");
        assert.equal(result.value.event.amount, 3);
      }
    });

    test("should apply event and update state", () => {
      // Arrange
      const leader = createCounterLeader({ state: { count: 0 }, lastAppliedIndex: 0 });

      // Act
      leader.handleCommand({ kind: "Increment", amount: 5 });

      // Assert
      assert.deepEqual(leader.getState(), { count: 5 });
    });

    test("should increment index with each command", () => {
      // Arrange
      const leader = createCounterLeader({ state: { count: 0 }, lastAppliedIndex: 0 });

      // Act
      leader.handleCommand({ kind: "Increment", amount: 1 });
      leader.handleCommand({ kind: "Increment", amount: 2 });
      leader.handleCommand({ kind: "Increment", amount: 3 });

      // Assert
      assert.equal(leader.getCurrentIndex(), 3);
      assert.deepEqual(leader.getState(), { count: 6 });
    });

    test("should return error for invalid command", () => {
      // Arrange
      const leader = createCounterLeader({ state: { count: 2 }, lastAppliedIndex: 0 });

      // Act
      const result = leader.handleCommand({ kind: "Decrement", amount: 5 });

      // Assert
      assert.equal(result.kind, "Err");
      if (result.kind === "Err") {
        assert.equal(result.value.kind, "NegativeResult");
      }
    });

    test("should not update state or index on error", () => {
      // Arrange
      const leader = createCounterLeader({ state: { count: 2 }, lastAppliedIndex: 0 });

      // Act
      leader.handleCommand({ kind: "Decrement", amount: 5 });

      // Assert
      assert.deepEqual(leader.getState(), { count: 2 });
      assert.equal(leader.getCurrentIndex(), 0);
    });

    test("should handle multiple commands correctly", () => {
      // Arrange
      const leader = createCounterLeader({ state: { count: 10 }, lastAppliedIndex: 0 });

      // Act
      leader.handleCommand({ kind: "Increment", amount: 5 });
      leader.handleCommand({ kind: "Decrement", amount: 3 });
      leader.handleCommand({ kind: "Increment", amount: 2 });

      // Assert
      assert.deepEqual(leader.getState(), { count: 14 });
      assert.equal(leader.getCurrentIndex(), 3);
    });
  });

  describe("getSnapshot", () => {
    test("should return snapshot with current state and index", () => {
      // Arrange
      const leader = createCounterLeader({ state: { count: 0 }, lastAppliedIndex: 0 });
      leader.handleCommand({ kind: "Increment", amount: 5 });
      leader.handleCommand({ kind: "Increment", amount: 3 });

      // Act
      const snapshot = leader.getSnapshot();

      // Assert
      assert.deepEqual(snapshot.state, { count: 8 });
      assert.equal(snapshot.lastAppliedIndex, 2);
    });

    test("should return snapshot that can be used to create new leader", () => {
      // Arrange
      const leader1 = createCounterLeader({ state: { count: 0 }, lastAppliedIndex: 0 });
      leader1.handleCommand({ kind: "Increment", amount: 10 });
      leader1.handleCommand({ kind: "Decrement", amount: 3 });

      // Act
      const snapshot = leader1.getSnapshot();
      const leader2 = createCounterLeader(snapshot);

      // Assert
      assert.deepEqual(leader2.getState(), { count: 7 });
      assert.equal(leader2.getCurrentIndex(), 2);
    });
  });
});

// ========================================
// FST Follower Tests
// ========================================

describe("FST Follower", () => {
  describe("Initialization", () => {
    test("should create follower with initial state", () => {
      // Arrange & Act
      const follower = createCounterFollower({ count: 5 });

      // Assert
      assert.deepEqual(follower.getState(), { count: 5 });
      assert.equal(follower.getLastAppliedIndex(), 0);
    });
  });

  describe("applyEvent", () => {
    test("should apply valid sequential event", () => {
      // Arrange
      const follower = createCounterFollower({ count: 0 });

      // Act
      const result = follower.applyEvent({
        index: 1,
        event: { kind: "Incremented", amount: 5 },
      });

      // Assert
      assert.equal(result.kind, "Ok");
      assert.deepEqual(follower.getState(), { count: 5 });
      assert.equal(follower.getLastAppliedIndex(), 1);
    });

    test("should apply multiple sequential events", () => {
      // Arrange
      const follower = createCounterFollower({ count: 0 });

      // Act
      follower.applyEvent({ index: 1, event: { kind: "Incremented", amount: 5 } });
      follower.applyEvent({ index: 2, event: { kind: "Incremented", amount: 3 } });
      follower.applyEvent({ index: 3, event: { kind: "Decremented", amount: 2 } });

      // Assert
      assert.deepEqual(follower.getState(), { count: 6 });
      assert.equal(follower.getLastAppliedIndex(), 3);
    });

    test("should return error for duplicate event", () => {
      // Arrange
      const follower = createCounterFollower({ count: 0 });
      follower.applyEvent({ index: 1, event: { kind: "Incremented", amount: 5 } });

      // Act
      const result = follower.applyEvent({
        index: 1,
        event: { kind: "Incremented", amount: 3 },
      });

      // Assert
      assert.equal(result.kind, "Err");
      if (result.kind === "Err") {
        assert.equal(result.value.kind, "DuplicateEvent");
        assert.equal(result.value.receivedIndex, 1);
        assert.equal(result.value.lastAppliedIndex, 1);
      }
    });

    test("should not update state on duplicate event", () => {
      // Arrange
      const follower = createCounterFollower({ count: 0 });
      follower.applyEvent({ index: 1, event: { kind: "Incremented", amount: 5 } });

      // Act
      follower.applyEvent({ index: 1, event: { kind: "Incremented", amount: 100 } });

      // Assert
      assert.deepEqual(follower.getState(), { count: 5 });
      assert.equal(follower.getLastAppliedIndex(), 1);
    });

    test("should return error for event with gap", () => {
      // Arrange
      const follower = createCounterFollower({ count: 0 });
      follower.applyEvent({ index: 1, event: { kind: "Incremented", amount: 5 } });

      // Act
      const result = follower.applyEvent({
        index: 3,
        event: { kind: "Incremented", amount: 3 },
      });

      // Assert
      assert.equal(result.kind, "Err");
      if (result.kind === "Err") {
        assert.equal(result.value.kind, "EventGap");
        assert.equal(result.value.receivedIndex, 3);
        assert.equal(result.value.expectedIndex, 2);
      }
    });

    test("should not update state on gap", () => {
      // Arrange
      const follower = createCounterFollower({ count: 0 });
      follower.applyEvent({ index: 1, event: { kind: "Incremented", amount: 5 } });

      // Act
      follower.applyEvent({ index: 5, event: { kind: "Incremented", amount: 100 } });

      // Assert
      assert.deepEqual(follower.getState(), { count: 5 });
      assert.equal(follower.getLastAppliedIndex(), 1);
    });

    test("should reject old event after applying newer event", () => {
      // Arrange
      const follower = createCounterFollower({ count: 0 });
      follower.applyEvent({ index: 1, event: { kind: "Incremented", amount: 5 } });
      follower.applyEvent({ index: 2, event: { kind: "Incremented", amount: 3 } });

      // Act - Try to apply index 1 again
      const result = follower.applyEvent({
        index: 1,
        event: { kind: "Decremented", amount: 2 },
      });

      // Assert
      assert.equal(result.kind, "Err");
      if (result.kind === "Err") {
        assert.equal(result.value.kind, "DuplicateEvent");
      }
    });
  });

  describe("applySnapshot", () => {
    test("should apply snapshot with more recent index", () => {
      // Arrange
      const follower = createCounterFollower({ count: 0 });
      follower.applyEvent({ index: 1, event: { kind: "Incremented", amount: 5 } });

      const snapshot: Snapshot<CounterState> = {
        state: { count: 20 },
        lastAppliedIndex: 5,
      };

      // Act
      const result = follower.applySnapshot(snapshot);

      // Assert
      assert.equal(result.kind, "Ok");
      assert.deepEqual(follower.getState(), { count: 20 });
      assert.equal(follower.getLastAppliedIndex(), 5);
    });

    test("should reject stale snapshot", () => {
      // Arrange
      const follower = createCounterFollower({ count: 0 });
      follower.applyEvent({ index: 1, event: { kind: "Incremented", amount: 5 } });
      follower.applyEvent({ index: 2, event: { kind: "Incremented", amount: 3 } });
      follower.applyEvent({ index: 3, event: { kind: "Incremented", amount: 2 } });

      const snapshot: Snapshot<CounterState> = {
        state: { count: 100 },
        lastAppliedIndex: 2,
      };

      // Act
      const result = follower.applySnapshot(snapshot);

      // Assert
      assert.equal(result.kind, "Err");
      if (result.kind === "Err") {
        assert.equal(result.value.kind, "StaleSnapshot");
        assert.equal(result.value.snapshotIndex, 2);
        assert.equal(result.value.lastAppliedIndex, 3);
      }
    });

    test("should not update state on stale snapshot", () => {
      // Arrange
      const follower = createCounterFollower({ count: 0 });
      follower.applyEvent({ index: 1, event: { kind: "Incremented", amount: 5 } });
      follower.applyEvent({ index: 2, event: { kind: "Incremented", amount: 3 } });

      const snapshot: Snapshot<CounterState> = {
        state: { count: 100 },
        lastAppliedIndex: 1,
      };

      // Act
      follower.applySnapshot(snapshot);

      // Assert
      assert.deepEqual(follower.getState(), { count: 8 });
      assert.equal(follower.getLastAppliedIndex(), 2);
    });

    test("should allow applying events after snapshot", () => {
      // Arrange
      const follower = createCounterFollower({ count: 0 });
      const snapshot: Snapshot<CounterState> = {
        state: { count: 20 },
        lastAppliedIndex: 5,
      };
      follower.applySnapshot(snapshot);

      // Act
      const result = follower.applyEvent({
        index: 6,
        event: { kind: "Incremented", amount: 3 },
      });

      // Assert
      assert.equal(result.kind, "Ok");
      assert.deepEqual(follower.getState(), { count: 23 });
      assert.equal(follower.getLastAppliedIndex(), 6);
    });
  });

  describe("getSnapshot", () => {
    test("should return snapshot with current state and lastAppliedIndex", () => {
      // Arrange
      const follower = createCounterFollower({ count: 0 });
      follower.applyEvent({ index: 1, event: { kind: "Incremented", amount: 5 } });
      follower.applyEvent({ index: 2, event: { kind: "Incremented", amount: 3 } });

      // Act
      const snapshot = follower.getSnapshot();

      // Assert
      assert.deepEqual(snapshot.state, { count: 8 });
      assert.equal(snapshot.lastAppliedIndex, 2);
    });

    test("should return snapshot that can be used with another follower", () => {
      // Arrange
      const follower1 = createCounterFollower({ count: 0 });
      follower1.applyEvent({ index: 1, event: { kind: "Incremented", amount: 10 } });
      follower1.applyEvent({ index: 2, event: { kind: "Decremented", amount: 3 } });

      // Act
      const snapshot = follower1.getSnapshot();
      const follower2 = createCounterFollower({ count: 0 });
      follower2.applySnapshot(snapshot);

      // Assert
      assert.deepEqual(follower2.getState(), { count: 7 });
      assert.equal(follower2.getLastAppliedIndex(), 2);
    });
  });
});

// ========================================
// Leader-Follower Integration Tests
// ========================================

describe("Leader-Follower Integration", () => {
  test("should replicate leader state to follower via events", () => {
    // Arrange
    const leader = createCounterLeader({ state: { count: 0 }, lastAppliedIndex: 0 });
    const follower = createCounterFollower({ count: 0 });

    // Act - Leader processes commands
    const event1 = leader.handleCommand({ kind: "Increment", amount: 5 });
    const event2 = leader.handleCommand({ kind: "Increment", amount: 3 });
    const event3 = leader.handleCommand({ kind: "Decrement", amount: 2 });

    // Follower applies events
    if (event1.kind === "Ok") follower.applyEvent(event1.value);
    if (event2.kind === "Ok") follower.applyEvent(event2.value);
    if (event3.kind === "Ok") follower.applyEvent(event3.value);

    // Assert
    assert.deepEqual(follower.getState(), leader.getState());
    assert.equal(follower.getLastAppliedIndex(), leader.getCurrentIndex());
  });

  test("should sync follower via snapshot from leader", () => {
    // Arrange
    const leader = createCounterLeader({ state: { count: 0 }, lastAppliedIndex: 0 });
    leader.handleCommand({ kind: "Increment", amount: 10 });
    leader.handleCommand({ kind: "Increment", amount: 5 });
    leader.handleCommand({ kind: "Decrement", amount: 3 });

    const follower = createCounterFollower({ count: 0 });

    // Act
    const snapshot = leader.getSnapshot();
    follower.applySnapshot(snapshot);

    // Assert
    assert.deepEqual(follower.getState(), leader.getState());
    assert.equal(follower.getLastAppliedIndex(), leader.getCurrentIndex());
  });

  test("should handle partial sync then snapshot", () => {
    // Arrange
    const leader = createCounterLeader({ state: { count: 0 }, lastAppliedIndex: 0 });
    const follower = createCounterFollower({ count: 0 });

    // Act - Follower receives first 2 events
    const event1 = leader.handleCommand({ kind: "Increment", amount: 5 });
    const event2 = leader.handleCommand({ kind: "Increment", amount: 3 });
    if (event1.kind === "Ok") follower.applyEvent(event1.value);
    if (event2.kind === "Ok") follower.applyEvent(event2.value);

    // Leader processes more commands
    leader.handleCommand({ kind: "Decrement", amount: 2 });
    leader.handleCommand({ kind: "Increment", amount: 10 });

    // Follower syncs via snapshot
    follower.applySnapshot(leader.getSnapshot());

    // Assert
    assert.deepEqual(follower.getState(), leader.getState());
    assert.equal(follower.getLastAppliedIndex(), leader.getCurrentIndex());
  });

  test("should create new leader from leader snapshot", () => {
    // Arrange
    const leader1 = createCounterLeader({ state: { count: 0 }, lastAppliedIndex: 0 });
    leader1.handleCommand({ kind: "Increment", amount: 15 });
    leader1.handleCommand({ kind: "Decrement", amount: 5 });

    // Act
    const snapshot = leader1.getSnapshot();
    const leader2 = createCounterLeader(snapshot);

    // Continue with leader2
    leader2.handleCommand({ kind: "Increment", amount: 3 });

    // Assert
    assert.deepEqual(leader2.getState(), { count: 13 });
    assert.equal(leader2.getCurrentIndex(), 3);
  });
});
