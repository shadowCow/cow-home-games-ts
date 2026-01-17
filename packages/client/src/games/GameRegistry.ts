import { JSX } from "react";

// Type for a game component
export type GameComponent = (props: {
  gameState: Record<string, unknown>;
}) => JSX.Element;

// Type for the game registry that maps game names to components
export type GameRegistry = Record<string, GameComponent>;
