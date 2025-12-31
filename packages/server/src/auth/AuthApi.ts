import { FastifyInstance } from 'fastify';
import { AuthGateway } from './AuthGateway';

export function registerAuthRoutes(fastify: FastifyInstance, authGateway: AuthGateway) {
  fastify.post<{
    Body: { username: string; password: string };
  }>('/api/auth/login', async (request, reply) => {
    try {
      const { username, password } = request.body;

      if (!username || !password) {
        return reply.code(400).send({ error: 'Username and password are required' });
      }

      const { token, user } = await authGateway.login(username, password);

      return { token, user };
    } catch (error) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }
  });

  fastify.post('/api/auth/logout', async () => {
    await authGateway.logout();
    return { success: true };
  });
}
