import { Dispatch, useState, useEffect } from "react";
import { NavigationAction } from "../../Navigator/navigationReducer";
import { GameServerProxy, RoomsProjection } from "@cow-sunday/protocol";
import { List } from "../../common/List/List";
import { Loading } from "../../common/Loading/Loading";
import styles from "./RoomsList.module.css";

export function RoomsList(props: {
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

  const renderContent = () => {
    if (rooms === undefined) {
      return <Loading />;
    }
    if (rooms.rooms.length === 0) {
      return <div className={styles.emptyState}>No Rooms</div>;
    }
    return (
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
    );
  };

  return (
    <div>
      <h2 className={styles.title}>Rooms</h2>
      {renderContent()}
    </div>
  );
}
