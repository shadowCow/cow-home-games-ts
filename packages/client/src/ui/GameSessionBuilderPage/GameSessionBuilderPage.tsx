import { Dispatch } from "react";
import { NavigationAction } from "../Navigator/navigationReducer";
import { Button } from "../common/Button/Button";
import styles from "./GameSessionBuilderPage.module.css";

export function GameSessionBuilderPage(props: {
  navigate: Dispatch<NavigationAction>;
}) {
  const handleBack = () => {
    props.navigate({ type: "NavigateTo", view: "Games" });
  };

  const handleConfirm = () => {
    console.log("Confirm button clicked");
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
