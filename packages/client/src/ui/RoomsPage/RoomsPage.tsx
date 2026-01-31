import { Dispatch } from "react";
import { NavigationAction } from "../Navigator/navigationReducer";
import { GameServerProxy } from "@cow-sunday/protocol";
import { MyRoom } from "./MyRoom/MyRoom";
import { QuickJoinRoom } from "./QuickJoinRoom/QuickJoinRoom";
import { RoomsList } from "./RoomsList/RoomsList";
import styles from "./RoomsPage.module.css";

export function RoomsPage(props: {
  gameServerProxy: GameServerProxy;
  navigate: Dispatch<NavigationAction>;
}) {
  return (
    <div className={styles.container}>
      <MyRoom />
      <QuickJoinRoom />
      <div className={styles.roomsListSection}>
        <RoomsList
          gameServerProxy={props.gameServerProxy}
          navigate={props.navigate}
        />
      </div>
    </div>
  );
}
