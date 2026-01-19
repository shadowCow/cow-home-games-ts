import { useEffect } from "react";
import { Navigator } from "../Navigator/Navigator";
import { GameServerProxyWs } from "../../services/game/ProxyWithWebsocket";
import { GameRegistry } from "../../games/GameRegistry";

export function Home(props: {
  gameServerProxy: GameServerProxyWs;
  gameRegistry: GameRegistry;
}) {
  useEffect(() => {
    // Connect to the game server on mount
    props.gameServerProxy.connect();

    // Clean up: close connection on unmount
    return () => {
      props.gameServerProxy.close();
    };
  }, [props.gameServerProxy]);

  return (
    <Navigator
      gameServerProxy={props.gameServerProxy}
      gameRegistry={props.gameRegistry}
    />
  );
}
