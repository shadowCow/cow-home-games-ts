import { createJobGraph, shell, log, clean } from "./packages/drover/src/api";

export const graph = createJobGraph();

// Docker registry configuration
const DOCKER_REGISTRY_HOST = "raspberrypi.local:5000";
const DOCKER_IMAGE_NAME = "cow-home-games-ts";
const DOCKER_IMAGE_TAG = "latest";

// Define jobs
const droverBuild = graph.job("drover:build", [
  clean("packages/drover/dist"),
  shell("npm run build", { cwd: "packages/drover" }),
]);

const protocolBuild = graph.job("protocol:build", [
  clean("packages/protocol/dist"),
  shell("npm run build", { cwd: "packages/protocol" }),
]);

const clientBuild = graph
  .job("client:build", [
    clean("packages/client/dist"),
    shell("npm run build", { cwd: "packages/client" }),
  ])
  .dependsOn(protocolBuild);

const serverBuild = graph
  .job("server:build", [
    clean("packages/server/dist"),
    shell("npm run build", { cwd: "packages/server" }),
  ])
  .dependsOn(protocolBuild);

// Define a job that builds everything
const build = graph
  .job("build", [log("All packages built successfully!")])
  .dependsOn(droverBuild, clientBuild, serverBuild, protocolBuild);

// Define a job to run the Docker container
graph.job("docker:run", [shell("docker compose up --build")]);

// Docker registry jobs
const dockerBuildPi = graph.job("docker:build", [
  log(
    `Building Docker image for ARM64: ${DOCKER_REGISTRY_HOST}/${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}`,
  ),
  shell(
    `docker buildx build --platform linux/arm64 -t ${DOCKER_REGISTRY_HOST}/${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} --push .`,
  ),
]);

// Complete publish workflow
graph
  .job("docker:publish", [log("Docker image published successfully!")])
  .dependsOn(dockerBuildPi);
