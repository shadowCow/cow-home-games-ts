import { z } from 'zod';

// ========================================
// Login Flow
// ========================================

// Command: Client requests to log in
export const LoginCommand = z.object({
  kind: z.literal('LoginCommand'),
  username: z.string(),
  password: z.string(),
});

export type LoginCommand = z.infer<typeof LoginCommand>;

// Event: User successfully logged in
export const UserLoggedIn = z.object({
  kind: z.literal('UserLoggedIn'),
  username: z.string(),
  token: z.string(),
});

export type UserLoggedIn = z.infer<typeof UserLoggedIn>;

// Failure: Login failed due to invalid credentials
export const InvalidLogin = z.object({
  kind: z.literal('InvalidLogin'),
  error: z.string(),
});

export type InvalidLogin = z.infer<typeof InvalidLogin>;

// ========================================
// Logout Flow
// ========================================

// Command: Client requests to log out
export const LogoutCommand = z.object({
  kind: z.literal('LogoutCommand'),
});

export type LogoutCommand = z.infer<typeof LogoutCommand>;

// Event: User successfully logged out
export const UserLoggedOut = z.object({
  kind: z.literal('UserLoggedOut'),
});

export type UserLoggedOut = z.infer<typeof UserLoggedOut>;
