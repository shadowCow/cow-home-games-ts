import { useState, useEffect } from "react";
import { Game } from "@cow-sunday/protocol";
import { GameService } from "../../services/game/GameService";
import { Button } from "../common/Button/Button";
import styles from "./GamesPage.module.css";

export function GamesPage(props: {
  roomId: string;
  gameService: GameService;
  onBack: () => void;
  onConfirm: (gameId: string) => void;
}) {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      const fetchedGames = await props.gameService.listGames();
      setGames(fetchedGames);
    };

    fetchGames();
  }, [props.gameService]);

  const handleConfirm = () => {
    if (!selectedGame) return;
    props.onConfirm(selectedGame);
  };

  const handleBack = () => {
    props.onBack();
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Select a Game</h1>

        <div className={styles.gamesList}>
          {games.length === 0 ? (
            <p className={styles.noGames}>No games available</p>
          ) : (
            <ul className={styles.games}>
              {games.map((game) => (
                <li
                  key={game.name}
                  className={`${styles.gameItem} ${
                    selectedGame === game.name ? styles.selected : ""
                  }`}
                  onClick={() => setSelectedGame(game.name)}
                >
                  <input
                    type="radio"
                    name="game"
                    value={game.name}
                    checked={selectedGame === game.name}
                    onChange={() => setSelectedGame(game.name)}
                    className={styles.radio}
                  />
                  <span className={styles.gameName}>{game.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.actions}>
          <Button onClick={handleBack} variant="secondary">
            Back
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedGame}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
