import { z } from "zod";
import type { RoomState, RoomEvent } from "./room";
import type { CollectionEvent } from "../fst/fst-collection";

export const RoomsProjection = z.object({
  kind: z.literal("RoomsProjection"),
  rooms: z.array(
    z.object({
      entityId: z.string(),
      roomOwner: z.string(),
    })
  ),
});

export type RoomsProjection = z.infer<typeof RoomsProjection>;

// ========================================
// RoomsProjection Factory
// ========================================

export function roomsProjectionInitialState(): RoomsProjection {
  return {
    kind: "RoomsProjection",
    rooms: [],
  };
}

// ========================================
// RoomsProjection Reducer
// ========================================

export function roomsProjectionReducer(
  state: RoomsProjection,
  event: CollectionEvent<RoomState, RoomEvent>
): RoomsProjection {
  switch (event.kind) {
    case "EntityAdded":
      return {
        ...state,
        rooms: [
          ...state.rooms,
          {
            entityId: event.id,
            roomOwner: event.initialState.owner,
          },
        ],
      };

    case "EntityRemoved":
      return {
        ...state,
        rooms: state.rooms.filter((room) => room.entityId !== event.id),
      };

    case "EntityUpdated":
      // Entity updates don't affect the projection, which only tracks
      // room existence and ownership (ownership changes aren't supported)
      return state;
  }
}
