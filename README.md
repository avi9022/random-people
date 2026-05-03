# Finq Task

Full-stack monorepo for the Action Item home assignment.

## Stack

- **Monorepo:** pnpm workspaces + turborepo
- **Client:** Vite + React + TypeScript + Tailwind + shadcn/ui
- **Server:** Node + Express + TypeScript
- **Shared:** TypeScript types/schemas consumed as raw source (no build step)

## Layout

```
apps/client    React app (Vite, port 5173)
apps/server    Express API (port 3001)
packages/shared  Shared TS types & schemas
```

## Prerequisites

- Node.js >= 20
- pnpm 10.x (`npm i -g pnpm`)

## Install & run

```bash
pnpm install
pnpm dev          # runs client + server in parallel via turbo
```

- Client: http://localhost:5173
- Server: http://localhost:3001/api/health

## Other scripts

```bash
pnpm build        # builds client + server for prod
pnpm type-check   # tsc --noEmit across all workspaces
pnpm lint         # eslint across all workspaces
```

## Phase 0 sanity check

When you open the client, you should see:
1. A Tailwind-styled heading and a shadcn `<Button>`.
2. The JSON response of `/api/health` proxied through Vite to the server.
3. The `SHARED_PLACEHOLDER` value imported from `@finq/shared`.

If all three render, the scaffold is wired correctly.
