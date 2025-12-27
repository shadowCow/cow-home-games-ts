export type ActionType = 'shell' | 'log';

export interface BaseAction {
  type: ActionType;
}

export interface ShellAction extends BaseAction {
  type: 'shell';
  command: string;
  cwd?: string;
}

export interface LogAction extends BaseAction {
  type: 'log';
  message: string;
}

export type Action = ShellAction | LogAction;

// Action creator functions
export function shell(command: string, options?: { cwd?: string }): ShellAction {
  return {
    type: 'shell',
    command,
    cwd: options?.cwd
  };
}

export function log(message: string): LogAction {
  return {
    type: 'log',
    message
  };
}
