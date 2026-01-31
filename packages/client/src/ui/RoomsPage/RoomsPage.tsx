import { Dispatch, useState, useEffect, useMemo } from "react";
import { NavigationAction } from "../Navigator/navigationReducer";
import { GameServerProxy, RoomsProjection } from "@cow-sunday/protocol";
import { User } from "../../services/auth/User";
import { MyRoom } from "./MyRoom/MyRoom";
import { QuickJoinRoom } from "./QuickJoinRoom/QuickJoinRoom";
import { RoomsList } from "./RoomsList/RoomsList";
import styles from "./RoomsPage.module.css";

export function RoomsPage(props: {
  user: User;
  gameServerProxy: GameServerProxy;
  navigate: Dispatch<NavigationAction>;
}) {
  const [rooms, setRooms] = useState<RoomsProjection>();

  useEffect(() => {
    return props.gameServerProxy.subscribeToRooms((s) => setRooms(s));
  }, [props.gameServerProxy]);

  const myRoomDoor = useMemo(() => {
    if (!rooms) return undefined;
    return rooms.rooms.find((r) => r.roomOwner === props.user.username) ?? null;
  }, [rooms, props.user.username]);

  const handleCreateRoom = () => {
    const roomId = crypto.randomUUID();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    props.gameServerProxy.offerRoomsCommand({
      kind: "AddEntity",
      entityType: "Room",
      id: roomId,
      initialState: {
        id: roomId,
        owner: props.user.username,
        code,
        guests: [],
        activeSession: { kind: "RoomNoSession" },
      },
    });
  };

  return (
    <div className={styles.container}>
      <MyRoom
        roomDoor={myRoomDoor}
        onCreateRoom={handleCreateRoom}
        onOpenRoom={() => {
          if (myRoomDoor) {
            props.navigate({ type: "NavigateToRoom", roomId: myRoomDoor.entityId });
          }
        }}
      />
      <QuickJoinRoom />
      <div className={styles.roomsListSection}>
        <RoomsList
          rooms={rooms}
          navigate={props.navigate}
        />
      </div>
    </div>
  );
}
