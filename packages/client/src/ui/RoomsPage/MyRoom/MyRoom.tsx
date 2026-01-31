import { useState, useEffect } from "react";
import { GameServerProxy, RoomDoor } from "@cow-sunday/protocol";
import { User } from "../../../services/auth/User";
import { Button } from "../../common/Button/Button";
import { Loading } from "../../common/Loading/Loading";
import styles from "./MyRoom.module.css";

export function MyRoom(props: {
  user: User;
  gameServerProxy: GameServerProxy;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [roomDoor, setRoomDoor] = useState<RoomDoor | null>(null);

  useEffect(() => {
    props.gameServerProxy.getRoomDoor(props.user.username).then((result) => {
      setRoomDoor(result);
      setIsLoading(false);
    });
  }, [props.gameServerProxy, props.user.username]);

  const handleOpen = () => {
    console.log("Open clicked");
  };

  const handleCreate = () => {
    console.log("Create clicked");
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>My Room</h2>
      {isLoading ? (
        <Loading />
      ) : roomDoor ? (
        <Button onClick={handleOpen}>Open</Button>
      ) : (
        <Button onClick={handleCreate}>Create</Button>
      )}
    </div>
  );
}
