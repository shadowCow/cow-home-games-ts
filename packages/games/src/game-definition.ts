import { Result } from "@cow-sunday/fp-ts";

export type GameError = {
  kind: "GameError";
  message: string;
  data?: unknown;
};

export type GameDefinition = {
  name: string; // unique identifier for the game
  description: string; // short description of the game
  playerRange: {
    min: number;
    max: number;
  };
  rules: (input: unknown) => Result<unknown, GameError>; // game rules implementation
};
