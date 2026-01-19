// Available views in the application
export type View =
  | { kind: "Rooms" }
  | { kind: "Room"; roomId: string }
  | { kind: "Games" }
  | { kind: "GameSessionBuilder"; selectedGameName: string }
  | { kind: "GameSession"; sessionId: string };

// Navigation state
export type NavigationState = {
  currentView: View;
};

// Navigation actions
export type NavigationAction =
  | { type: "NavigateToRooms" }
  | { type: "NavigateToRoom"; roomId: string }
  | { type: "NavigateToGames" }
  | { type: "NavigateToGameSessionBuilder"; selectedGameName: string }
  | { type: "NavigateToGameSession"; sessionId: string };

// Navigation reducer
export function navigationReducer(
  state: NavigationState,
  action: NavigationAction
): NavigationState {
  switch (action.type) {
    case "NavigateToRooms":
      return { currentView: { kind: "Rooms" } };
    case "NavigateToRoom":
      return { currentView: { kind: "Room", roomId: action.roomId } };
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
    currentView: { kind: "Rooms" },
  };
}
