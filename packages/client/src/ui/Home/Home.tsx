import { useEffect } from "react";
import { Navigator } from "../Navigator/Navigator";
import { HeaderBar } from "../common/HeaderBar/HeaderBar";
import { GameServerProxyWs } from "../../services/game/ProxyWithWebsocket";
import { GameRegistry } from "../../games/GameRegistry";
import { User } from "../../services/auth/User";
import styles from "./Home.module.css";

export function Home(props: {
  user: User;
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
    <div className={styles.container}>
      <HeaderBar user={props.user} />
      <div className={styles.main}>
        <Navigator
          user={props.user}
          gameServerProxy={props.gameServerProxy}
          gameRegistry={props.gameRegistry}
        />
      </div>
    </div>
  );
}
