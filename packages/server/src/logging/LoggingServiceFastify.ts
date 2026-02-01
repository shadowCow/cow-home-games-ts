import type { FastifyBaseLogger } from "fastify";
import type { LoggingService } from "./LoggingService";

export function createFastifyLoggingService(
  logger: FastifyBaseLogger,
): LoggingService {
  return {
    info(message: string) {
      logger.info(message);
    },
    error(message: string) {
      logger.error(message);
    },
  };
}
