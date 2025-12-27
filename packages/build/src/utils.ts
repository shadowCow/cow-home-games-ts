import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function shell(command: string, cwd?: string): Promise<void> {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    if (stdout) console.log(stdout.trim());
    if (stderr) console.error(stderr.trim());
  } catch (error: any) {
    console.error(`Command failed: ${command}`);
    throw error;
  }
}
