import { createBuild, shell, log, clean } from './packages/drover/src/api';

export const build = createBuild();

// Define jobs
const drover = build.job('drover', [
  clean('packages/drover/dist'),
  shell('npm run build', { cwd: 'packages/drover' })
]);

const client = build.job('client', [
  clean('packages/client/dist'),
  shell('npm run build', { cwd: 'packages/client' })
]);

const server = build.job('server', [
  clean('packages/server/dist'),
  shell('npm run build', { cwd: 'packages/server' })
]);

// Define a job that builds everything
build.job('all', [
  log('All packages built successfully!')
]).dependsOn(drover, client, server);
