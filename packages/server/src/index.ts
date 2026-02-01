import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyJwt from '@fastify/jwt';
import fastifyWebsocket from '@fastify/websocket';
import path from 'path';
import { fileURLToPath } from 'url';
import { createGameServer } from '@cow-sunday/protocol';
import { AuthGatewayJwt } from './auth/AuthGatewayJwt';
import { registerAuthRoutes } from './auth/AuthApi';
import { UserRepoFs } from './user-repo/UserRepoFs';
import { UserRepoInMemory } from './user-repo/UserRepoInMemory';
import { UserRepo } from './user-repo/UserRepo';
import { GameRepoInMemory } from './game/GameRepoInMemory';
import { GameSessionRepoInMemory } from './game/GameSessionRepoInMemory';
import { registerGameRoutes } from './game/GameApi';
import { RoomRepoInMemory } from './room/RoomRepoInMemory';
import { registerRoomRoutes } from './room/RoomApi';
import { config } from './config';
import { createFastifyLoggingService } from './logging/LoggingServiceFastify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: true
});

// Register JWT plugin
await fastify.register(fastifyJwt, {
  secret: 'supersecretkey' // TODO: Move to environment variable
});

// Register WebSocket plugin
await fastify.register(fastifyWebsocket);

const log = createFastifyLoggingService(fastify.log);

// Create GameServer instance
const gameServer = createGameServer({
  maxSubscribers: 1000,
  onBroadcast: (message, clientId) => {
    // Find the client's WebSocket and send the message
    const connection = clientConnections.get(clientId);
    if (connection) {
      log.info("[ws out]", { clientId, ...message });
      connection.socket.send(JSON.stringify(message));
    }
  }
});

// Track WebSocket connections by client ID
const clientConnections = new Map<string, { socket: any }>();

// Wire up dependencies
const userRepo: UserRepo = config.useInMemoryUsers
  ? new UserRepoInMemory()
  : new UserRepoFs();
const authGateway = new AuthGatewayJwt(fastify.jwt, userRepo);

const gameRepo = new GameRepoInMemory();
const gameSessionRepo = new GameSessionRepoInMemory();
const roomRepo = new RoomRepoInMemory();

// Register auth routes
registerAuthRoutes(fastify, authGateway);

// Register game routes
registerGameRoutes(fastify, gameRepo, gameSessionRepo);

// Register room routes
registerRoomRoutes(fastify, roomRepo);

// API routes
fastify.get('/api/hello', async () => {
  return { message: 'Hello from Cow Home Games server!' };
});

// WebSocket endpoint for game server communication
fastify.register(async (fastify) => {
  fastify.get('/ws/game', { websocket: true }, (socket, _req) => {
    // Generate a unique client ID for this connection
    const clientId = `client-${Math.random().toString(36).substring(2, 11)}`;

    fastify.log.info(`WebSocket client connected: ${clientId}`);

    // Store the connection
    clientConnections.set(clientId, { socket });

    // Send the server-assigned client ID to the client
    socket.send(JSON.stringify({ kind: "ClientConnected", clientId }));

    // Send periodic pings to keep the connection alive
    const pingInterval = setInterval(() => {
      if (socket.readyState === socket.OPEN) {
        socket.ping();
      }
    }, 30000);

    // Handle incoming messages from client
    socket.on('message', (messageBuffer: Buffer) => {
      try {
        const messageString = messageBuffer.toString();
        const message = JSON.parse(messageString);
        log.info("[ws in]", { clientId, ...message });

        // Forward message to GameServer
        // All client communication happens via the onBroadcast callback
        gameServer.handleMessage(message);
      } catch (error) {
        fastify.log.error({ error }, 'Error processing WebSocket message');
      }
    });

    // Clean up on disconnect
    socket.on('close', () => {
      clearInterval(pingInterval);
      fastify.log.info(`WebSocket client disconnected: ${clientId}`);
      clientConnections.delete(clientId);
    });

    socket.on('error', (error: Error) => {
      fastify.log.error({ error }, `WebSocket error for client ${clientId}`);
    });
  });
});

// Serve static files from the client build
const clientDistPath = path.join(__dirname, '../../client/dist');
fastify.register(fastifyStatic, {
  root: clientDistPath,
  prefix: '/'
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
