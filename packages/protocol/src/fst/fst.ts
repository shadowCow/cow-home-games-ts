import { Result, ok, err } from "@cow-sunday/fp-ts";
import { z } from "zod";

// ========================================
// Event Sourcing Types
// ========================================

export const IndexedEvent = <TEvent extends z.ZodTypeAny>(eventSchema: TEvent) =>
  z.object({
    index: z.number(),
    event: eventSchema,
  });

export type IndexedEvent<TEvent> = {
  index: number;
  event: TEvent;
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
  handleCommand(c: TCommand): Result<IndexedEvent<TEvent>, TError>;
  applyEvent(e: IndexedEvent<TEvent>): void;
};

export type CommandHandler<TState, TCommand, TEvent, TError, TContext> = (
  s: TState,
  c: TCommand,
  ctx: TContext
) => Result<TEvent, TError>;

export type EventApplyer<TState, TEvent> = (s: TState, e: TEvent) => TState;

export function createFstLeader<TState, TCommand, TEvent, TError, TContext>(
  commandHandler: CommandHandler<TState, TCommand, TEvent, TError, TContext>,
  eventApplyer: EventApplyer<TState, TEvent>,
  ctx: TContext,
  initialState: TState
): FstLeader<TState, TCommand, TEvent, TError> {
  let state = initialState;
  let currentIndex = 0;

  return {
    getState: function (): Readonly<TState> {
      return state;
    },

    getCurrentIndex: function (): number {
      return currentIndex;
    },

    handleCommand: function (c: TCommand): Result<IndexedEvent<TEvent>, TError> {
      const result = commandHandler(state, c, ctx);

      if (result.kind === "Ok") {
        // Increment index and create indexed event
        currentIndex++;
        const indexedEvent: IndexedEvent<TEvent> = {
          index: currentIndex,
          event: result.value,
        };
        this.applyEvent(indexedEvent);
        return ok(indexedEvent);
      }

      return result;
    },

    applyEvent: function (e: IndexedEvent<TEvent>): void {
      state = eventApplyer(state, e.event);
      // Update currentIndex to the event's index
      if (e.index > currentIndex) {
        currentIndex = e.index;
      }
    },
  };
}

// ========================================
// FST Follower
// ========================================

export type FstFollower<TState, TEvent> = {
  getState(): Readonly<TState>;
  getLastAppliedIndex(): number;
  applyEvent(e: IndexedEvent<TEvent>): Result<void, SyncError>;
  applySnapshot(s: TState, lastAppliedIndex: number): Result<void, SyncError>;
};

export function createFstFollower<TState, TEvent>(
  eventApplyer: EventApplyer<TState, TEvent>,
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
      state = eventApplyer(state, e.event);
      lastAppliedIndex = e.index;
      return ok(undefined);
    },

    applySnapshot: function (s: TState, snapshotIndex: number): Result<void, SyncError> {
      // Only apply if snapshot is more recent
      if (snapshotIndex <= lastAppliedIndex) {
        return err({
          kind: "StaleSnapshot" as const,
          snapshotIndex,
          lastAppliedIndex,
        });
      }

      state = s;
      lastAppliedIndex = snapshotIndex;
      return ok(undefined);
    },
  };
}
