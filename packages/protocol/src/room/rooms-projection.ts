import { z } from "zod";

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
