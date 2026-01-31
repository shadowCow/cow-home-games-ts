import { RoomDoor } from "@cow-sunday/protocol";
import { Button } from "../../common/Button/Button";
import { Loading } from "../../common/Loading/Loading";
import styles from "./MyRoom.module.css";

export function MyRoom(props: {
  roomDoor: RoomDoor | null | undefined;
  onCreateRoom: () => void;
  onOpenRoom: () => void;
}) {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>My Room</h2>
      {props.roomDoor === undefined ? (
        <Loading />
      ) : props.roomDoor ? (
        <Button onClick={props.onOpenRoom}>Open</Button>
      ) : (
        <Button onClick={props.onCreateRoom}>Create</Button>
      )}
    </div>
  );
}
