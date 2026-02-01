import { Dispatch, useState, useEffect } from "react";
import { NavigationAction } from "../Navigator/navigationReducer";
import { GameServerProxy, RoomState, RoomSessionState } from "@cow-sunday/protocol";
import { Button } from "../common/Button/Button";
import { Loading } from "../common/Loading/Loading";
import { CopyableText } from "../common/CopyableText/CopyableText";
import styles from "./RoomPage.module.css";

export function RoomPage(props: {
  gameServerProxy: GameServerProxy;
  roomId: string;
  navigate: Dispatch<NavigationAction>;
}) {
  const [room, setRoom] = useState<RoomState>();

  useEffect(() => {
    return props.gameServerProxy.subscribeToRoom(props.roomId, (s) =>
      setRoom(s)
    );
  }, [props.gameServerProxy, props.roomId]);

  if (!room) {
    return (
      <div className={styles.container}>
        <Loading />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>Room Details</h1>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Room ID</h2>
          <p className={styles.value}>{room.id}</p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Owner</h2>
          <p className={styles.value}>{room.owner}</p>
        </div>

        <CopyableText label="Room Code" text={room.code} />

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Guests</h2>
          {room.guests.length === 0 ? (
            <p className={styles.emptyMessage}>No guests have joined yet</p>
          ) : (
            <ul className={styles.guestList}>
              {room.guests.map((guest) => (
                <li key={guest} className={styles.guestItem}>
                  {guest}
                </li>
              ))}
            </ul>
          )}
        </div>

        <SessionView
          activeSession={room.activeSession}
          onNewGame={() => props.navigate({ type: "NavigateToGames", roomId: props.roomId })}
          onCreateSession={() => {
            props.gameServerProxy.offerRoomCommand({
              kind: "StartGameSession",
              roomId: props.roomId,
              requesterId: room.owner,
              sessionId: crypto.randomUUID(),
            });
          }}
        />

        <div className={styles.actions}>
          <Button onClick={() => props.navigate({ type: "NavigateToRooms" })}>
            Back to Rooms
          </Button>
        </div>
      </div>
    </div>
  );
}

function SessionView(props: { activeSession: RoomSessionState; onNewGame: () => void; onCreateSession: () => void }) {
  const renderContent = () => {
    switch (props.activeSession.kind) {
      case "RoomNoSession":
        return (
          <>
            <p className={styles.emptyMessage}>No Game Session</p>
            <Button onClick={props.onNewGame}>New Game</Button>
          </>
        );
      case "RoomSessionBuilder":
        return (
          <>
            <p className={styles.value}>Setting up game</p>
            <p className={styles.value}>{props.activeSession.gameId}</p>
            <Button onClick={props.onCreateSession}>Create</Button>
          </>
        );
      case "RoomSession":
        return <p className={styles.value}>{props.activeSession.sessionId}</p>;
    }
  };

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Active Session</h2>
      {renderContent()}
    </div>
  );
}
