import { useState } from "react";
import { TextField } from "../common/TextField/TextField";
import { Button } from "../common/Button/Button";
import styles from "./RoomEntry.module.css";

export function RoomEntry(props: {
  roomId: string;
  onJoin: (roomId: string, code: string) => void;
}) {
  const [code, setCode] = useState("");

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Join Room</h2>
      <div className={styles.roomId}>{props.roomId}</div>
      <div className={styles.codeRow}>
        <TextField
          label="Room Code"
          value={code}
          onChange={setCode}
        />
        <Button onClick={() => props.onJoin(props.roomId, code)}>Join</Button>
      </div>
    </div>
  );
}
