// Available views in the application
export type View =
  | { kind: "GameSessions" }
  | { kind: "Games" }
  | { kind: "GameSessionBuilder"; selectedGameName: string }
  | { kind: "GameSession"; sessionId: string };

// Navigation state
export type NavigationState = {
  currentView: View;
};

// Navigation actions
export type NavigationAction =
  | { type: "NavigateToGameSessions" }
  | { type: "NavigateToGames" }
  | { type: "NavigateToGameSessionBuilder"; selectedGameName: string }
  | { type: "NavigateToGameSession"; sessionId: string };

// Navigation reducer
export function navigationReducer(
  state: NavigationState,
  action: NavigationAction
): NavigationState {
  switch (action.type) {
    case "NavigateToGameSessions":
      return { currentView: { kind: "GameSessions" } };
    case "NavigateToGames":
      return { currentView: { kind: "Games" } };
    case "NavigateToGameSessionBuilder":
      return {
        currentView: {
          kind: "GameSessionBuilder",
          selectedGameName: action.selectedGameName,
        },
      };
    case "NavigateToGameSession":
      return {
        currentView: { kind: "GameSession", sessionId: action.sessionId },
      };
    default:
      return state;
  }
}

// Initial state factory
export function createInitialNavigationState(): NavigationState {
  return {
    currentView: { kind: "GameSessions" },
  };
}
