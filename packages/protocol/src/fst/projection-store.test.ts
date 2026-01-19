import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createFstFollower, Snapshot } from "./fst";
import { createProjectionStore } from "./projection-store";

// ========================================
// Test Types
// ========================================

type CounterState = {
  count: number;
};

type CounterEvent =
  | { kind: "Incremented"; amount: number }
  | { kind: "Decremented"; amount: number };

// ========================================
// Test Helpers
// ========================================

function createCounterFollower(initialCount: number) {
  const reducer = (state: CounterState, event: CounterEvent): CounterState => {
    switch (event.kind) {
      case "Incremented":
        return { count: state.count + event.amount };
      case "Decremented":
        return { count: state.count - event.amount };
    }
  };

  const snapshot: Snapshot<CounterState> = {
    kind: "Snapshot",
    state: {
      count: initialCount,
    },
    lastAppliedIndex: 0,
  };

  return createFstFollower<CounterState, CounterEvent>(reducer, snapshot);
}

// ========================================
// Tests
// ========================================

describe("ProjectionStore", () => {
  describe("Initialization", () => {
    test("should create store with initial state", () => {
      // Arrange
      const follower = createCounterFollower(5);

      // Act
      const store = createProjectionStore(follower);

      // Assert
      assert.equal(store.getState().count, 5);
      assert.equal(store.getLastAppliedIndex(), 0);
    });
  });

  describe("FstFollower delegation", () => {
    test("should delegate getState to follower", () => {
      // Arrange
      const follower = createCounterFollower(10);
      const store = createProjectionStore(follower);

      // Act
      const state = store.getState();

      // Assert
      assert.equal(state.count, 10);
    });

    test("should delegate getLastAppliedIndex to follower", () => {
      // Arrange
      const follower = createCounterFollower(0);
      const store = createProjectionStore(follower);

      // Act
      const index = store.getLastAppliedIndex();

      // Assert
      assert.equal(index, 0);
    });

    test("should delegate getSnapshot to follower", () => {
      // Arrange
      const follower = createCounterFollower(7);
      const store = createProjectionStore(follower);

      // Act
      const snapshot = store.getSnapshot();

      // Assert
      assert.equal(snapshot.kind, "Snapshot");
      assert.equal(snapshot.state.count, 7);
      assert.equal(snapshot.lastAppliedIndex, 0);
    });
  });

  describe("subscribe", () => {
    test("should immediately call subscriber with current state", () => {
      // Arrange
      const follower = createCounterFollower(15);
      const store = createProjectionStore(follower);
      let callbackCount = 0;
      const receivedStates: CounterState[] = [];

      // Act
      store.subscribe((state) => {
        callbackCount++;
        receivedStates.push(state);
      });

      // Assert
      assert.equal(callbackCount, 1);
      assert.equal(receivedStates.length, 1);
      assert.equal(receivedStates[0].count, 15);
    });

    test("should notify subscribers when applyEvent succeeds", () => {
      // Arrange
      const follower = createCounterFollower(5);
      const store = createProjectionStore(follower);
      const states: number[] = [];

      store.subscribe((state) => {
        states.push(state.count);
      });

      // Act
      const result = store.applyEvent({
        kind: "IndexedEvent",
        index: 1,
        event: { kind: "Incremented", amount: 3 },
      });

      // Assert
      assert.equal(result.kind, "Ok");
      assert.deepEqual(states, [5, 8]); // Initial + after event
    });

    test("should notify subscribers when applySnapshot succeeds", () => {
      // Arrange
      const follower = createCounterFollower(5);
      const store = createProjectionStore(follower);
      const states: number[] = [];

      store.subscribe((state) => {
        states.push(state.count);
      });

      // Act
      const result = store.applySnapshot({
        kind: "Snapshot",
        state: { count: 20 },
        lastAppliedIndex: 5,
      });

      // Assert
      assert.equal(result.kind, "Ok");
      assert.deepEqual(states, [5, 20]); // Initial + after snapshot
    });

    test("should not notify subscribers when applyEvent fails", () => {
      // Arrange
      const follower = createCounterFollower(0);
      const store = createProjectionStore(follower);
      const states: number[] = [];

      store.subscribe((state) => {
        states.push(state.count);
      });

      // Act - Try to apply event with gap
      const result = store.applyEvent({
        kind: "IndexedEvent",
        index: 5, // Gap - should fail
        event: { kind: "Incremented", amount: 3 },
      });

      // Assert
      assert.equal(result.kind, "Err");
      assert.deepEqual(states, [0]); // Only initial state
    });

    test("should not notify subscribers when applySnapshot fails", () => {
      // Arrange
      const follower = createCounterFollower(0);
      const store = createProjectionStore(follower);

      // Apply event first to advance index
      store.applyEvent({
        kind: "IndexedEvent",
        index: 1,
        event: { kind: "Incremented", amount: 5 },
      });

      const states: number[] = [];
      store.subscribe((state) => {
        states.push(state.count);
      });

      // Act - Try to apply stale snapshot
      const result = store.applySnapshot({
        kind: "Snapshot",
        state: { count: 100 },
        lastAppliedIndex: 0, // Stale - should fail
      });

      // Assert
      assert.equal(result.kind, "Err");
      assert.deepEqual(states, [5]); // Only initial state
    });

    test("should support multiple subscribers", () => {
      // Arrange
      const follower = createCounterFollower(10);
      const store = createProjectionStore(follower);
      const subscriber1States: number[] = [];
      const subscriber2States: number[] = [];

      store.subscribe((state) => subscriber1States.push(state.count));
      store.subscribe((state) => subscriber2States.push(state.count));

      // Act
      store.applyEvent({
        kind: "IndexedEvent",
        index: 1,
        event: { kind: "Decremented", amount: 3 },
      });

      // Assert
      assert.deepEqual(subscriber1States, [10, 7]);
      assert.deepEqual(subscriber2States, [10, 7]);
    });
  });

  describe("unsubscribe", () => {
    test("should stop receiving updates after unsubscribe", () => {
      // Arrange
      const follower = createCounterFollower(0);
      const store = createProjectionStore(follower);
      const states: number[] = [];

      const unsubscribe = store.subscribe((state) => {
        states.push(state.count);
      });

      // Act
      store.applyEvent({
        kind: "IndexedEvent",
        index: 1,
        event: { kind: "Incremented", amount: 5 },
      });

      unsubscribe(); // Unsubscribe

      store.applyEvent({
        kind: "IndexedEvent",
        index: 2,
        event: { kind: "Incremented", amount: 10 },
      });

      // Assert
      assert.deepEqual(states, [0, 5]); // Only first two states, not the third
    });

    test("should allow selective unsubscribe with multiple subscribers", () => {
      // Arrange
      const follower = createCounterFollower(0);
      const store = createProjectionStore(follower);
      const subscriber1States: number[] = [];
      const subscriber2States: number[] = [];

      const unsubscribe1 = store.subscribe((state) =>
        subscriber1States.push(state.count)
      );
      store.subscribe((state) => subscriber2States.push(state.count));

      // Act
      store.applyEvent({
        kind: "IndexedEvent",
        index: 1,
        event: { kind: "Incremented", amount: 5 },
      });

      unsubscribe1(); // Only unsubscribe first

      store.applyEvent({
        kind: "IndexedEvent",
        index: 2,
        event: { kind: "Incremented", amount: 10 },
      });

      // Assert
      assert.deepEqual(subscriber1States, [0, 5]); // Stopped after unsubscribe
      assert.deepEqual(subscriber2States, [0, 5, 15]); // Still receiving updates
    });

    test("should handle multiple calls to same unsubscribe function", () => {
      // Arrange
      const follower = createCounterFollower(0);
      const store = createProjectionStore(follower);
      const states: number[] = [];

      const unsubscribe = store.subscribe((state) => {
        states.push(state.count);
      });

      // Act
      unsubscribe();
      unsubscribe(); // Call twice

      store.applyEvent({
        kind: "IndexedEvent",
        index: 1,
        event: { kind: "Incremented", amount: 5 },
      });

      // Assert
      assert.deepEqual(states, [0]); // Only initial, no updates
    });
  });
});
