import { FastifyInstance } from "fastify";
import { RoomRepo } from "./RoomRepo";

export function registerRoomRoutes(
  fastify: FastifyInstance,
  roomRepo: RoomRepo
) {
  // GET /api/rooms - List all rooms (returns RoomsProjection)
  fastify.get("/api/rooms", async (request, reply) => {
    const roomsProjection = await roomRepo.listRooms();
    return roomsProjection;
  });

  // GET /api/rooms/:id - Get a specific room
  fastify.get<{
    Params: { id: string };
  }>("/api/rooms/:id", async (request, reply) => {
    const { id } = request.params;
    const room = await roomRepo.getRoom(id);

    if (!room) {
      return reply.code(404).send({ error: "Room not found" });
    }

    return room;
  });
}
