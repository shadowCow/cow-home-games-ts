import { Result } from "@cow-sunday/fp-ts";

export type Fst<TState, TCommand, TEvent, TError> = {
  getState(): Readonly<TState>;
  handleCommand(c: TCommand): Result<TEvent, TError>;
  applyEvent(e: TEvent): void;
};

export type CommandHandler<TState, TCommand, TEvent, TError, TContext> = (
  s: TState,
  c: TCommand,
  ctx: TContext
) => Result<TEvent, TError>;

export type EventApplyer<TState, TEvent> = (s: TState, e: TEvent) => TState;

export function createFst<TState, TCommand, TEvent, TError, TContext>(
  commandHandler: CommandHandler<TState, TCommand, TEvent, TError, TContext>,
  eventApplyer: EventApplyer<TState, TEvent>,
  ctx: TContext,
  initialState: TState
): Fst<TState, TCommand, TEvent, TError> {
  let state = initialState;

  return {
    getState: function (): Readonly<TState> {
      return state;
    },
    handleCommand: function (c: TCommand): Result<TEvent, TError> {
      const result = commandHandler(state, c, ctx);

      if (result.kind === "Ok") {
        this.applyEvent(result.value);
      }

      return result;
    },
    applyEvent: function (e: TEvent): void {
      state = eventApplyer(state, e);
    },
  };
}
