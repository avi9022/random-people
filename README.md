# Random People

Full-stack take-home for the Action Item assignment. Browse 10 random users from [randomuser.me](https://randomuser.me), save profiles to a SQLite DB, edit names, delete, list. Plus a built-in **AI assistant** (Claude Haiku 4.5) with **generative UI** that answers questions about the saved profiles by rendering rich React components inline. React + Node monorepo, deployed to AWS via GitHub Actions.

**Live:** http://54.173.160.229/
**Repo:** https://github.com/avi9022/random-people

## Stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces + turborepo |
| Frontend | Vite + React 18 + TypeScript |
| Routing | react-router-dom v7 |
| Server state | @tanstack/react-query |
| HTTP client | axios |
| Styling | Tailwind + shadcn/ui |
| Markdown | react-markdown + remark-gfm |
| Backend | Node 20 + Express + TypeScript + helmet |
| Database | SQLite via better-sqlite3 |
| Validation | zod (shared between client and server) |
| AI | @anthropic-ai/sdk with the beta tool runner (Claude Haiku 4.5) |
| Hosting | EC2 (Ubuntu 22.04) + nginx + systemd |
| CI/CD | GitHub Actions |

## Local development

### Prerequisites
- Node 20+
- pnpm 10 (`npm i -g pnpm` or via [corepack](https://nodejs.org/api/corepack.html))
- (Optional) `apps/server/.env` with `ANTHROPIC_API_KEY=sk-ant-...` to enable the chat assistant. Everything else works without it; the chat endpoint just returns a friendly 500 with a clear message until a key is set.

### Install and run

```bash
pnpm install
pnpm dev          # client on :5173, server on :3001 (turbo runs both)
```

Vite proxies `/api/*` to the server in dev, so the client uses the same relative URLs in dev and prod.

### Other scripts

```bash
pnpm build        # builds shared, server, and client (turbo respects deps)
pnpm type-check   # tsc across all workspaces
pnpm lint         # eslint across all workspaces
```

## Project structure

```
apps/
  client/                       Vite + React SPA
    src/
      routes/                   Home / RandomUsers / SavedProfiles / Profile
      components/
        chat/                   ChatWidget + generative-UI components
      hooks/                    useRandomUsers / useSavedProfiles / useChatStream
      lib/api/                  axios clients (randomUsers, profiles, chat)
  server/                       Express API
    src/
      routes/                   profiles.ts (CRUD), chat.ts (SSE + tools)
      db.ts                     better-sqlite3 DAO
packages/
  shared/                       zod schemas + types, consumed by both apps
scripts/                        EC2 bootstrap (systemd unit, nginx site, setup-server.sh)
.github/workflows/              deploy.yml — push to main triggers a deploy
```

`packages/shared` is the single source of truth for the `Profile` shape and the chat wire-format. The client uses it for types; the server uses it to validate request bodies. Build emits to `dist/` so the production server can run under plain `node`.

## API

Base URL: `/api`

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/health` | — | `{ ok: true }` |
| GET | `/profiles` | — | `Profile[]` |
| GET | `/profiles/:uuid` | — | `Profile` or `404` |
| POST | `/profiles` | `Profile` | `201 Profile` / `400` invalid / `409` duplicate |
| PUT | `/profiles/:uuid` | `Profile` | `200 Profile` / `400` / `404` |
| DELETE | `/profiles/:uuid` | — | `204` / `404` |
| POST | `/chat` | `{ messages: ChatMessage[] }` | SSE stream of `delta` / `ui` / `done` / `error` events |

Validation: every POST/PUT/`/chat` body is parsed with the shared zod schemas at the boundary. Chat requests are capped at 50 messages of up to 8000 chars each so a malformed/abusive client can't trigger unbounded Anthropic API spend per request.

## AI assistant

The chat widget is a floating popup mounted in `App.tsx` outside the routes, so its message history persists across navigation. The server endpoint `/api/chat` runs the Anthropic SDK's beta tool runner with five tools:

| Tool | Purpose |
|---|---|
| `list_saved_profiles` | Read tool — returns full data for every saved profile |
| `get_profile_by_uuid` | Read tool — single profile lookup |
| `render_profile_card` | UI tool — emits an SSE event so the client renders a `<ProfileCard>` |
| `render_profile_grid` | UI tool — emits an SSE event for `<ProfileGrid>` |
| `render_stats_breakdown` | UI tool — computes a distribution and emits for `<StatsBreakdown>` |

The protocol over the wire is plain SSE with three event kinds:

```json
{"type":"delta","text":"..."}
{"type":"ui","id":"...","component":"ProfileCard","props":{...}}
{"type":"done"}
```

The render tools' `run()` functions emit a `ui` event via the SSE stream, then return a short status string to the model. The model can interleave text and UI in a single response. The client's chat hook tracks an ordered array of `parts` per assistant message — text or ui — and renders them in arrival order.

The Anthropic call is wired to an `AbortController` triggered on `req.on("close")`, so closing the chat widget mid-response stops the (paid) API call rather than burning tokens for an audience of zero.

## Deployment

`main` → GitHub Actions → EC2.

The workflow at `.github/workflows/deploy.yml`:
1. installs, type-checks, builds
2. tars the deploy artifact (compiled JS + client `dist/` + workspace `package.json` files)
3. `scp`s it to the EC2 instance
4. `ssh`s in, extracts, runs `pnpm install --prod`, restarts the systemd service
5. `curl`s `/api/health` until it answers 200

### One-time EC2 bootstrap

`scripts/setup-server.sh` is the bootstrap script for a fresh Ubuntu 22.04 EC2. It installs Node, pnpm, nginx, the systemd unit (`finq-server.service`), and the nginx site config. Run it once on the box; the deploy workflow handles everything after that.

### Required GitHub secrets

| Secret | Value |
|---|---|
| `EC2_HOST` | Elastic IP of the instance |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | private key contents (the `.pem` you downloaded from AWS) |

### Server-side secrets

`ANTHROPIC_API_KEY` lives in `/opt/finq/apps/server/.env` on the EC2 (mode `0600`, owned by `ubuntu`). The deploy tarball doesn't include `.env`, so it survives across deploys. To rotate: SSH in, edit the file, `sudo systemctl restart finq-server`. For a fully-CI-driven approach you'd promote it to a GitHub secret + workflow step that writes the file on each deploy — left out of scope here.

### Architecture on the box

```
EC2 (Ubuntu, t3.micro, Elastic IP)
├── /opt/finq/apps/client/dist/    static SPA, served by nginx
├── /opt/finq/apps/server/dist/    compiled JS, run by node + systemd
├── /opt/finq/apps/server/.env     ANTHROPIC_API_KEY (mode 0600)
└── /opt/finq/data/profiles.db     SQLite, survives deploys

nginx :80
  ├── /api/*       → 127.0.0.1:3001 (Express)
  ├── /assets/*    → static, 1-year cache (Vite hashes filenames)
  └── otherwise    → /opt/finq/apps/client/dist/index.html (SPA fallback)
```

## Library choices and rationale

### pnpm workspaces + turborepo
Monorepo so the `Profile` schema lives in one place and is consumed by client and server. pnpm because it's the fastest and most disk-efficient. Turborepo because its `dependsOn: ["^build"]` makes "build shared first, then the consumers" automatic across `dev`, `build`, and `type-check`.

### Vite
Faster HMR than CRA, native ESM, no eject. The official path for new React projects. shadcn/ui's defaults assume Vite + path aliases.

### react-router-dom v7
Standard SPA routing. The `<Link state={{ from }}>` mechanism lets the Profile detail know which list to return to without coupling the URL to navigation context (early on I had `?source=random|saved` and removed it — see "Architecture decisions" below).

### @tanstack/react-query
The assignment lists "Redux, MobX, Apollo Client etc." — note that **Apollo Client is itself a server-state cache**, so react-query falls into the same category. All persistent data in this app comes from the server (random-users list, saved-profiles list); local UI state is filter inputs and the editable name, both of which are pure `useState`. Redux/MobX would be ceremony around fetch/loading/error states that react-query already handles. The `setQueryData` + `useQuery` combo also gives us the "modified in Screen 1 list" behavior the spec asks for, without inventing a separate state container.

### axios
Tiny but ergonomic — base URL, interceptors, JSON-by-default, automatic timeouts, and `axios.isAxiosError(err)` for typed error handling (used in `lib/errors.ts` to surface server-side `{error: "..."}` bodies on 400/404/409 responses). `fetch` would have required a fair amount of wrapping to match.

### Tailwind + shadcn/ui
shadcn isn't a component library — it copies components into your repo, so there's no runtime dependency, no version drift, and you can fork any component freely. Tailwind because it pairs with shadcn out of the box and avoids both the CSS-modules naming dance and the runtime cost of CSS-in-JS.

### react-markdown + remark-gfm
The assistant outputs markdown (lists, bold, code, tables); rendering it as plain text would look amateur. `react-markdown` parses safely (no raw HTML injection) and `remark-gfm` adds GitHub-flavored extensions (tables, strikethrough, autolinks). A small `<MarkdownText>` wrapper passes per-element overrides so margins fit a chat bubble instead of a blog post.

### Express + helmet
Smallest possible Node web framework with mature TS types. The API surface is six routes; reaching for Fastify or Nest would be over-spec. `helmet` is registered as the first middleware to set the standard security headers (CSP, HSTS, X-Content-Type-Options, etc.) — cheap default protection a senior reviewer expects.

### better-sqlite3
Synchronous, native bindings, very fast. For a single-process server doing 5 routes, a full ORM (Prisma, Drizzle) is more setup and runtime overhead than the value it returns. Raw prepared statements with a thin DAO layer is ~30 lines and reads the same as TypeScript with stronger typing. Each row's JSON blob is parsed with `profileSchema.safeParse(...)` on read — schema drift is caught at the boundary, not propagated to clients.

### zod (in `packages/shared`)
One schema, two consumers. The server uses `profileSchema.safeParse(req.body)` for runtime validation at the API boundary. The client uses `z.infer<typeof profileSchema>` for the TypeScript type. Changing the shape in one file updates both ends. The same package also defines `chatRequestSchema` with explicit caps on message count and content length to bound per-request Anthropic API cost.

### @anthropic-ai/sdk (Claude Haiku 4.5)
The official SDK is the right call — it's first-party, typed, and handles streaming + tool-use natively via `client.beta.messages.toolRunner({...})`. We define tools with `betaZodTool` so the input schemas are type-safe Zod definitions, and the SDK runs the agent loop (model → tool call → tool result → next turn) without us hand-writing it. Haiku 4.5 over Opus or Sonnet because the use case is Q&A over a small dataset, not deep reasoning — Haiku is ~5× cheaper and noticeably faster.

## Cut corners (and what I'd do in production)

| Corner | What's there now | Production fix |
|---|---|---|
| **Tests** | None | Vitest for client (component + integration with MSW), supertest for server. Would write coverage for the cache-consistency logic in `Profile.tsx` first — that's where bugs hid the most. |
| **Auth** | None — the spec says no auth needed | Sessions via httpOnly cookies, CSRF tokens for mutations, OAuth/Google for sign-in. Profiles would scope by user. |
| **HTTPS** | The deployed site is HTTP only | Let's Encrypt + certbot on the EC2, or terminate TLS at CloudFront in front of the EC2. Also forces HSTS. |
| **DB** | SQLite on the EC2's EBS volume | Postgres on RDS (or DynamoDB if going serverless). SQLite is fine for one node; the moment you want HA or read replicas, it's not. |
| **Optimistic updates** | The Save/Update/Delete mutations patch the react-query cache on success only. There's no rollback on failure | Use react-query's `onMutate` + `onError` pattern to snapshot the cache before, write optimistically, and rollback on error. |
| **Rate limiting** | None | `express-rate-limit` on the public endpoints (especially `/api/chat`, which hits a paid provider), plus a CDN with WAF. |
| **Logs** | `console.log`, captured by journald via systemd | Structured logs (pino), shipped to CloudWatch or Loki. Add request IDs and trace propagation. |
| **Observability** | None | OpenTelemetry → traces in Tempo/X-Ray, metrics in Prometheus/CloudWatch. |
| **Container** | None — the deploy syncs files to the box | Dockerfile + push to ECR + ECS Fargate. Faster, immutable deploys, easier rollbacks. |
| **Secret management** | `ANTHROPIC_API_KEY` lives in a `.env` on the EC2 (mode 0600, never in git, never in the deploy tarball) | AWS Secrets Manager or SSM Parameter Store via instance role; rotate on a schedule. For this scope a manual `.env` is the smallest defensible setup. |
| **Random profile that's also saved** | Heuristic: rely on the `saved-profiles` list cache to disambiguate; fetched once per session | Add a `saved` boolean to each profile in the random list response, computed server-side via a single batch lookup. |
| **SSH on port 22** | Open to `0.0.0.0/0` so GH Actions can deploy | AWS Systems Manager Session Manager (no inbound SSH at all), or OIDC + GitHub Actions deploying via AWS APIs. |

## Architecture decisions worth calling out

- **`isSaved` is derived from data, not URL state.** Earlier I had `?source=random\|saved` query params on the profile route. They lied: a profile *can* be both in the random cache and saved, and the URL only knew where the user *clicked from*. Now the saved-profiles list cache is the source of truth. The `?source` param is gone.
- **Saved-profiles list is fetched lazily on first profile detail load.** I avoided fetching eagerly on `/random`: a user who only browses doesn't need to know what's saved. The single fetch happens on Profile mount and is reused across `/saved` and every subsequent profile view.
- **All three profile mutations sync both caches.** Save/Update on a profile that's also in the random-users cache patches both, so navigating back to `/random` shows the new name. Delete only patches the saved list (the random list is conceptually a transient view, not "things in the DB").
- **Server's POST is race-safe via `INSERT` + `SQLITE_CONSTRAINT*` catch.** A naive `if (exists) reject; else insert` can produce duplicate inserts under concurrent requests; the constraint catch is the only correct pattern.
- **Back navigation uses `<Link state={{ from }}>`, not `navigate(-1)`.** `window.history.length` counts the whole tab's history globally, so Back from a deep-linked profile page would have escaped the SPA back to whatever Google result the user came from.
- **`navigate("/saved", { replace: true })` after Save/Delete.** Otherwise Back from `/saved` returns to the just-mutated `/profile/:uuid` (showing Save when it's now saved, or 404 after delete).
- **Generative UI is server-side data + server-emitted directives.** The render tools' `run()` functions look up data from the DB and emit a typed SSE event over the same stream that's already carrying text deltas. The client never sees a tool call — only `delta` / `ui` / `done` events. This keeps the DB safely on the server and the wire protocol minimal.
- **Anthropic call is abortable on client disconnect.** `req.on("close")` triggers `controller.abort()` → SDK aborts the upstream call. Closing the chat widget mid-response stops paying for tokens.
- **Anthropic client is module-scoped, not per-request.** A memoized lazy getter avoids reconstructing the SDK + HTTP agent on every chat call.
