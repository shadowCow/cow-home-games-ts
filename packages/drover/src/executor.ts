import { exec } from 'child_process';
import { promisify } from 'util';
import type { Action } from './actions';

const execAsync = promisify(exec);

export class ActionExecutor {
  async execute(action: Action): Promise<void> {
    switch (action.type) {
      case 'shell':
        return this.executeShell(action);
      case 'log':
        return this.executeLog(action);
      default:
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }

  private async executeShell(action: { command: string; cwd?: string }): Promise<void> {
    try {
      const { stdout, stderr } = await execAsync(action.command, { cwd: action.cwd });
      if (stdout) console.log(stdout.trim());
      if (stderr) console.error(stderr.trim());
    } catch (error: any) {
      console.error(`Command failed: ${action.command}`);
      throw error;
    }
  }

  private async executeLog(action: { message: string }): Promise<void> {
    console.log(action.message);
  }
}
