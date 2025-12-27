import { shell } from '../utils';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function buildClient(): Promise<void> {
  const clientDir = path.join(__dirname, '../../../client');
  await shell('npm run build', clientDir);
}
