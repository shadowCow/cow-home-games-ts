import { createGameServerProxy, GameServerProxy } from "@cow-sunday/protocol";
import {
  createJsonMessageChannelWs,
  WebSocketChannelConfig,
} from "./JsonMessageChannelWs";

export type GameServerProxyWs = GameServerProxy & {
  connect: () => void;
  close: () => void;
};

export function createProxyWithWebsocket(
  config: WebSocketChannelConfig
): GameServerProxyWs {
  const channel = createJsonMessageChannelWs(config);

  const proxy = createGameServerProxy(channel);

  return {
    offerRoomsCommand(command) {
      return proxy.offerRoomsCommand(command);
    },
    subscribeToRooms(cb) {
      return proxy.subscribeToRooms(cb);
    },
    offerRoomCommand(command) {
      return proxy.offerRoomCommand(command);
    },
    subscribeToRoom(roomId, cb) {
      return proxy.subscribeToRoom(roomId, cb);
    },
    connect() {
      return channel.connect();
    },
    close() {
      return channel.close();
    },
  };
}
