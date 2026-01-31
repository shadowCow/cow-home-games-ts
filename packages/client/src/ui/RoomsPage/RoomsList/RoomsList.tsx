import { Dispatch, useState } from "react";
import { NavigationAction } from "../../Navigator/navigationReducer";
import { RoomsProjection } from "@cow-sunday/protocol";
import { List } from "../../common/List/List";
import { Loading } from "../../common/Loading/Loading";
import styles from "./RoomsList.module.css";

export function RoomsList(props: {
  rooms: RoomsProjection | undefined;
  navigate: Dispatch<NavigationAction>;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number>();

  const handleSelectRoom = (index: number) => {
    setSelectedIndex(index);
    if (props.rooms) {
      const room = props.rooms.rooms[index];
      props.navigate({ type: "NavigateToRoom", roomId: room.entityId });
    }
  };

  const renderContent = () => {
    if (props.rooms === undefined) {
      return <Loading />;
    }
    if (props.rooms.rooms.length === 0) {
      return <div className={styles.emptyState}>No Rooms</div>;
    }
    return (
      <List
        items={props.rooms.rooms}
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
