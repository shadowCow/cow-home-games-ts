import { z } from 'zod';

// ========================================
// Game Session Types
// ========================================

// Game: Represents a game with a unique name
export const Game = z.object({
  name: z.string(),
});

export type Game = z.infer<typeof Game>;

// GameSession: Represents a game session with an ID and associated game
export const GameSession = z.object({
  id: z.string(),
  game: Game,
});

export type GameSession = z.infer<typeof GameSession>;

// ========================================
// Game Action and State Messages
// ========================================

// GameAction: Represents an action taken by a user in a game session
export const GameAction = z.object({
  kind: z.literal('GameAction'),
  sessionId: z.string(),
  userId: z.string(),
});

export type GameAction = z.infer<typeof GameAction>;

// GameState: Represents the current state of a game session
export const GameState = z.object({
  kind: z.literal('GameState'),
  sessionId: z.string(),
});

export type GameState = z.infer<typeof GameState>;

// GameActionInvalid: Indicates that a game action was invalid
export const GameActionInvalid = z.object({
  kind: z.literal('GameActionInvalid'),
  sessionId: z.string(),
  error: z.string(),
});

export type GameActionInvalid = z.infer<typeof GameActionInvalid>;
