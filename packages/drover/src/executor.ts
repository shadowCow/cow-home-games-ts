import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import type { Action } from './actions';

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
    return new Promise((resolve, reject) => {
      const child = spawn(action.command, {
        shell: true,
        cwd: action.cwd,
        stdio: 'inherit'
      });

      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}: ${action.command}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
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
