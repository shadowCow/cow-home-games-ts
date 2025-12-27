# Project Overview

This is a fullstack TypeScript multiplayer game project using npm workspaces.

## Project Structure

The project uses **npm workspaces** to manage multiple packages in a monorepo.

## Packages

### `@cow-sunday/server`
A multiplayer game server built with Fastify and TypeScript. Runs in Node.js and provides both game API endpoints and serves the client's static assets.

### `@cow-sunday/client`
The game client built with React, TypeScript, and Vite. Compiles to static assets that are served by the game server.

### `@cow-sunday/drover`
A general-purpose build tool for fullstack TypeScript projects. Drover is a DAG-based task runner with a declarative TypeScript DSL.

- **Purpose**: Build orchestration for this project and other TypeScript projects
- **Architecture**: Core tool in `packages/drover` + declarative build file (`drover.ts`) at project root
- **Actions**: Supports `shell`, `log`, `clean`, and `copy` actions
- **Usage**: Users define build graphs in `drover.ts` using action data structures

## Build System

The project uses **drover** for builds. The build configuration is defined declaratively in `drover.ts` at the project root.

## Deployment

The application is deployed using **Docker**:

- Multi-stage Dockerfile builds both client and server
- Client static assets are built with Vite and served by the Fastify server
- Production image runs the Node.js server on port 3000
- `docker-compose.yml` provided for easy deployment
- Server serves both the game client (static files) and API endpoints
