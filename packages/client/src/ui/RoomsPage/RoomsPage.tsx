import { Dispatch, useState, useEffect } from "react";
import { NavigationAction } from "../Navigator/navigationReducer";
import { GameServerProxy, RoomsProjection } from "@cow-sunday/protocol";
import { GameService } from "../../services/game/GameService";
import { List } from "../common/List/List";
import { Loading } from "../common/Loading/Loading";
import styles from "./RoomsPage.module.css";

export function RoomsPage(props: {
  gameServerProxy: GameServerProxy;
  navigate: Dispatch<NavigationAction>;
}) {
  const [rooms, setRooms] = useState<RoomsProjection>();
  const [selectedIndex, setSelectedIndex] = useState<number>();

  useEffect(() => {
    return props.gameServerProxy.subscribeToRooms((s) => setRooms(s));
  }, [props.gameServerProxy]);

  const handleSelectRoom = (index: number) => {
    setSelectedIndex(index);
    if (rooms) {
      const room = rooms.rooms[index];
      props.navigate({ type: "NavigateToRoom", roomId: room.entityId });
    }
  };

  return (
    <div className={styles.container}>
      {rooms === undefined ? (
        <Loading />
      ) : (
        <List
          items={rooms.rooms}
          renderItem={(room) => (
            <div className={styles.roomItem}>
              <div className={styles.roomOwner}>{room.roomOwner}</div>
              <div className={styles.roomId}>{room.entityId}</div>
            </div>
          )}
          selectedIndex={selectedIndex}
          onSelectItem={handleSelectRoom}
        />
      )}
    </div>
  );
}
