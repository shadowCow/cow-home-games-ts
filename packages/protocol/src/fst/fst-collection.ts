import { Result, ok, err } from "@cow-sunday/fp-ts";
import { z } from "zod";
import { FstLeader, IndexedEvent, Snapshot, createFstLeader } from "./fst";

// ========================================
// Collection Commands
// ========================================

export const AddEntity = <TEntityState extends z.ZodTypeAny>(entityStateSchema: TEntityState) =>
  z.object({
    kind: z.literal("AddEntity"),
    entityType: z.string(),
    id: z.string(),
    initialState: entityStateSchema,
  });

export const RemoveEntity = z.object({
  kind: z.literal("RemoveEntity"),
  entityType: z.string(),
  id: z.string(),
});

export const UpdateEntity = <TEntityCommand extends z.ZodTypeAny>(entityCommandSchema: TEntityCommand) =>
  z.object({
    kind: z.literal("UpdateEntity"),
    entityType: z.string(),
    id: z.string(),
    command: entityCommandSchema,
  });

export const createCollectionCommandSchema = <
  TEntityState extends z.ZodTypeAny,
  TEntityCommand extends z.ZodTypeAny
>(
  entityStateSchema: TEntityState,
  entityCommandSchema: TEntityCommand
) =>
  z.discriminatedUnion("kind", [
    AddEntity(entityStateSchema),
    RemoveEntity,
    UpdateEntity(entityCommandSchema),
  ]);

export type CollectionCommand<TEntityState, TEntityCommand> =
  | z.infer<ReturnType<typeof AddEntity<z.ZodType<TEntityState>>>>
  | z.infer<typeof RemoveEntity>
  | z.infer<ReturnType<typeof UpdateEntity<z.ZodType<TEntityCommand>>>>;

// ========================================
// Collection Events
// ========================================

export const EntityAdded = <TEntityState extends z.ZodTypeAny>(entityStateSchema: TEntityState) =>
  z.object({
    kind: z.literal("EntityAdded"),
    entityType: z.string(),
    id: z.string(),
    initialState: entityStateSchema,
  });

export const EntityRemoved = z.object({
  kind: z.literal("EntityRemoved"),
  entityType: z.string(),
  id: z.string(),
});

export const EntityUpdated = <TEntityEvent extends z.ZodTypeAny>(entityEventSchema: TEntityEvent) =>
  z.object({
    kind: z.literal("EntityUpdated"),
    entityType: z.string(),
    id: z.string(),
    event: IndexedEvent(entityEventSchema),
  });

export const createCollectionEventSchema = <
  TEntityState extends z.ZodTypeAny,
  TEntityEvent extends z.ZodTypeAny
>(
  entityStateSchema: TEntityState,
  entityEventSchema: TEntityEvent
) =>
  z.discriminatedUnion("kind", [
    EntityAdded(entityStateSchema),
    EntityRemoved,
    EntityUpdated(entityEventSchema),
  ]);

export type CollectionEvent<TEntityState, TEntityEvent> =
  | z.infer<ReturnType<typeof EntityAdded<z.ZodType<TEntityState>>>>
  | z.infer<typeof EntityRemoved>
  | {
      kind: "EntityUpdated";
      entityType: string;
      id: string;
      event: IndexedEvent<TEntityEvent>;
    };

// ========================================
// Collection Errors
// ========================================

export const EntityNotFound = z.object({
  kind: z.literal("EntityNotFound"),
  entityType: z.string(),
  id: z.string(),
});

export type EntityNotFound = z.infer<typeof EntityNotFound>;

export const EntityAlreadyExists = z.object({
  kind: z.literal("EntityAlreadyExists"),
  entityType: z.string(),
  id: z.string(),
});

export type EntityAlreadyExists = z.infer<typeof EntityAlreadyExists>;

export const EntityError = <TEntityError extends z.ZodTypeAny>(entityErrorSchema: TEntityError) =>
  z.object({
    kind: z.literal("EntityError"),
    entityType: z.string(),
    id: z.string(),
    error: entityErrorSchema,
  });

