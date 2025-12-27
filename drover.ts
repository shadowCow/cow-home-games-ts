import { createBuild, shell, log } from './packages/drover/src/api';

export const build = createBuild();

// Define jobs
const drover = build.job('drover', [
  shell('npm run build', { cwd: 'packages/drover' })
]);

const client = build.job('client', [
  shell('npm run build', { cwd: 'packages/client' })
]);

const server = build.job('server', [
  shell('npm run build', { cwd: 'packages/server' })
]);

// Define a job that builds everything
build.job('all', [
  log('All packages built successfully!')
]).dependsOn(drover, client, server);
