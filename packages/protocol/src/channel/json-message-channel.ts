// ========================================
// JSON Message Channel
// ========================================

export type JsonMessageChannel = {
  send: (message: string, authToken: string) => void;
  onMessage: (handler: (message: string) => void) => void;
};
