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
