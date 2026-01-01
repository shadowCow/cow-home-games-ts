import { useState, useEffect, Dispatch } from "react";
import { Game } from "@cow-sunday/protocol";
import { GameService } from "../../services/game/GameService";
import { NavigationAction } from "../Navigator/navigationReducer";
import { Button } from "../common/Button/Button";
import styles from "./GamesPage.module.css";

export function GamesPage(props: {
  gameService: GameService;
  navigate: Dispatch<NavigationAction>;
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
    console.log("Confirm button clicked with selected game:", selectedGame);
  };

  const handleBack = () => {
    props.navigate({ type: "NavigateTo", view: "GameSessions" });
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
