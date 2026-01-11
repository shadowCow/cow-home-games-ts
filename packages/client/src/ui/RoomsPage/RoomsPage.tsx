import { Dispatch, useState, useEffect } from "react";
import { NavigationAction } from "../Navigator/navigationReducer";
import { RoomsProjection } from "@cow-sunday/protocol";
import { List } from "../common/List/List";
import { Loading } from "../common/Loading/Loading";
import styles from "./RoomsPage.module.css";

export function RoomsPage(props: { navigate: Dispatch<NavigationAction> }) {
  const [rooms, setRooms] = useState<RoomsProjection>();
  const [selectedIndex, setSelectedIndex] = useState<number>();

  useEffect(() => {
    // TODO: Replace with actual data fetching
    const hardcodedRooms: RoomsProjection = {
      kind: "RoomsProjection",
      rooms: [
        { entityId: "room-1", roomOwner: "Alice" },
        { entityId: "room-2", roomOwner: "Bob" },
        { entityId: "room-3", roomOwner: "Charlie" },
        { entityId: "room-4", roomOwner: "Diana" },
        { entityId: "room-5", roomOwner: "Eve" },
      ],
    };
    setRooms(hardcodedRooms);
  }, []);

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
          onSelectItem={setSelectedIndex}
        />
      )}
    </div>
  );
}
