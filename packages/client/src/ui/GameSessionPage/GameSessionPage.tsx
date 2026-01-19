import { useState, useEffect, Dispatch } from "react";
import { GameSession } from "@cow-sunday/protocol";
import { GameService } from "../../services/game/GameService";
import { NavigationAction } from "../Navigator/navigationReducer";
import { GameRegistry } from "../../games/GameRegistry";
import { Button } from "../common/Button/Button";
import { Loading } from "../common/Loading/Loading";
import styles from "./GameSessionPage.module.css";

export function GameSessionView(props: {
  session: GameSession;
  gameRegistry: GameRegistry;
}) {
  const [error, setError] = useState<string | null>(null);

  // Look up the game component from the registry
  const GameComponent = props.gameRegistry[props.session.game.name];

  if (!GameComponent) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <p className={styles.error}>
            Game "{props.session.game.name}" is not supported
          </p>
        </div>
      </div>
    );
  }

  // TODO: Fetch actual game state from server
  const gameState = {};

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>{props.session.game.name}</h1>
        <p className={styles.sessionInfo}>Session ID: {props.session.id}</p>

        <div className={styles.gameArea}>
          <GameComponent gameState={gameState} />
        </div>
      </div>
    </div>
  );
}
