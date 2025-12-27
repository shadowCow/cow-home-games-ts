import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import type { Action } from './actions';

const execAsync = promisify(exec);

export class ActionExecutor {
  async execute(action: Action): Promise<void> {
    switch (action.type) {
      case 'shell':
        return this.executeShell(action);
      case 'log':
        return this.executeLog(action);
      case 'clean':
        return this.executeClean(action);
      case 'copy':
        return this.executeCopy(action);
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

  private async executeClean(action: { path: string }): Promise<void> {
    try {
      await fs.rm(action.path, { recursive: true, force: true });
    } catch (error: any) {
      console.error(`Clean failed: ${action.path}`);
      throw error;
    }
  }

  private async executeCopy(action: { from: string; to: string; recursive?: boolean }): Promise<void> {
    try {
      const stat = await fs.stat(action.from);

      if (stat.isDirectory()) {
        if (!action.recursive) {
          throw new Error(`Cannot copy directory without recursive option: ${action.from}`);
        }
        await fs.cp(action.from, action.to, { recursive: true });
      } else {
        // Ensure destination directory exists
        const destDir = path.dirname(action.to);
        await fs.mkdir(destDir, { recursive: true });
        await fs.copyFile(action.from, action.to);
      }
    } catch (error: any) {
      console.error(`Copy failed: ${action.from} -> ${action.to}`);
      throw error;
    }
  }
}
