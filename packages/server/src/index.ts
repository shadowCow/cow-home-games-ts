import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: true
});

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
