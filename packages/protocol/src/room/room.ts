import { ok, err } from "@cow-sunday/fp-ts";
import { z } from "zod";
import { createFst, Fst } from "../fst/fst";

// ========================================
// Room State
// ========================================

export const RoomSession = z.object({
  kind: z.literal("RoomSession"),
  sessionId: z.string(),
});

export type RoomSession = z.infer<typeof RoomSession>;

export const RoomSessionBuilder = z.object({
  kind: z.literal("RoomSessionBuilder"),
  builderId: z.string(),
});

export type RoomSessionBuilder = z.infer<typeof RoomSessionBuilder>;

export const RoomNoSession = z.object({
  kind: z.literal("RoomNoSession"),
});

export type RoomNoSession = z.infer<typeof RoomNoSession>;

export const RoomSessionState = z.discriminatedUnion("kind", [
  RoomSession,
  RoomSessionBuilder,
  RoomNoSession,
]);

export type RoomSessionState = z.infer<typeof RoomSessionState>;

export const RoomState = z.object({
  owner: z.string(),
  guests: z.array(z.string()),
  activeSession: RoomSessionState,
});

export type RoomState = z.infer<typeof RoomState>;

// ========================================
// Room Commands
// ========================================

export const JoinRoom = z.object({
  kind: z.literal("JoinRoom"),
  userId: z.string(),
});

export type JoinRoom = z.infer<typeof JoinRoom>;

export const LeaveRoom = z.object({
  kind: z.literal("LeaveRoom"),
  userId: z.string(),
});

export type LeaveRoom = z.infer<typeof LeaveRoom>;

export const RemoveGuest = z.object({
  kind: z.literal("RemoveGuest"),
  requesterId: z.string(),
  guestId: z.string(),
});

export type RemoveGuest = z.infer<typeof RemoveGuest>;

export const StartGameSession = z.object({
  kind: z.literal("StartGameSession"),
  requesterId: z.string(),
  sessionId: z.string(),
});

export type StartGameSession = z.infer<typeof StartGameSession>;

export const StartGameSessionBuilder = z.object({
  kind: z.literal("StartGameSessionBuilder"),
  requesterId: z.string(),
  builderId: z.string(),
});

export type StartGameSessionBuilder = z.infer<typeof StartGameSessionBuilder>;

export const ClearRoomSession = z.object({
  kind: z.literal("ClearRoomSession"),
  requesterId: z.string(),
});

export type ClearRoomSession = z.infer<typeof ClearRoomSession>;

export const RoomCommand = z.discriminatedUnion("kind", [
  JoinRoom,
  LeaveRoom,
  RemoveGuest,
  StartGameSession,
  StartGameSessionBuilder,
  ClearRoomSession,
]);

export type RoomCommand = z.infer<typeof RoomCommand>;

// ========================================
// Room Events
// ========================================

export const GuestJoined = z.object({
  kind: z.literal("GuestJoined"),
  userId: z.string(),
});

export type GuestJoined = z.infer<typeof GuestJoined>;

export const GuestLeft = z.object({
  kind: z.literal("GuestLeft"),
  userId: z.string(),
});

export type GuestLeft = z.infer<typeof GuestLeft>;

export const GuestRemoved = z.object({
  kind: z.literal("GuestRemoved"),
  guestId: z.string(),
});

export type GuestRemoved = z.infer<typeof GuestRemoved>;

export const GameSessionStarted = z.object({
  kind: z.literal("GameSessionStarted"),
  sessionId: z.string(),
});

export type GameSessionStarted = z.infer<typeof GameSessionStarted>;

export const GameSessionBuilderStarted = z.object({
  kind: z.literal("GameSessionBuilderStarted"),
  builderId: z.string(),
});

export type GameSessionBuilderStarted = z.infer<typeof GameSessionBuilderStarted>;

export const RoomSessionCleared = z.object({
  kind: z.literal("RoomSessionCleared"),
});

export type RoomSessionCleared = z.infer<typeof RoomSessionCleared>;

export const RoomEvent = z.discriminatedUnion("kind", [
  GuestJoined,
  GuestLeft,
  GuestRemoved,
  GameSessionStarted,
  GameSessionBuilderStarted,
  RoomSessionCleared,
]);

export type RoomEvent = z.infer<typeof RoomEvent>;

// ========================================
// Room Errors
// ========================================

export const NotOwner = z.object({
  kind: z.literal("NotOwner"),
  userId: z.string(),
});

export type NotOwner = z.infer<typeof NotOwner>;

export const GuestAlreadyInRoom = z.object({
  kind: z.literal("GuestAlreadyInRoom"),
  userId: z.string(),
});

