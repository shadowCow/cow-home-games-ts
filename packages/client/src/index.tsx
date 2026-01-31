import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./global.css";
import App from "./ui/App";
import { config } from "./config";
import { AuthGateway } from "./services/auth/AuthGateway";
import { AuthGatewayGameServer } from "./services/auth/AuthGatewayGameServer";
import { AuthGatewayInMemory } from "./services/auth/AuthGatewayInMemory";
import { GameService } from "./services/game/GameService";
import { GameServiceInMemory } from "./services/game/GameServiceInMemory";
import { GameServiceGameServer } from "./services/game/GameServiceGameServer";
import { GameRegistry } from "./games/GameRegistry";
import { TicTacToe } from "./games/TicTacToe/TicTacToe";
import { GameServerProxy } from "@cow-sunday/protocol";
import {
  createProxyWithWebsocket,
  GameServerProxyWs,
} from "./services/game/ProxyWithWebsocket";
import { createProxyInMemory } from "./services/game/ProxyInMemory";
import { createConsoleLoggingService } from "./services/logging/LoggingService";

// Wire up dependencies
const loggingService = createConsoleLoggingService();
const authGateway: AuthGateway = config.useInMemoryServices
  ? new AuthGatewayInMemory()
  : new AuthGatewayGameServer();

const gameService: GameService = config.useInMemoryServices
  ? new GameServiceInMemory()
  : new GameServiceGameServer();

const gameServerProxy: GameServerProxyWs = config.useInMemoryServices
  ? createProxyInMemory()
  : createProxyWithWebsocket(
      {
        url: `ws://${location.host}/ws/game`,
      },
      loggingService,
    );

// Register available games
const gameRegistry: GameRegistry = {
  "Tic Tac Toe": TicTacToe,
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App
      authGateway={authGateway}
      gameServerProxy={gameServerProxy}
      gameRegistry={gameRegistry}
    />
  </StrictMode>,
);
