import { assertNever, err, ok, Result } from "@cow-sunday/fp-ts";
import { z } from "zod";
import {
  createFstFollower,
  createFstLeader,
  createSnapshot,
  FstFollower,
  FstLeader,
  Snapshot,
} from "../fst/fst";

// ========================================
// User State
// ========================================

export const UserState = z.object({
  username: z.string(),
  passwordHash: z.string(),
});

export type UserState = z.infer<typeof UserState>;

function userInitialState(username: string, passwordHash: string): UserState {
  return {
    username,
    passwordHash,
  };
}

function userInitialSnapshot(
  username: string,
  passwordHash: string
): Snapshot<UserState> {
  return createSnapshot(userInitialState(username, passwordHash));
}

// ========================================
// User Commands
// ========================================'

export const AuthenticateUser = z.object({
  kind: z.literal("AuthenticateUser"),
  username: z.string(),
  password: z.string(),
});

export type AuthenticateUser = z.infer<typeof AuthenticateUser>;

export const ChangePassword = z.object({
  kind: z.literal("ChangePassword"),
  username: z.string(),
  oldPassword: z.string(),
  newPassword: z.string(),
});

export type ChangePassword = z.infer<typeof ChangePassword>;

export const UserCommand = z.discriminatedUnion("kind", [
  AuthenticateUser,
  ChangePassword,
]);

export type UserCommand = z.infer<typeof UserCommand>;

// ========================================
// User Events
// ========================================

export const UserAuthenticated = z.object({
  kind: z.literal("UserAuthenticated"),
  username: z.string(),
});

export type UserAuthenticated = z.infer<typeof UserAuthenticated>;

export const PasswordChanged = z.object({
  kind: z.literal("PasswordChanged"),
  username: z.string(),
});

export type PasswordChanged = z.infer<typeof PasswordChanged>;

export const UserEvent = z.discriminatedUnion("kind", [
  UserAuthenticated,
  PasswordChanged,
]);

export type UserEvent = z.infer<typeof UserEvent>;

// ========================================
// User Errors
// ========================================

export const AuthenticateUserFailure = z.object({
  kind: z.literal("AuthenticateUserFailure"),
  username: z.string(),
  message: z.literal("username or password invalid"),
});

export type AuthenticateUserFailure = z.infer<typeof AuthenticateUserFailure>;

export const ChangePasswordFailure = z.object({
  kind: z.literal("ChangePasswordFailure"),
  username: z.string(),
  message: z.literal("unable to change password"),
});

export type ChangePasswordFailure = z.infer<typeof ChangePasswordFailure>;

export const UserError = z.discriminatedUnion("kind", [
  AuthenticateUserFailure,
  ChangePasswordFailure,
]);

export type UserError = z.infer<typeof UserError>;

// ========================================
// User FST Context
// ========================================

export type UserContext = {
  hashPassword(password: string): Promise<string>;
  verifyPassword(storedHash: string, candidate: string): boolean;
};

// ========================================
// User FST Command Handler
// ========================================

function handleUserCommand(
  state: UserState,
  command: UserCommand,
  ctx: UserContext
): Result<UserEvent, UserError> {
  switch (command.kind) {
    case "AuthenticateUser": {
      const isVerified = ctx.verifyPassword(
        state.passwordHash,
        command.password
      );

      if (!isVerified) {
        return err({
          kind: "AuthenticateUserFailure",
          username: command.username,
          message: "username or password invalid" as const,
        });
      }

      return ok({
        kind: "UserAuthenticated",
        username: command.username,
      });
    }
    case "ChangePassword": {
      const isVerified = ctx.verifyPassword(
        state.passwordHash,
        command.oldPassword
      );

      if (!isVerified) {
        return err({
          kind: "ChangePasswordFailure",
          username: command.username,
          message: "unable to change password" as const,
        });
      }

      // TODO actually change it, this requires making command handler async
      return ok({
        kind: "PasswordChanged",
        username: command.username,
      });
    }
    default:
      assertNever(command);
  }
}

// ========================================
// User FST Reducer
// ========================================

function userReducer(state: UserState, event: UserEvent): UserState {
  return state;
}

// ========================================
// User FST Factories
// ========================================

export function createUserLeader(
  username: string,
  passwordHash: string,
  ctx: UserContext
): FstLeader<UserState, UserCommand, UserEvent, UserError> {
  return createFstLeader(
    handleUserCommand,
    userReducer,
    ctx,
    userInitialSnapshot(username, passwordHash)
  );
}

export function createUserFollower(
  initialState: UserState
): FstFollower<UserState, UserEvent> {
  return createFstFollower(userReducer, initialState);
}
