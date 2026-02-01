import { useEffect } from "react";
import { Navigator } from "../Navigator/Navigator";
import { HeaderBar } from "../common/HeaderBar/HeaderBar";
import { GameServerProxyWs } from "../../services/game/ProxyWithWebsocket";
import { GameRegistry } from "../../games/GameRegistry";
import { GameService } from "../../services/game/GameService";
import { User } from "../../services/auth/User";
import styles from "./Home.module.css";

export function Home(props: {
  user: User;
  gameService: GameService;
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
          gameService={props.gameService}
          gameServerProxy={props.gameServerProxy}
          gameRegistry={props.gameRegistry}
        />
      </div>
    </div>
  );
}
