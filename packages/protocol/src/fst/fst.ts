import { Result, ok, err } from "@cow-sunday/fp-ts";
import { z } from "zod";

// ========================================
// Event Sourcing Types
// ========================================

export const IndexedEvent = <TEvent extends z.ZodTypeAny>(eventSchema: TEvent) =>
  z.object({
    kind: z.literal("IndexedEvent"),
    index: z.number(),
    event: eventSchema,
  });

export type IndexedEvent<TEvent> = {
  kind: "IndexedEvent";
  index: number;
  event: TEvent;
};

export const Snapshot = <TState extends z.ZodTypeAny>(stateSchema: TState) =>
  z.object({
    kind: z.literal("Snapshot"),
    state: stateSchema,
    lastAppliedIndex: z.number(),
  });

export type Snapshot<TState> = {
  kind: "Snapshot";
  state: TState;
  lastAppliedIndex: number;
};

export type SyncError =
  | { kind: "DuplicateEvent"; receivedIndex: number; lastAppliedIndex: number }
  | { kind: "EventGap"; receivedIndex: number; expectedIndex: number }
  | { kind: "StaleSnapshot"; snapshotIndex: number; lastAppliedIndex: number };

// ========================================
// FST Leader
// ========================================

export type FstLeader<TState, TCommand, TEvent, TError> = {
  getState(): Readonly<TState>;
  getCurrentIndex(): number;
  getSnapshot(): Snapshot<TState>;
  handleCommand(c: TCommand): Result<IndexedEvent<TEvent>, TError>;
};

export type CommandHandler<TState, TCommand, TEvent, TError, TContext> = (
  s: TState,
  c: TCommand,
  ctx: TContext
) => Result<TEvent, TError>;

export type Reducer<TState, TEvent> = (s: TState, e: TEvent) => TState;

export function createFstLeader<TState, TCommand, TEvent, TError, TContext>(
  commandHandler: CommandHandler<TState, TCommand, TEvent, TError, TContext>,
  reducer: Reducer<TState, TEvent>,
  ctx: TContext,
  snapshot: Snapshot<TState>
): FstLeader<TState, TCommand, TEvent, TError> {
  let state = snapshot.state;
  let currentIndex = snapshot.lastAppliedIndex;

  // Internal function to apply events (not exposed publicly)
  const applyEvent = (e: IndexedEvent<TEvent>): void => {
    state = reducer(state, e.event);
    // Update currentIndex to the event's index
    if (e.index > currentIndex) {
      currentIndex = e.index;
    }
  };

  return {
    getState: function (): Readonly<TState> {
      return state;
    },

    getCurrentIndex: function (): number {
      return currentIndex;
    },

    getSnapshot: function (): Snapshot<TState> {
      return {
        kind: "Snapshot",
        state,
        lastAppliedIndex: currentIndex,
      };
    },

    handleCommand: function (c: TCommand): Result<IndexedEvent<TEvent>, TError> {
      const result = commandHandler(state, c, ctx);

      if (result.kind === "Ok") {
        // Increment index and create indexed event
        currentIndex++;
        const indexedEvent: IndexedEvent<TEvent> = {
          kind: "IndexedEvent",
          index: currentIndex,
          event: result.value,
        };
        applyEvent(indexedEvent);
        return ok(indexedEvent);
      }

      return result;
    },
  };
}

// ========================================
// FST Follower
// ========================================

export type FstFollower<TState, TEvent> = {
  getState(): Readonly<TState>;
  getLastAppliedIndex(): number;
  getSnapshot(): Snapshot<TState>;
  applyEvent(e: IndexedEvent<TEvent>): Result<void, SyncError>;
  applySnapshot(snapshot: Snapshot<TState>): Result<void, SyncError>;
};

export function createFstFollower<TState, TEvent>(
  reducer: Reducer<TState, TEvent>,
  initialState: TState
): FstFollower<TState, TEvent> {
  let state = initialState;
  let lastAppliedIndex = 0;

  return {
    getState: function (): Readonly<TState> {
      return state;
    },

    getLastAppliedIndex: function (): number {
      return lastAppliedIndex;
    },

    getSnapshot: function (): Snapshot<TState> {
      return {
        kind: "Snapshot",
        state,
        lastAppliedIndex,
      };
    },

    applyEvent: function (e: IndexedEvent<TEvent>): Result<void, SyncError> {
      // Check for duplicate event
      if (e.index <= lastAppliedIndex) {
        return err({
          kind: "DuplicateEvent" as const,
          receivedIndex: e.index,
          lastAppliedIndex,
        });
      }

      // Check for gap in event log
      if (e.index > lastAppliedIndex + 1) {
        return err({
          kind: "EventGap" as const,
          receivedIndex: e.index,
          expectedIndex: lastAppliedIndex + 1,
        });
      }

      // Apply the event payload
      state = reducer(state, e.event);
      lastAppliedIndex = e.index;
      return ok(undefined);
    },

    applySnapshot: function (snapshot: Snapshot<TState>): Result<void, SyncError> {
      // Only apply if snapshot is more recent
      if (snapshot.lastAppliedIndex <= lastAppliedIndex) {
        return err({
          kind: "StaleSnapshot" as const,
          snapshotIndex: snapshot.lastAppliedIndex,
          lastAppliedIndex,
        });
      }

      state = snapshot.state;
      lastAppliedIndex = snapshot.lastAppliedIndex;
      return ok(undefined);
    },
  };
}
