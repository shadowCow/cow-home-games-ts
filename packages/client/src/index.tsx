import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './global.css';
import App from './ui/App';
import { config } from './config';
import { AuthGateway } from './services/auth/AuthGateway';
import { AuthGatewayGameServer } from './services/auth/AuthGatewayGameServer';
import { AuthGatewayInMemory } from './services/auth/AuthGatewayInMemory';
import { GameService } from './services/game/GameService';
import { GameServiceInMemory } from './services/game/GameServiceInMemory';

// Wire up dependencies
const authGateway: AuthGateway = config.useInMemoryServices
  ? new AuthGatewayInMemory()
  : new AuthGatewayGameServer();

const gameService: GameService = new GameServiceInMemory();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App authGateway={authGateway} gameService={gameService} />
  </StrictMode>
);
