import { Result } from "@cow-sunday/fp-ts";
import type { FstFollower, IndexedEvent, Snapshot, SyncError } from "./fst";

// ========================================
// ProjectionStore
// ========================================

export type ProjectionStore<TState, TEvent> = FstFollower<TState, TEvent> & {
  subscribe(callback: (state: TState) => void): () => void;
};

// ========================================
// ProjectionStore Factory
// ========================================

export function createProjectionStore<TState, TEvent>(
  follower: FstFollower<TState, TEvent>
): ProjectionStore<TState, TEvent> {
  const subscribers: Array<(state: TState) => void> = [];

  function notifySubscribers(): void {
    const state = follower.getState();
    subscribers.forEach((callback) => callback(state));
  }

  return {
    getState(): Readonly<TState> {
      return follower.getState();
    },

    getLastAppliedIndex(): number {
      return follower.getLastAppliedIndex();
    },

    getSnapshot(): Snapshot<TState> {
      return follower.getSnapshot();
    },

    applyEvent(e: IndexedEvent<TEvent>): Result<void, SyncError> {
      const result = follower.applyEvent(e);
      if (result.kind === "Ok") {
        notifySubscribers();
      }
      return result;
    },

    applySnapshot(snapshot: Snapshot<TState>): Result<void, SyncError> {
      const result = follower.applySnapshot(snapshot);
      if (result.kind === "Ok") {
        notifySubscribers();
      }
      return result;
    },

    subscribe(callback: (state: TState) => void): () => void {
      subscribers.push(callback);
      // Immediately call with current state
      callback(follower.getState());

      // Return unsubscribe function
      return () => {
        const index = subscribers.indexOf(callback);
        if (index > -1) {
          subscribers.splice(index, 1);
        }
      };
    },
  };
}
