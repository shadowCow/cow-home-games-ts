import { useState, useEffect, Dispatch } from "react";
import { GameSession } from "@cow-sunday/protocol";
import { GameService } from "../../services/game/GameService";
import { NavigationAction } from "../Navigator/navigationReducer";
import { GameRegistry } from "../../games/GameRegistry";
import { Button } from "../common/Button/Button";
import styles from "./GameSessionPage.module.css";

export function GameSessionPage(props: {
  gameService: GameService;
  sessionId: string;
  gameRegistry: GameRegistry;
  navigate: Dispatch<NavigationAction>;
}) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        const fetchedSession = await props.gameService.getGameSession(
          props.sessionId
        );
        setSession(fetchedSession);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load session");
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [props.gameService, props.sessionId]);

  const handleBackToSessions = () => {
    props.navigate({ type: "NavigateToGameSessions" });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <p className={styles.loading}>Loading session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <p className={styles.error}>{error || "Session not found"}</p>
          <Button onClick={handleBackToSessions}>Back to Sessions</Button>
        </div>
      </div>
    );
  }

  // Look up the game component from the registry
  const GameComponent = props.gameRegistry[session.game.name];

  if (!GameComponent) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <p className={styles.error}>
            Game "{session.game.name}" is not supported
          </p>
          <Button onClick={handleBackToSessions}>Back to Sessions</Button>
        </div>
      </div>
    );
  }

  // TODO: Fetch actual game state from server
  const gameState = {};

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>{session.game.name}</h1>
        <p className={styles.sessionInfo}>Session ID: {session.id}</p>

        <div className={styles.gameArea}>
          <GameComponent gameState={gameState} />
        </div>

        <div className={styles.actions}>
          <Button onClick={handleBackToSessions}>Back to Sessions</Button>
        </div>
      </div>
    </div>
  );
}
