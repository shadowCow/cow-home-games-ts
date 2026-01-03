import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ok, err } from "@cow-sunday/fp-ts";
import { createFstLeader } from "./fst";
import { createFstCollection } from "./fst-collection";
import type { CollectionCommand, CollectionEvent, CollectionError } from "./fst-collection";

// ========================================
// Test Entity Types
// ========================================

type CounterState = { count: number };

type CounterCommand = { kind: "Increment"; amount: number } | { kind: "Decrement"; amount: number };

type CounterEvent = { kind: "Incremented"; amount: number } | { kind: "Decremented"; amount: number };

type CounterError = { kind: "NegativeResult" };

// ========================================
// Test Entity FST Factory
// ========================================

function createCounterFst(initialState: CounterState) {
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
    initialState
  );
}

// ========================================
// Tests
// ========================================

describe("FST Collection", () => {
  test("should start with empty collection", () => {
    // Arrange
    const collection = createFstCollection("Counter", createCounterFst);

    // Act
    const state = collection.getState();

    // Assert
    assert.deepEqual(state.entities, {});
  });

  test("should add entity to collection", () => {
    // Arrange
    const collection = createFstCollection("Counter", createCounterFst);
    const command: CollectionCommand<CounterState, CounterCommand> = {
      kind: "AddEntity",
      entityType: "Counter",
      id: "counter1",
      initialState: { count: 0 },
    };

    // Act
    const result = collection.handleCommand(command);

    // Assert
    assert.equal(result.kind, "Ok");
    if (result.kind === "Ok") {
      assert.equal(result.value.kind, "EntityAdded");
      assert.equal(result.value.entityType, "Counter");
      assert.equal(result.value.id, "counter1");
    }

    const state = collection.getState();
    assert.ok(state.entities["counter1"]);
    assert.deepEqual(state.entities["counter1"].getState(), { count: 0 });
  });

  test("should return error when adding entity with duplicate ID", () => {
    // Arrange
    const collection = createFstCollection("Counter", createCounterFst);
    collection.handleCommand({
      kind: "AddEntity",
      entityType: "Counter",
      id: "counter1",
      initialState: { count: 0 },
    });

    // Act
    const result = collection.handleCommand({
      kind: "AddEntity",
      entityType: "Counter",
      id: "counter1",
      initialState: { count: 5 },
    });

    // Assert
    assert.equal(result.kind, "Err");
    if (result.kind === "Err") {
      const error: CollectionError<CounterError> = result.value;
      assert.equal(error.kind, "EntityAlreadyExists");
      if (error.kind === "EntityAlreadyExists") {
        assert.equal(error.entityType, "Counter");
        assert.equal(error.id, "counter1");
      }
    }
  });

  test("should remove entity from collection", () => {
    // Arrange
    const collection = createFstCollection("Counter", createCounterFst);
    collection.handleCommand({
      kind: "AddEntity",
      entityType: "Counter",
      id: "counter1",
      initialState: { count: 10 },
    });

    // Act
    const result = collection.handleCommand({
      kind: "RemoveEntity",
      entityType: "Counter",
      id: "counter1",
    });

    // Assert
    assert.equal(result.kind, "Ok");
    if (result.kind === "Ok") {
      assert.equal(result.value.kind, "EntityRemoved");
      assert.equal(result.value.entityType, "Counter");
      assert.equal(result.value.id, "counter1");
    }

    const state = collection.getState();
    assert.equal(state.entities["counter1"], undefined);
  });

  test("should return error when removing non-existent entity", () => {
    // Arrange
    const collection = createFstCollection("Counter", createCounterFst);

    // Act
    const result = collection.handleCommand({
      kind: "RemoveEntity",
      entityType: "Counter",
      id: "nonexistent",
    });

    // Assert
    assert.equal(result.kind, "Err");
    if (result.kind === "Err") {
      const error: CollectionError<CounterError> = result.value;
      assert.equal(error.kind, "EntityNotFound");
      if (error.kind === "EntityNotFound") {
        assert.equal(error.entityType, "Counter");
        assert.equal(error.id, "nonexistent");
      }
    }
  });

  test("should update entity with valid command", () => {
    // Arrange
    const collection = createFstCollection("Counter", createCounterFst);
    collection.handleCommand({
      kind: "AddEntity",
      entityType: "Counter",
      id: "counter1",
      initialState: { count: 5 },
    });

    // Act
    const result = collection.handleCommand({
      kind: "UpdateEntity",
      entityType: "Counter",
      id: "counter1",
      command: { kind: "Increment", amount: 3 },
    });

    // Assert
    assert.equal(result.kind, "Ok");
    if (result.kind === "Ok") {
      const event: CollectionEvent<CounterState, CounterEvent> = result.value;
      assert.equal(event.kind, "EntityUpdated");
      if (event.kind === "EntityUpdated") {
        assert.equal(event.entityType, "Counter");
        assert.equal(event.id, "counter1");
        assert.equal(event.event.kind, "Incremented");
        if (event.event.kind === "Incremented") {
          assert.equal(event.event.amount, 3);
        }
      }
    }

    const state = collection.getState();
    assert.deepEqual(state.entities["counter1"].getState(), { count: 8 });
  });

  test("should return error when updating non-existent entity", () => {
    // Arrange
    const collection = createFstCollection("Counter", createCounterFst);

    // Act
    const result = collection.handleCommand({
      kind: "UpdateEntity",
      entityType: "Counter",
      id: "nonexistent",
      command: { kind: "Increment", amount: 1 },
    });

    // Assert
    assert.equal(result.kind, "Err");
    if (result.kind === "Err") {
      const error: CollectionError<CounterError> = result.value;
      assert.equal(error.kind, "EntityNotFound");
      if (error.kind === "EntityNotFound") {
        assert.equal(error.entityType, "Counter");
        assert.equal(error.id, "nonexistent");
      }
    }
  });

  test("should return entity error when entity command fails", () => {
    // Arrange
    const collection = createFstCollection("Counter", createCounterFst);
    collection.handleCommand({
      kind: "AddEntity",
      entityType: "Counter",
      id: "counter1",
      initialState: { count: 2 },
    });

    // Act
    const result = collection.handleCommand({
      kind: "UpdateEntity",
      entityType: "Counter",
      id: "counter1",
      command: { kind: "Decrement", amount: 5 },
    });

    // Assert
    assert.equal(result.kind, "Err");
    if (result.kind === "Err") {
      const error: CollectionError<CounterError> = result.value;
      assert.equal(error.kind, "EntityError");
      if (error.kind === "EntityError") {
        assert.equal(error.entityType, "Counter");
        assert.equal(error.id, "counter1");
        assert.equal(error.error.kind, "NegativeResult");
      }
    }

    const state = collection.getState();
    assert.deepEqual(state.entities["counter1"].getState(), { count: 2 });
  });

  test("should manage multiple entities independently", () => {
    // Arrange
    const collection = createFstCollection("Counter", createCounterFst);
    collection.handleCommand({
      kind: "AddEntity",
      entityType: "Counter",
      id: "counter1",
      initialState: { count: 0 },
    });
    collection.handleCommand({
      kind: "AddEntity",
      entityType: "Counter",
      id: "counter2",
      initialState: { count: 10 },
    });

    // Act
    collection.handleCommand({
      kind: "UpdateEntity",
      entityType: "Counter",
      id: "counter1",
      command: { kind: "Increment", amount: 5 },
    });
    collection.handleCommand({
      kind: "UpdateEntity",
      entityType: "Counter",
      id: "counter2",
      command: { kind: "Decrement", amount: 3 },
    });

    // Assert
    const state = collection.getState();
    assert.deepEqual(state.entities["counter1"].getState(), { count: 5 });
    assert.deepEqual(state.entities["counter2"].getState(), { count: 7 });
  });

  test("should apply events correctly", () => {
    // Arrange
    const collection = createFstCollection("Counter", createCounterFst);

    // Act
    collection.applyEvent({
      kind: "EntityAdded",
      entityType: "Counter",
      id: "counter1",
      initialState: { count: 0 },
    });
    collection.applyEvent({
      kind: "EntityUpdated",
      entityType: "Counter",
      id: "counter1",
      event: { kind: "Incremented", amount: 10 },
    });

    // Assert
    const state = collection.getState();
    assert.deepEqual(state.entities["counter1"].getState(), { count: 10 });

    // Act
    collection.applyEvent({
      kind: "EntityRemoved",
      entityType: "Counter",
      id: "counter1",
    });

    // Assert
    const stateAfterRemove = collection.getState();
    assert.equal(stateAfterRemove.entities["counter1"], undefined);
  });

  test("should handle applyEvent for non-existent entity gracefully", () => {
    // Arrange
    const collection = createFstCollection("Counter", createCounterFst);

    // Act
    collection.applyEvent({
      kind: "EntityUpdated",
      entityType: "Counter",
      id: "nonexistent",
      event: { kind: "Incremented", amount: 5 },
    });

    // Assert
    const state = collection.getState();
    assert.deepEqual(state.entities, {});
  });
});
