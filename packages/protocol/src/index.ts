// Platform-agnostic protocol definitions and shared business logic
// This package can run in both browser and Node.js environments

export * from "./auth/authentication";
export * from "./channel/json-message-channel";
export * from "./common/validation";
export * from "./game/session";
export * from "./fst/fst";
export * from "./fst/projection-store";
export * from "./game-server/game-server";
export * from "./game-server-proxy/game-server-proxy";
export * from "./room/room";
export * from "./room/rooms-projection";
