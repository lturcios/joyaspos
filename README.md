# JoyasPOS v2.0

POS monorepo with three workspaces:

- `apps/api` — Fastify 4 + Prisma + MySQL
- `apps/web` — React 18 + TypeScript + Vite
- `apps/mobile` — Android / Kotlin (Gradle, not a pnpm workspace)
- `packages/shared-types` — Shared TypeScript contracts between API and Web

## Setup

```bash
pnpm install
```

## Common commands

```bash
pnpm dev:api          # Run the API in dev mode
pnpm dev:web          # Run the Web panel in dev mode
pnpm turbo build      # Build all TS workspaces
pnpm ls -r --depth 0  # List workspaces
```

See `ROADMAP.md` for the phased execution plan and `CLAUDE.md` for governance rules.
