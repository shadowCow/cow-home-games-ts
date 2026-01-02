export type GameDefinition = {
  name: string; // unique identifier for the game
  description: string; // short description of the game
  playerRange: {
    min: number;
    max: number;
  };
  rules: (input: unknown) => unknown; // game rules implementation
};
