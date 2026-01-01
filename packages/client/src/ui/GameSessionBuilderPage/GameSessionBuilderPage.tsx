import { Dispatch } from "react";
import { GameService } from "../../services/game/GameService";
import { NavigationAction } from "../Navigator/navigationReducer";
import { Button } from "../common/Button/Button";
import styles from "./GameSessionBuilderPage.module.css";

export function GameSessionBuilderPage(props: {
  gameService: GameService;
  selectedGameName: string;
  navigate: Dispatch<NavigationAction>;
}) {
  const handleBack = () => {
    props.navigate({ type: "NavigateToGames" });
  };

  const handleConfirm = async () => {
    console.log("Creating game session for:", props.selectedGameName);
    const sessionId = await props.gameService.createGameSession(
      props.selectedGameName
    );
    props.navigate({ type: "NavigateToGameSession", sessionId });
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Create Game Session</h1>

        <div className={styles.actions}>
          <Button onClick={handleBack} variant="secondary">
            Back
          </Button>
          <Button onClick={handleConfirm}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
