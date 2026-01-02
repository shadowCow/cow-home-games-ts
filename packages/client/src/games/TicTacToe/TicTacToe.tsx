import styles from "./TicTacToe.module.css";

export function TicTacToe(props: {
  gameState: Record<string, unknown>;
}) {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Tic Tac Toe</h2>
      <p className={styles.stub}>Game rendering coming soon...</p>
      <pre className={styles.debug}>
        {JSON.stringify(props.gameState, null, 2)}
      </pre>
    </div>
  );
}
