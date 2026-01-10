import { Dispatch, useState } from "react";
import { NavigationAction } from "../Navigator/navigationReducer";
import { RoomsProjection } from "@cow-sunday/protocol";
import styles from "./RoomsPage.module.css";

export function RoomsPage(props: { navigate: Dispatch<NavigationAction> }) {
  const [rooms, setRooms] = useState<RoomsProjection>();

  return (
    <div className={styles.container}>
      {rooms === undefined ? (
        <p className={styles.loading}>Loading...</p>
      ) : (
        <RoomsList rooms={rooms.rooms} />
      )}
    </div>
  );
}

function RoomsList(props: { rooms: RoomsProjection["rooms"] }) {
  return <></>;
}
