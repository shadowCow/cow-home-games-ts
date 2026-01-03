import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ok, err } from "@cow-sunday/fp-ts";
import { createFst } from "./fst";
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
  return createFst<CounterState, CounterCommand, CounterEvent, CounterError, void>(
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
    const collection = createFstCollection(createCounterFst);
    const state = collection.getState();

    assert.deepEqual(state.entities, {});
  });

  test("should add entity to collection", () => {
    const collection = createFstCollection(createCounterFst);

    const command: CollectionCommand<CounterState, CounterCommand> = {
      kind: "AddEntity",
      id: "counter1",
      initialState: { count: 0 },
    };

    const result = collection.handleCommand(command);

    assert.equal(result.kind, "Ok");
    if (result.kind === "Ok") {
      assert.equal(result.value.kind, "EntityAdded");
      assert.equal(result.value.id, "counter1");
    }

    const state = collection.getState();
    assert.ok(state.entities["counter1"]);
    assert.deepEqual(state.entities["counter1"].getState(), { count: 0 });
  });

  test("should return error when adding entity with duplicate ID", () => {
    const collection = createFstCollection(createCounterFst);

    // Add first entity
    collection.handleCommand({
      kind: "AddEntity",
      id: "counter1",
      initialState: { count: 0 },
    });

    // Try to add another entity with same ID
    const result = collection.handleCommand({
      kind: "AddEntity",
      id: "counter1",
      initialState: { count: 5 },
    });

    assert.equal(result.kind, "Err");
    if (result.kind === "Err") {
      const error: CollectionError<CounterError> = result.value;
      assert.equal(error.kind, "EntityAlreadyExists");
      if (error.kind === "EntityAlreadyExists") {
        assert.equal(error.id, "counter1");
      }
    }
  });

  test("should remove entity from collection", () => {
    const collection = createFstCollection(createCounterFst);

    // Add entity
    collection.handleCommand({
      kind: "AddEntity",
      id: "counter1",
      initialState: { count: 10 },
    });

    // Remove entity
    const result = collection.handleCommand({
      kind: "RemoveEntity",
      id: "counter1",
    });

    assert.equal(result.kind, "Ok");
    if (result.kind === "Ok") {
      assert.equal(result.value.kind, "EntityRemoved");
      assert.equal(result.value.id, "counter1");
    }

    const state = collection.getState();
    assert.equal(state.entities["counter1"], undefined);
  });

  test("should return error when removing non-existent entity", () => {
    const collection = createFstCollection(createCounterFst);

    const result = collection.handleCommand({
      kind: "RemoveEntity",
      id: "nonexistent",
    });

    assert.equal(result.kind, "Err");
    if (result.kind === "Err") {
      const error: CollectionError<CounterError> = result.value;
      assert.equal(error.kind, "EntityNotFound");
      if (error.kind === "EntityNotFound") {
        assert.equal(error.id, "nonexistent");
      }
    }
  });

  test("should update entity with valid command", () => {
    const collection = createFstCollection(createCounterFst);

    // Add entity
    collection.handleCommand({
      kind: "AddEntity",
      id: "counter1",
      initialState: { count: 5 },
    });

    // Update entity
    const result = collection.handleCommand({
      kind: "UpdateEntity",
      id: "counter1",
      command: { kind: "Increment", amount: 3 },
    });

    assert.equal(result.kind, "Ok");
    if (result.kind === "Ok") {
      const event: CollectionEvent<CounterState, CounterEvent> = result.value;
      assert.equal(event.kind, "EntityUpdated");
      if (event.kind === "EntityUpdated") {
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
    const collection = createFstCollection(createCounterFst);

    const result = collection.handleCommand({
      kind: "UpdateEntity",
      id: "nonexistent",
      command: { kind: "Increment", amount: 1 },
    });

    assert.equal(result.kind, "Err");
    if (result.kind === "Err") {
      const error: CollectionError<CounterError> = result.value;
      assert.equal(error.kind, "EntityNotFound");
      if (error.kind === "EntityNotFound") {
        assert.equal(error.id, "nonexistent");
      }
    }
  });

  test("should return entity error when entity command fails", () => {
    const collection = createFstCollection(createCounterFst);

    // Add entity with count 2
    collection.handleCommand({
      kind: "AddEntity",
      id: "counter1",
      initialState: { count: 2 },
    });

    // Try to decrement by more than current count
    const result = collection.handleCommand({
      kind: "UpdateEntity",
      id: "counter1",
      command: { kind: "Decrement", amount: 5 },
    });

    assert.equal(result.kind, "Err");
    if (result.kind === "Err") {
      const error: CollectionError<CounterError> = result.value;
      assert.equal(error.kind, "EntityError");
      if (error.kind === "EntityError") {
        assert.equal(error.id, "counter1");
        assert.equal(error.error.kind, "NegativeResult");
      }
    }

    // Entity state should remain unchanged
    const state = collection.getState();
    assert.deepEqual(state.entities["counter1"].getState(), { count: 2 });
  });

  test("should manage multiple entities independently", () => {
    const collection = createFstCollection(createCounterFst);

    // Add multiple entities
    collection.handleCommand({
      kind: "AddEntity",
      id: "counter1",
      initialState: { count: 0 },
    });

    collection.handleCommand({
      kind: "AddEntity",
      id: "counter2",
      initialState: { count: 10 },
    });

    // Update them independently
    collection.handleCommand({
      kind: "UpdateEntity",
      id: "counter1",
      command: { kind: "Increment", amount: 5 },
    });

    collection.handleCommand({
      kind: "UpdateEntity",
      id: "counter2",
      command: { kind: "Decrement", amount: 3 },
    });

    const state = collection.getState();
    assert.deepEqual(state.entities["counter1"].getState(), { count: 5 });
    assert.deepEqual(state.entities["counter2"].getState(), { count: 7 });
  });

  test("should apply events correctly", () => {
    const collection = createFstCollection(createCounterFst);

    // Manually apply events
    collection.applyEvent({
      kind: "EntityAdded",
      id: "counter1",
      initialState: { count: 0 },
    });

    collection.applyEvent({
      kind: "EntityUpdated",
      id: "counter1",
      event: { kind: "Incremented", amount: 10 },
    });

    const state = collection.getState();
    assert.deepEqual(state.entities["counter1"].getState(), { count: 10 });

    // Apply remove event
    collection.applyEvent({
      kind: "EntityRemoved",
      id: "counter1",
    });

    const stateAfterRemove = collection.getState();
    assert.equal(stateAfterRemove.entities["counter1"], undefined);
  });

  test("should handle applyEvent for non-existent entity gracefully", () => {
    const collection = createFstCollection(createCounterFst);

    // Apply update event to non-existent entity (should not crash)
    collection.applyEvent({
      kind: "EntityUpdated",
      id: "nonexistent",
      event: { kind: "Incremented", amount: 5 },
    });

    const state = collection.getState();
    assert.deepEqual(state.entities, {});
  });
});
