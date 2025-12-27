#!/usr/bin/env node

import { createBuild } from './dsl';
import { buildClient } from './jobs/buildClient';
import { buildServer } from './jobs/buildServer';

const build = createBuild();

// Define jobs
const client = build.job('client', buildClient);
const server = build.job('server', buildServer);

// Define a job that builds everything
const all = build.job('all', async () => {
  console.log('Building all packages...');
}).dependsOn(client, server);

// CLI
const jobName = process.argv[2] || 'all';

build.run(jobName).catch(error => {
  console.error('\n✗ Build failed:', error.message);
  process.exit(1);
});
