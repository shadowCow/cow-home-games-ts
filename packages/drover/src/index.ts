#!/usr/bin/env node

import { Command } from 'commander';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('drover')
  .description('A DAG-based build tool for TypeScript projects')
  .version('1.0.0');

program
  .argument('[task]', 'task to run', 'all')
  .option('-f, --file <path>', 'path to build file', 'drover.ts')
  .action((task, options) => {
    const buildFile = path.resolve(process.cwd(), options.file);

    if (!fs.existsSync(buildFile)) {
      console.error(`Build file not found: ${buildFile}`);
      process.exit(1);
    }

    // Use tsx to run the loader with the build file
    const tsxPath = path.join(__dirname, '../node_modules/.bin/tsx');
    const loaderPath = path.join(__dirname, 'loader.js');
    const child = spawn(tsxPath, [loaderPath, buildFile, task], {
      stdio: 'inherit',
      shell: true
    });

    child.on('exit', (code) => {
      process.exit(code || 0);
    });
  });

program.parse();
