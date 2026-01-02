import { Result, Ok, Err, err, ok } from "@cow-sunday/fp-ts";
import { createFst } from "../fst/fst";
import { GameDefinition, GameError } from "../game-definition";

// ========================================
// Types
// ========================================

export type Player = "X" | "O";
export type Cell = Player | null;
export type Board = [
  [Cell, Cell, Cell],
  [Cell, Cell, Cell],
  [Cell, Cell, Cell]
];

export type Position = {
  row: number;
  col: number;
};

export type TicTacToeState = {
  board: Board;
  currentPlayer: Player;
  winner: Player | "Draw" | null;
  gameOver: boolean;
};

export type TicTacToeCommand = {
  kind: "PlaceMark";
  position: Position;
  player: Player;
};

export type TicTacToeEvent = {
  kind: "MarkPlaced";
  position: Position;
  player: Player;
};

export type TicTacToeError =
  | { kind: "InvalidPosition"; position: Position }
  | { kind: "PositionTaken"; position: Position }
  | { kind: "GameOver" }
  | { kind: "WrongPlayer"; expected: Player; actual: Player };

// ========================================
// Game Logic
// ========================================

function createEmptyBoard(): Board {
  return [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ];
}

function isValidPosition(pos: Position): boolean {
  return pos.row >= 0 && pos.row < 3 && pos.col >= 0 && pos.col < 3;
}

function checkWinner(board: Board): Player | "Draw" | null {
  // Check rows
  for (let row = 0; row < 3; row++) {
    if (
      board[row][0] !== null &&
      board[row][0] === board[row][1] &&
      board[row][1] === board[row][2]
    ) {
      return board[row][0];
    }
  }

  // Check columns
  for (let col = 0; col < 3; col++) {
    if (
      board[0][col] !== null &&
      board[0][col] === board[1][col] &&
      board[1][col] === board[2][col]
    ) {
      return board[0][col];
    }
  }

  // Check diagonals
  if (
    board[0][0] !== null &&
    board[0][0] === board[1][1] &&
    board[1][1] === board[2][2]
  ) {
    return board[0][0];
  }

  if (
    board[0][2] !== null &&
    board[0][2] === board[1][1] &&
    board[1][1] === board[2][0]
  ) {
    return board[0][2];
  }

  // Check for draw (board full)
  const isFull = board.every((row) => row.every((cell) => cell !== null));
  if (isFull) {
    return "Draw";
  }

  return null;
}

function handleCommand(
  state: TicTacToeState,
  command: TicTacToeCommand,
  _ctx: void
): Result<TicTacToeEvent, TicTacToeError> {
  if (command.kind !== "PlaceMark") {
    throw new Error(`Unknown command kind: ${(command as any).kind}`);
  }

  // Check if game is over
  if (state.gameOver) {
    return err({ kind: "GameOver" });
  }

  // Check if it's the right player's turn
  if (command.player !== state.currentPlayer) {
    return err({
      kind: "WrongPlayer",
      expected: state.currentPlayer,
      actual: command.player,
    });
  }

  // Check if position is valid
  if (!isValidPosition(command.position)) {
    return err({
      kind: "InvalidPosition",
      position: command.position,
    });
  }

  // Check if position is already taken
  if (state.board[command.position.row][command.position.col] !== null) {
    return err({
      kind: "PositionTaken",
      position: command.position,
    });
  }

  // Command is valid - create event
  return ok({
    kind: "MarkPlaced",
    position: command.position,
    player: command.player,
  });
}

function applyEvent(
  state: TicTacToeState,
  event: TicTacToeEvent
): TicTacToeState {
  if (event.kind !== "MarkPlaced") {
    throw new Error(`Unknown event kind: ${(event as any).kind}`);
  }

  // Create a new board with the mark placed
  const newBoard = state.board.map((row, rowIndex) =>
    row.map((cell, colIndex) =>
      rowIndex === event.position.row && colIndex === event.position.col
        ? event.player
        : cell
    )
  ) as Board;

  // Check for winner
  const winner = checkWinner(newBoard);

  // Determine next player
  const nextPlayer = event.player === "X" ? "O" : "X";

  return {
    board: newBoard,
    currentPlayer: nextPlayer,
    winner,
    gameOver: winner !== null,
  };
}

// ========================================
// FST Instance
// ========================================

const initialState: TicTacToeState = {
  board: createEmptyBoard(),
  currentPlayer: "X",
  winner: null,
  gameOver: false,
};

const fst = createFst(handleCommand, applyEvent, undefined, initialState);

// ========================================
// Game Definition
// ========================================

function isCommand(input: unknown): input is TicTacToeCommand {
  return (
    typeof input === "object" &&
    input !== null &&
    "kind" in input &&
    (input as any).kind === "PlaceMark" &&
    "position" in input &&
    "player" in input
  );
}

export const ticTacToe: GameDefinition = {
  name: "Tic Tac Toe",
  description: "Classic 3x3 grid game where players alternate marking spaces",
  playerRange: {
    min: 2,
    max: 2,
  },
  rules: (input: unknown): Result<unknown, GameError> => {
    if (!isCommand(input)) {
      return err({
        kind: "GameError" as const,
        message: "Input must be a valid TicTacToeCommand",
      });
    }

    const result = fst.handleCommand(input);

    if (result.kind === "Err") {
      return err({
        kind: "GameError" as const,
        message: "Command failed",
        data: result.value,
      });
    }

    return ok(fst.getState());
  },
};
