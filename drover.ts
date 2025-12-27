import { createJobGraph, shell, log, clean } from './packages/drover/src/api';

export const graph = createJobGraph();

// Define jobs
const droverBuild = graph.job('drover:build', [
  clean('packages/drover/dist'),
  shell('npm run build', { cwd: 'packages/drover' })
]);

const clientBuild = graph.job('client:build', [
  clean('packages/client/dist'),
  shell('npm run build', { cwd: 'packages/client' })
]);

const serverBuild = graph.job('server:build', [
  clean('packages/server/dist'),
  shell('npm run build', { cwd: 'packages/server' })
]);

// Define a job that builds everything
const build = graph.job('build', [
  log('All packages built successfully!')
]).dependsOn(droverBuild, clientBuild, serverBuild);

// Define a job to run the Docker container
graph.job('docker:run', [
  shell('docker compose up --build')
]);
