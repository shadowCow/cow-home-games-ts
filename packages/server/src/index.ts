import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyJwt from '@fastify/jwt';
import path from 'path';
import { fileURLToPath } from 'url';
import { AuthGatewayJwt } from './auth/AuthGatewayJwt';
import { registerAuthRoutes } from './auth/AuthApi';
import { UserRepoFs } from './user-repo/UserRepoFs';
import { UserRepoInMemory } from './user-repo/UserRepoInMemory';
import { UserRepo } from './user-repo/UserRepo';
import { config } from './config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: true
});

// Register JWT plugin
await fastify.register(fastifyJwt, {
  secret: 'supersecretkey' // TODO: Move to environment variable
});

// Wire up dependencies
const userRepo: UserRepo = config.useInMemoryUsers
  ? new UserRepoInMemory()
  : new UserRepoFs();
const authGateway = new AuthGatewayJwt(fastify.jwt, userRepo);

// Register auth routes
registerAuthRoutes(fastify, authGateway);

// API routes
fastify.get('/api/hello', async () => {
  return { message: 'Hello from Cow Home Games server!' };
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
