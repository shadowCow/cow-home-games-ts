import { useReducer, Dispatch } from "react";
import { GameService } from "../../services/game/GameService";
import { GameSessionsPage } from "../GameSessionsPage/GameSessionsPage";
import { GamesPage } from "../GamesPage/GamesPage";
import { GameSessionBuilderPage } from "../GameSessionBuilderPage/GameSessionBuilderPage";
import {
  navigationReducer,
  createInitialNavigationState,
  NavigationAction,
} from "./navigationReducer";

export function Navigator(props: { gameService: GameService }) {
  const [state, dispatch] = useReducer(
    navigationReducer,
    undefined,
    createInitialNavigationState
  );

  // Render the current view
  switch (state.currentView) {
    case "GameSessions":
      return (
        <GameSessionsPage
          gameService={props.gameService}
          navigate={dispatch}
        />
      );
    case "Games":
      return <GamesPage gameService={props.gameService} navigate={dispatch} />;
    case "GameSessionBuilder":
      return <GameSessionBuilderPage navigate={dispatch} />;
    default:
      return null;
  }
}