export type GuestAlreadyInRoom = z.infer<typeof GuestAlreadyInRoom>;

export const GuestNotInRoom = z.object({
  kind: z.literal("GuestNotInRoom"),
  userId: z.string(),
});

export type GuestNotInRoom = z.infer<typeof GuestNotInRoom>;

export const OwnerCannotLeave = z.object({
  kind: z.literal("OwnerCannotLeave"),
});

export type OwnerCannotLeave = z.infer<typeof OwnerCannotLeave>;

export const SessionAlreadyActive = z.object({
  kind: z.literal("SessionAlreadyActive"),
});

export type SessionAlreadyActive = z.infer<typeof SessionAlreadyActive>;

export const RoomError = z.discriminatedUnion("kind", [
  NotOwner,
  GuestAlreadyInRoom,
  GuestNotInRoom,
  OwnerCannotLeave,
  SessionAlreadyActive,
]);

export type RoomError = z.infer<typeof RoomError>;

// ========================================
// Room FST Factory
// ========================================

export function createRoom(ownerId: string): Fst<RoomState, RoomCommand, RoomEvent, RoomError> {
  const initialState: RoomState = {
    owner: ownerId,
    guests: [],
    activeSession: { kind: "RoomNoSession" },
  };

  return createFst<RoomState, RoomCommand, RoomEvent, RoomError, void>(
    (state, command) => {
      switch (command.kind) {
        case "JoinRoom": {
          // Owner cannot join as guest
          if (command.userId === state.owner) {
            return err({ kind: "GuestAlreadyInRoom", userId: command.userId });
          }

          // Check if already in room
          if (state.guests.includes(command.userId)) {
            return err({ kind: "GuestAlreadyInRoom", userId: command.userId });
          }

          return ok({ kind: "GuestJoined", userId: command.userId });
        }

        case "LeaveRoom": {
          // Owner cannot leave
          if (command.userId === state.owner) {
            return err({ kind: "OwnerCannotLeave" });
          }

          // Check if user is in room
          if (!state.guests.includes(command.userId)) {
            return err({ kind: "GuestNotInRoom", userId: command.userId });
          }

          return ok({ kind: "GuestLeft", userId: command.userId });
        }

        case "RemoveGuest": {
          // Only owner can remove guests
          if (command.requesterId !== state.owner) {
            return err({ kind: "NotOwner", userId: command.requesterId });
          }

          // Check if guest is in room
          if (!state.guests.includes(command.guestId)) {
            return err({ kind: "GuestNotInRoom", userId: command.guestId });
          }

          return ok({ kind: "GuestRemoved", guestId: command.guestId });
        }

        case "StartGameSession": {
          // Only owner can start sessions
          if (command.requesterId !== state.owner) {
            return err({ kind: "NotOwner", userId: command.requesterId });
          }

          // Cannot start if session already active
          if (state.activeSession.kind !== "RoomNoSession") {
            return err({ kind: "SessionAlreadyActive" });
          }

          return ok({ kind: "GameSessionStarted", sessionId: command.sessionId });
        }

        case "StartGameSessionBuilder": {
          // Only owner can start builders
          if (command.requesterId !== state.owner) {
            return err({ kind: "NotOwner", userId: command.requesterId });
          }

          // Cannot start if session already active
          if (state.activeSession.kind !== "RoomNoSession") {
            return err({ kind: "SessionAlreadyActive" });
          }

          return ok({ kind: "GameSessionBuilderStarted", builderId: command.builderId });
        }

        case "ClearRoomSession": {
          // Only owner can clear session
          if (command.requesterId !== state.owner) {
            return err({ kind: "NotOwner", userId: command.requesterId });
          }

          return ok({ kind: "RoomSessionCleared" });
        }
      }
    },
    (state, event) => {
      switch (event.kind) {
        case "GuestJoined":
          return {
            ...state,
            guests: [...state.guests, event.userId],
          };

        case "GuestLeft":
          return {
            ...state,
            guests: state.guests.filter((id) => id !== event.userId),
          };

        case "GuestRemoved":
          return {
            ...state,
            guests: state.guests.filter((id) => id !== event.guestId),
          };

        case "GameSessionStarted":
          return {
            ...state,
            activeSession: { kind: "RoomSession", sessionId: event.sessionId },
          };

        case "GameSessionBuilderStarted":
          return {
            ...state,
            activeSession: { kind: "RoomSessionBuilder", builderId: event.builderId },
          };

        case "RoomSessionCleared":
          return {
            ...state,
            activeSession: { kind: "RoomNoSession" },
          };
      }
    },
    undefined,
    initialState
  );
}
