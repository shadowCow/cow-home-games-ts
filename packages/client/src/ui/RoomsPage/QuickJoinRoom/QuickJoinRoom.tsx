import { useState } from "react";
import { TextField } from "../../common/TextField/TextField";
import { Button } from "../../common/Button/Button";
import styles from "./QuickJoinRoom.module.css";

export function QuickJoinRoom(props: {
  onJoinRoom: (roomId: string, code: string) => void;
}) {
  const [roomId, setRoomId] = useState("");
  const [code, setCode] = useState("");

  const handleJoin = () => {
    props.onJoinRoom(roomId, code);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Quick Join</h2>
      <TextField value={roomId} onChange={setRoomId} placeholder="Room ID" />
      <TextField value={code} onChange={setCode} placeholder="Code" />
      <Button onClick={handleJoin}>Join</Button>
    </div>
  );
}
