import { FastifyInstance } from 'fastify';
import {
  LoginCommand,
  UserLoggedIn,
  InvalidLogin,
  LogoutCommand,
  UserLoggedOut,
  ValidationFailure,
} from '@cow-sunday/protocol';
import { AuthGateway } from './AuthGateway';

export function registerAuthRoutes(fastify: FastifyInstance, authGateway: AuthGateway) {
  fastify.post<{
    Body: LoginCommand;
  }>('/api/auth/login', async (request, reply) => {
    // Validate the command with Zod
    const result = LoginCommand.safeParse(request.body);

    if (!result.success) {
      const failure: ValidationFailure = {
        kind: 'ValidationFailure',
        message: result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      };
      return reply.code(400).send(failure);
    }

    try {
      const command = result.data;
      const { token, user } = await authGateway.login(command.username, command.password);

      const event: UserLoggedIn = {
        kind: 'UserLoggedIn',
        username: user.username,
        token,
      };

      return event;
    } catch (error) {
      // Handle authentication errors (401)
      const failure: InvalidLogin = {
        kind: 'InvalidLogin',
        error: 'Invalid credentials',
      };
      return reply.code(401).send(failure);
    }
  });

  fastify.post<{
    Body: LogoutCommand;
  }>('/api/auth/logout', async (request, reply) => {
    // Validate the command with Zod
    const result = LogoutCommand.safeParse(request.body);

    if (!result.success) {
      const failure: ValidationFailure = {
        kind: 'ValidationFailure',
        message: result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      };
      return reply.code(400).send(failure);
    }

    await authGateway.logout();

    const event: UserLoggedOut = {
      kind: 'UserLoggedOut',
    };

    return event;
  });
}
