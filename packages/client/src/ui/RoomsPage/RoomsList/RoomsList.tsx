import { useState } from "react";
import { RoomsProjection } from "@cow-sunday/protocol";
import { List } from "../../common/List/List";
import { Loading } from "../../common/Loading/Loading";
import styles from "./RoomsList.module.css";
import { Button } from "../../common/Button/Button";

export function RoomsList(props: {
  rooms: RoomsProjection | undefined;
  joinRoom: (roomId: string) => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number>();

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
          <RoomListItem
            roomOwner={room.roomOwner}
            roomId={room.entityId}
            onJoin={() => props.joinRoom(room.entityId)}
          />
        )}
        selectedIndex={selectedIndex}
        onSelectItem={setSelectedIndex}
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

function RoomListItem(props: {
  roomOwner: string;
  roomId: string;
  onJoin: () => void;
}) {
  return (
    <div className={styles.roomItem}>
      <div className={styles.roomInfo}>
        <div className={styles.roomOwner}>{props.roomOwner}</div>
        <div className={styles.roomId}>{props.roomId}</div>
      </div>
      <Button onClick={props.onJoin}>Join</Button>
    </div>
  );
}
