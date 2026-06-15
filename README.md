# Fellowship Toolbox

Pod leader operations cockpit for the MLH Fellowship. Track peer 1:1s, mentor meetings, demo days, and lightning talks across program cohorts.

## Stack

- Next.js App Router
- shadcn/ui (preset `b7l99ROBsm`)
- Convex
- Clerk

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy environment variables:

```bash
cp .env.local.example .env.local
```

3. Add Clerk keys to `.env.local`:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

4. Configure Clerk JWT for Convex:

- Create a JWT template named `convex` in Clerk
- Set `CLERK_JWT_ISSUER_DOMAIN` in the Convex dashboard to your Clerk issuer domain

5. Start development:

```bash
pnpm convex:dev
pnpm dev
```

## Scripts

- `pnpm dev` — Next.js dev server
- `pnpm convex:dev` — Convex dev deployment
- `pnpm typecheck` — TypeScript check
- `pnpm lint` — Biome lint and format check
- `pnpm lint:fix` — Biome auto-fix lint and format issues
- `pnpm format` — Biome format
- `pnpm test` — Vitest unit tests

## Features

- Multi-cohort program versions
- Pod leader and fellow roles with server-side permissions
- Peer and pod leader 1:1 tracking
- Mentor meeting rounds with assignment generation
- Demo day scheduling
- Lightning talk enrollment
