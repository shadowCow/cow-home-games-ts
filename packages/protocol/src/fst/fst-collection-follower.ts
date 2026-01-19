import { FstFollower, Snapshot, createFstFollower } from "./fst";
import { CollectionEvent } from "./fst-collection";

// ========================================
// Collection Follower State
// ========================================

export type CollectionFollowerState<TEntityState, TEntityEvent> = {
  entities: Record<string, FstFollower<TEntityState, TEntityEvent>>;
};

// ========================================
// Collection FST Follower Type
// ========================================

export type CollectionFstFollower<TEntityState, TEntityEvent> = FstFollower<
  CollectionFollowerState<TEntityState, TEntityEvent>,
  CollectionEvent<TEntityState, TEntityEvent>
>;

// ========================================
// Entity Follower Factory Type
// ========================================

export type EntityFollowerFactory<TEntityState, TEntityEvent> = (
  initialState: TEntityState
) => FstFollower<TEntityState, TEntityEvent>;

// ========================================
// Collection Follower Factory
// ========================================

export function createFstCollectionFollower<TEntityState, TEntityEvent>(
  entityFollowerFactory: EntityFollowerFactory<TEntityState, TEntityEvent>,
  initialSnapshot: Snapshot<CollectionFollowerState<TEntityState, TEntityEvent>>
): CollectionFstFollower<TEntityState, TEntityEvent> {
  // Reducer for collection events
  const collectionReducer = (
    state: CollectionFollowerState<TEntityState, TEntityEvent>,
    event: CollectionEvent<TEntityState, TEntityEvent>
  ): CollectionFollowerState<TEntityState, TEntityEvent> => {
    switch (event.kind) {
      case "EntityAdded": {
        // Create new entity follower with initial state
        return {
          ...state,
          entities: {
            ...state.entities,
            [event.id]: entityFollowerFactory(event.initialState),
          },
        };
      }

      case "EntityRemoved": {
        // Remove entity from collection
        const { [event.id]: removed, ...rest } = state.entities;
        return {
          ...state,
          entities: rest,
        };
      }

      case "EntityUpdated": {
        // Apply the embedded indexed event to the entity follower
        const entity = state.entities[event.id];
        if (!entity) {
          // Entity not found - this shouldn't happen if events are properly ordered
          // but we need to handle it gracefully
          return state;
        }

        // Apply the indexed event to the entity follower
        // If there's a sync error, it will be caught when the collection follower's
        // applyEvent is called, not here in the reducer
        entity.applyEvent(event.event);

        // Return state unchanged (the entity follower has been mutated internally)
        return state;
      }
    }
  };

  return createFstFollower<
    CollectionFollowerState<TEntityState, TEntityEvent>,
    CollectionEvent<TEntityState, TEntityEvent>
  >(collectionReducer, initialSnapshot);
}
