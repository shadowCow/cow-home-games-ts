// Available views in the application
export type View = "GameSessions" | "Games";

// Navigation state
export type NavigationState = {
  currentView: View;
};

// Navigation actions
export type NavigationAction = {
  type: "NavigateTo";
  view: View;
};

// Navigation reducer
export function navigationReducer(
  state: NavigationState,
  action: NavigationAction
): NavigationState {
  switch (action.type) {
    case "NavigateTo":
      return { currentView: action.view };
    default:
      return state;
  }
}

// Initial state factory
export function createInitialNavigationState(): NavigationState {
  return {
    currentView: "GameSessions",
  };
}
