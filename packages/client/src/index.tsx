import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui/App';
import { config } from './config';
import { AuthGateway } from './services/auth/AuthGateway';
import { AuthGatewayGameServer } from './services/auth/AuthGatewayGameServer';
import { AuthGatewayInMemory } from './services/auth/AuthGatewayInMemory';

// Wire up dependencies
const authGateway: AuthGateway = config.useInMemoryServices
  ? new AuthGatewayInMemory()
  : new AuthGatewayGameServer();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App authGateway={authGateway} />
  </StrictMode>
);
