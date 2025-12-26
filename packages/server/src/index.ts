import Fastify from 'fastify';

const fastify = Fastify({
  logger: true
});

fastify.get('/api/hello', async () => {
  return { message: 'Hello from Cow Home Games server!' };
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
