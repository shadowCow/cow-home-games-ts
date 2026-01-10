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
  createFstCollectionFollower,
  CollectionFollowerState,
  CollectionFstFollower,
} from "../fst/fst-collection-follower";
import {
  createRoomLeader,
  createRoomFollower,
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
// Room Collection State Types
// ========================================

export type RoomCollectionState = CollectionState<RoomState, RoomCommand, RoomEvent, RoomError>;

export type RoomCollectionFollowerState = CollectionFollowerState<RoomState, RoomEvent>;

// ========================================
// Room Collection FST Types
// ========================================

export type RoomCollectionFstLeader = CollectionFstLeader<RoomState, RoomCommand, RoomEvent, RoomError>;

export type RoomCollectionFstFollower = CollectionFstFollower<RoomState, RoomEvent>;

// ========================================
// Room Collection Factories
// ========================================

export function createRoomCollection(): RoomCollectionFstLeader {
  return createFstCollection(ROOM_ENTITY_TYPE, (snapshot) =>
    createRoomLeader(snapshot.state.owner, snapshot.state.code)
  );
}

export function createRoomCollectionFollower(): RoomCollectionFstFollower {
  return createFstCollectionFollower(createRoomFollower);
}
