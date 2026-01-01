import { useState, useEffect, Dispatch } from "react";
import { GameSession } from "@cow-sunday/protocol";
import { GameService } from "../../services/game/GameService";
import { NavigationAction } from "../Navigator/navigationReducer";
import { TextField } from "../common/TextField/TextField";
import { Button } from "../common/Button/Button";
import styles from "./GameSessionsPage.module.css";

export function GameSessionsPage(props: {
  gameService: GameService;
  navigate: Dispatch<NavigationAction>;
}) {
  const [joinCode, setJoinCode] = useState("");
  const [sessions, setSessions] = useState<GameSession[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      const fetchedSessions = await props.gameService.listGameSessions();
      setSessions(fetchedSessions);
    };

    fetchSessions();
  }, [props.gameService]);

  const handleCreate = () => {
    props.navigate({ type: "NavigateToGames" });
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    props.navigate({ type: "NavigateToGameSession", sessionId: joinCode });
  };

  const handleJoinSession = (sessionId: string) => {
    props.navigate({ type: "NavigateToGameSession", sessionId });
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Game Sessions</h1>

        <div className={styles.controls}>
          <Button onClick={handleCreate}>
            Create
          </Button>

          <div className={styles.joinSection}>
            <TextField
              id="joinCode"
              type="text"
              placeholder="Enter session code"
              value={joinCode}
              onChange={setJoinCode}
            />
            <Button onClick={handleJoin}>
              Join
            </Button>
          </div>
        </div>

        <div className={styles.sessionsList}>
          <h2 className={styles.sessionsTitle}>Available Sessions</h2>
          {sessions.length === 0 ? (
            <p className={styles.noSessions}>No sessions available</p>
          ) : (
            <ul className={styles.sessions}>
              {sessions.map((session) => (
                <li key={session.id} className={styles.sessionItem}>
                  <span className={styles.gameName}>{session.game.name}</span>
                  <Button onClick={() => handleJoinSession(session.id)}>
                    Join
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
