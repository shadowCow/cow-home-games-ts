import { Button } from '../../common/Button/Button';
import styles from './MyRoom.module.css';

export function MyRoom() {
  const handleOpen = () => {
    console.log("Open clicked");
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>My Room</h2>
      <Button onClick={handleOpen}>Open</Button>
    </div>
  );
}
