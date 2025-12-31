import { User } from "../../services/auth/User";
import { Button } from "../common/Button/Button";
import styles from "./Home.module.css";

export function Home(props: { user: User; onLogout: () => void }) {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Cow Home Games</h1>
        <p className={styles.welcome}>Welcome, {props.user.username}!</p>
        <div className={styles.actions}>
          <Button onClick={props.onLogout} variant="secondary">
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
