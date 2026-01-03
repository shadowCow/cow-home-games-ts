import { z } from "zod";
import {
  createFstCollection,
  createCollectionCommandSchema,
  createCollectionEventSchema,
  createCollectionErrorSchema,
  CollectionCommand,
  CollectionEvent,
  CollectionError,
  CollectionState,
} from "../fst/fst-collection";
import {
  createRoom,
  RoomState,
  RoomCommand,
  RoomEvent,
  RoomError,
} from "./room";
import { Fst } from "../fst/fst";

// ========================================
// Room Collection Constants
// ========================================

export const ROOM_ENTITY_TYPE = "Room";

// ========================================
// Room Collection Command Schema
// ========================================

export const RoomCollectionCommand = createCollectionCommandSchema(RoomState, RoomCommand);

export type RoomCollectionCommand = CollectionCommand<
  z.infer<typeof RoomState>,
  z.infer<typeof RoomCommand>
>;

// ========================================
// Room Collection Event Schema
// ========================================

export const RoomCollectionEvent = createCollectionEventSchema(RoomState, RoomEvent);

export type RoomCollectionEvent = CollectionEvent<
  z.infer<typeof RoomState>,
  z.infer<typeof RoomEvent>
>;

// ========================================
// Room Collection Error Schema
// ========================================

export const RoomCollectionError = createCollectionErrorSchema(RoomError);

export type RoomCollectionError = CollectionError<z.infer<typeof RoomError>>;

// ========================================
// Room Collection State Type
// ========================================

export type RoomCollectionState = CollectionState<
  z.infer<typeof RoomState>,
  z.infer<typeof RoomCommand>,
  z.infer<typeof RoomEvent>,
  z.infer<typeof RoomError>
>;

// ========================================
// Room Collection Factory
// ========================================

export function createRoomCollection(): Fst<
  RoomCollectionState,
  RoomCollectionCommand,
  RoomCollectionEvent,
  RoomCollectionError
> {
  return createFstCollection(ROOM_ENTITY_TYPE, (initialState) =>
    createRoom(initialState.owner, initialState.code)
  );
}
