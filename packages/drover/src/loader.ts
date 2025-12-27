// This file is used by the drover CLI to load and execute drover files
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const [droverFilePath, taskName] = process.argv.slice(2);

if (!droverFilePath || !taskName) {
  console.error('Usage: loader.ts <droverFilePath> <taskName>');
  process.exit(1);
}

const absolutePath = path.resolve(droverFilePath);
const fileUrl = pathToFileURL(absolutePath).href;

(async () => {
  try {
    const module = await import(fileUrl);

    if (!module.graph) {
      console.error(`Drover file must export a 'graph' object`);
      process.exit(1);
    }

    await module.graph.run(taskName);
  } catch (error: any) {
    console.error('\n✗ Task failed:', error.message);
    process.exit(1);
  }
})();