export const createCollectionErrorSchema = <TEntityError extends z.ZodTypeAny>(
  entityErrorSchema: TEntityError
) =>
  z.discriminatedUnion("kind", [EntityNotFound, EntityAlreadyExists, EntityError(entityErrorSchema)]);

export type CollectionError<TEntityError> =
  | EntityNotFound
  | EntityAlreadyExists
  | z.infer<ReturnType<typeof EntityError<z.ZodType<TEntityError>>>>;

// ========================================
// Collection State
// ========================================

// Collection state
export type CollectionState<TEntityState, TEntityCommand, TEntityEvent, TEntityError> = {
  entities: Record<string, FstLeader<TEntityState, TEntityCommand, TEntityEvent, TEntityError>>;
};

// Factory function to create entity FSTs
export type EntityFstFactory<TEntityState, TEntityCommand, TEntityEvent, TEntityError> = (
  snapshot: Snapshot<TEntityState>
) => FstLeader<TEntityState, TEntityCommand, TEntityEvent, TEntityError>;

// Collection FST Leader type
export type CollectionFstLeader<TEntityState, TEntityCommand, TEntityEvent, TEntityError> = FstLeader<
  CollectionState<TEntityState, TEntityCommand, TEntityEvent, TEntityError>,
  CollectionCommand<TEntityState, TEntityCommand>,
  CollectionEvent<TEntityState, TEntityEvent>,
  CollectionError<TEntityError>
>;

export function createFstCollection<TEntityState, TEntityCommand, TEntityEvent, TEntityError>(
  entityType: string,
  entityFactory: EntityFstFactory<TEntityState, TEntityCommand, TEntityEvent, TEntityError>
): CollectionFstLeader<TEntityState, TEntityCommand, TEntityEvent, TEntityError> {
  const initialState: CollectionState<TEntityState, TEntityCommand, TEntityEvent, TEntityError> = {
    entities: {},
  };

  const initialSnapshot = {
    state: initialState,
    lastAppliedIndex: 0,
  };

  return createFstLeader<
    CollectionState<TEntityState, TEntityCommand, TEntityEvent, TEntityError>,
    CollectionCommand<TEntityState, TEntityCommand>,
    CollectionEvent<TEntityState, TEntityEvent>,
    CollectionError<TEntityError>,
    void
  >(
    (state, command) => {
      switch (command.kind) {
        case "AddEntity": {
          if (state.entities[command.id]) {
            return err({ kind: "EntityAlreadyExists" as const, entityType, id: command.id });
          }
          return ok({
            kind: "EntityAdded" as const,
            entityType,
            id: command.id,
            initialState: command.initialState,
          });
        }

        case "RemoveEntity": {
          if (!state.entities[command.id]) {
            return err({ kind: "EntityNotFound" as const, entityType, id: command.id });
          }
          return ok({
            kind: "EntityRemoved" as const,
            entityType,
            id: command.id,
          });
        }

        case "UpdateEntity": {
          const entity = state.entities[command.id];
          if (!entity) {
            return err({ kind: "EntityNotFound" as const, entityType, id: command.id });
          }

          const result = entity.handleCommand(command.command);
          if (result.kind === "Err") {
            return err({ kind: "EntityError" as const, entityType, id: command.id, error: result.value });
          }

          return ok({
            kind: "EntityUpdated" as const,
            entityType,
            id: command.id,
            event: result.value,
          });
        }
      }
    },
    (state, event) => {
      switch (event.kind) {
        case "EntityAdded": {
          return {
            ...state,
            entities: {
              ...state.entities,
              [event.id]: entityFactory({ state: event.initialState, lastAppliedIndex: 0 }),
            },
          };
        }

        case "EntityRemoved": {
          const { [event.id]: removed, ...rest } = state.entities;
          return {
            ...state,
            entities: rest,
          };
        }

        case "EntityUpdated": {
          // Entity has already applied the event via handleCommand
          // This will be addressed separately later
          return state;
        }
      }
    },
    undefined,
    initialSnapshot
  );
}
