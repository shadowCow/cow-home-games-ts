import { useReducer } from "react";
import { GameService } from "../../services/game/GameService";
import { GameRegistry } from "../../games/GameRegistry";
import { RoomsPage } from "../RoomsPage/RoomsPage";
import { RoomEntry } from "../RoomEntry/RoomEntry";
import { RoomPage } from "../RoomPage/RoomPage";
import { GamesPage } from "../GamesPage/GamesPage";
import {
  navigationReducer,
  createInitialNavigationState,
} from "./navigationReducer";
import { GameServerProxy } from "@cow-sunday/protocol";
import { User } from "../../services/auth/User";

export function Navigator(props: {
  user: User;
  gameService: GameService;
  gameServerProxy: GameServerProxy;
  gameRegistry: GameRegistry;
}) {
  const [state, dispatch] = useReducer(
    navigationReducer,
    undefined,
    createInitialNavigationState,
  );

  // Render the current view
  switch (state.currentView.kind) {
    case "Rooms":
      return (
        <RoomsPage
          user={props.user}
          gameServerProxy={props.gameServerProxy}
          navigate={dispatch}
        />
      );
    case "RoomEntry":
      return (
        <RoomEntry
          roomId={state.currentView.roomId}
          onJoin={(roomId, code) => {
            props.gameServerProxy.offerRoomCommand({
              kind: "JoinRoom",
              roomId,
              userId: props.user.username,
              code,
            });
            dispatch({ type: "NavigateToRoom", roomId });
          }}
        />
      );
    case "Room":
      return (
        <RoomPage
          gameServerProxy={props.gameServerProxy}
          gameRegistry={props.gameRegistry}
          roomId={state.currentView.roomId}
          navigate={dispatch}
        />
      );
    case "Games": {
      const gamesView = state.currentView;
      return (
        <GamesPage
          roomId={gamesView.roomId}
          gameService={props.gameService}
          onBack={() =>
            dispatch({ type: "NavigateToRoom", roomId: gamesView.roomId })
          }
          onConfirm={(gameId) => {
            props.gameServerProxy.offerRoomCommand({
              kind: "StartGameSessionBuilder",
              roomId: gamesView.roomId,
              requesterId: props.user.username,
              builderId: crypto.randomUUID(),
              gameId,
            });
            dispatch({ type: "NavigateToRoom", roomId: gamesView.roomId });
          }}
        />
      );
    }
    // case "GameSessionBuilder":
    //   return (
    //     <GameSessionBuilderPage
    //       gameService={props.gameService}
    //       selectedGameName={state.currentView.selectedGameName}
    //       navigate={dispatch}
    //     />
    //   );
    // case "GameSession":
    //   return (
    //     <GameSessionView
    //       gameService={props.gameService}
    //       sessionId={state.currentView.sessionId}
    //       gameRegistry={props.gameRegistry}
    //       navigate={dispatch}
    //     />
    //   );
    default:
      return null;
  }
}
