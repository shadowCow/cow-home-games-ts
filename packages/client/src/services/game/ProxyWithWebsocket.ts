import { createGameServerProxy, GameServerProxy } from "@cow-sunday/protocol";
import {
  createJsonMessageChannelWs,
  WebSocketChannelConfig,
} from "./JsonMessageChannelWs";

export function createProxyWithWebsocket(
  config: WebSocketChannelConfig
): GameServerProxy {
  return createGameServerProxy(createJsonMessageChannelWs(config));
}
