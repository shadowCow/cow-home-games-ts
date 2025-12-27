export type ActionType = 'shell' | 'log' | 'clean' | 'copy';

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

export interface CleanAction extends BaseAction {
  type: 'clean';
  path: string;
}

export interface CopyAction extends BaseAction {
  type: 'copy';
  from: string;
  to: string;
  recursive?: boolean;
}

export type Action = ShellAction | LogAction | CleanAction | CopyAction;

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

export function clean(path: string): CleanAction {
  return {
    type: 'clean',
    path
  };
}

export function copy(from: string, to: string, options?: { recursive?: boolean }): CopyAction {
  return {
    type: 'copy',
    from,
    to,
    recursive: options?.recursive ?? false
  };
}
