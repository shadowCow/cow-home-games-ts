import type { FastifyBaseLogger } from "fastify";
import type { LoggingService } from "./LoggingService";

export function createFastifyLoggingService(
  logger: FastifyBaseLogger,
): LoggingService {
  return {
    info(message: string, data?: Record<string, unknown>) {
      if (data) {
        logger.info(data, message);
      } else {
        logger.info(message);
      }
    },
    error(message: string, data?: Record<string, unknown>) {
      if (data) {
        logger.error(data, message);
      } else {
        logger.error(message);
      }
    },
  };
}
