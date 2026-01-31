export type LoggingService = {
  info(message: string): void;
  error(message: string): void;
};

export function createConsoleLoggingService(): LoggingService {
  return {
    info(message: string): void {
      console.log(message);
    },
    error(message: string): void {
      console.error(message);
    },
  };
}
