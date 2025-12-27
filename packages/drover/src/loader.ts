// This file is used by the drover CLI to load and execute build files
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const [buildFilePath, taskName] = process.argv.slice(2);

if (!buildFilePath || !taskName) {
  console.error('Usage: loader.ts <buildFilePath> <taskName>');
  process.exit(1);
}

const absolutePath = path.resolve(buildFilePath);
const fileUrl = pathToFileURL(absolutePath).href;

(async () => {
  try {
    const module = await import(fileUrl);

    if (!module.build) {
      console.error(`Build file must export a 'build' object`);
      process.exit(1);
    }

    await module.build.run(taskName);
  } catch (error: any) {
    console.error('\n✗ Build failed:', error.message);
    process.exit(1);
  }
})();
