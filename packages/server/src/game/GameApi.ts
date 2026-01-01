import { FastifyInstance } from 'fastify';
import { Game, GameSession } from '@cow-sunday/protocol';
import { GameRepo } from './GameRepo';
import { GameSessionRepo } from './GameSessionRepo';

export function registerGameRoutes(
  fastify: FastifyInstance,
  gameRepo: GameRepo,
  gameSessionRepo: GameSessionRepo
) {
  // GET /api/games - List all available games
  fastify.get('/api/games', async (request, reply) => {
    const games = await gameRepo.listGames();
    return games;
  });

  // GET /api/game-sessions - List all game sessions
  fastify.get('/api/game-sessions', async (request, reply) => {
    const sessions = await gameSessionRepo.listGameSessions();
    return sessions;
  });

  // POST /api/game-sessions - Create a new game session
  fastify.post<{
    Body: { gameName: string };
  }>('/api/game-sessions', async (request, reply) => {
    const { gameName } = request.body;

    if (!gameName) {
      return reply.code(400).send({ error: 'gameName is required' });
    }

    const sessionId = await gameSessionRepo.createGameSession(gameName);
    return { sessionId };
  });

  // GET /api/game-sessions/:id - Get a specific game session
  fastify.get<{
    Params: { id: string };
  }>('/api/game-sessions/:id', async (request, reply) => {
    const { id } = request.params;
    const session = await gameSessionRepo.getGameSession(id);

    if (!session) {
      return reply.code(404).send({ error: 'Game session not found' });
    }

    return session;
  });
}
