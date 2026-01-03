import {
  createFstCollection,
  createCollectionCommandSchema,
  createCollectionEventSchema,
  createCollectionErrorSchema,
  CollectionCommand,
  CollectionEvent,
  CollectionError,
  CollectionState,
  CollectionFstLeader,
} from "../fst/fst-collection";
import {
  createRoom,
  RoomState as RoomStateSchema,
  RoomCommand as RoomCommandSchema,
  RoomEvent as RoomEventSchema,
  RoomError as RoomErrorSchema,
} from "./room";
import type {
  RoomState,
  RoomCommand,
  RoomEvent,
  RoomError,
} from "./room";

// ========================================
// Room Collection Constants
// ========================================

export const ROOM_ENTITY_TYPE = "Room";

// ========================================
// Room Collection Command Schema
// ========================================

export const RoomCollectionCommand = createCollectionCommandSchema(RoomStateSchema, RoomCommandSchema);

export type RoomCollectionCommand = CollectionCommand<RoomState, RoomCommand>;

// ========================================
// Room Collection Event Schema
// ========================================

export const RoomCollectionEvent = createCollectionEventSchema(RoomStateSchema, RoomEventSchema);

export type RoomCollectionEvent = CollectionEvent<RoomState, RoomEvent>;

// ========================================
// Room Collection Error Schema
// ========================================

export const RoomCollectionError = createCollectionErrorSchema(RoomErrorSchema);

export type RoomCollectionError = CollectionError<RoomError>;

// ========================================
// Room Collection State Type
// ========================================

export type RoomCollectionState = CollectionState<RoomState, RoomCommand, RoomEvent, RoomError>;

// ========================================
// Room Collection FST Leader Type
// ========================================

export type RoomCollectionFstLeader = CollectionFstLeader<RoomState, RoomCommand, RoomEvent, RoomError>;

// ========================================
// Room Collection Factory
// ========================================

export function createRoomCollection(): RoomCollectionFstLeader {
  return createFstCollection(ROOM_ENTITY_TYPE, (initialState) =>
    createRoom(initialState.owner, initialState.code)
  );
}
