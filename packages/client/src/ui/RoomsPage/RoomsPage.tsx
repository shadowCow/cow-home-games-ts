import { Dispatch, useState, useEffect } from "react";
import { NavigationAction } from "../Navigator/navigationReducer";
import { RoomsProjection } from "@cow-sunday/protocol";
import { GameService } from "../../services/game/GameService";
import { List } from "../common/List/List";
import { Loading } from "../common/Loading/Loading";
import styles from "./RoomsPage.module.css";

export function RoomsPage(props: {
  gameService: GameService;
  navigate: Dispatch<NavigationAction>;
}) {
  const [rooms, setRooms] = useState<RoomsProjection>();
  const [selectedIndex, setSelectedIndex] = useState<number>();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const roomsProjection = await props.gameService.listRooms();
        setRooms(roomsProjection);
      } catch (error) {
        console.error("Failed to fetch rooms:", error);
      }
    };

    fetchRooms();
  }, [props.gameService]);

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
