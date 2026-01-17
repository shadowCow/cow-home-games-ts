import { Dispatch, useState } from "react";
import { NavigationAction } from "../Navigator/navigationReducer";
import { RoomState } from "@cow-sunday/protocol";
import { GameService } from "../../services/game/GameService";
import { Button } from "../common/Button/Button";
import styles from "./RoomPage.module.css";

export function RoomPage(props: {
  gameService: GameService;
  navigate: Dispatch<NavigationAction>;
}) {
  const [copied, setCopied] = useState(false);

  // TODO: Replace with actual room data fetched based on roomId
  const room: RoomState = {
    id: "room-123",
    owner: "Alice",
    code: "ABC123",
    guests: ["Bob", "Charlie", "Diana"],
    activeSession: { kind: "RoomNoSession" },
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

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

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Room Code</h2>
          <div className={styles.codeContainer}>
            <p className={styles.code}>{room.code}</p>
            <Button onClick={handleCopyCode}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>

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

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Active Session</h2>
          <p className={styles.value}>{room.activeSession.kind}</p>
        </div>

        <div className={styles.actions}>
          <Button onClick={() => props.navigate({ type: "NavigateToRooms" })}>
            Back to Rooms
          </Button>
        </div>
      </div>
    </div>
  );
}
