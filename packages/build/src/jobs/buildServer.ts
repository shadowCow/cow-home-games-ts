import { shell } from '../utils';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildServer(): Promise<void> {
  const serverDir = path.join(__dirname, '../../../server');
  await shell('npm run build', serverDir);
}
