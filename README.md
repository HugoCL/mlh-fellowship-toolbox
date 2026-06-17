# Fellowship Toolbox

Pod leader operations cockpit for the MLH Fellowship. Track peer 1:1s, mentor meetings, demo days, and lightning talks across program cohorts.

## Stack

- Next.js App Router
- shadcn/ui (preset `base-mira`)
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
- `pnpm test:e2e` — Playwright integration tests (Clerk auth + Convex)
- `pnpm test:e2e:ui` — Playwright UI mode
- `pnpm test:all` — Unit tests + E2E
- `pnpm qa:smoke` — Legacy unauthenticated smoke script

## Integration tests (E2E)

Requires `.env.local` with Clerk and Convex keys, plus test users provisioned in your Convex dev deployment:

- `hugo.castro+clerk_test@mlh.io` — platform/cohort admin
- `hugo.castro.fellow-test+clerk_test@mlh.io` — fellow

Clerk test-mode emails accept verification code `424242`.

```bash
pnpm exec playwright install chromium
pnpm convex:dev   # separate terminal
pnpm dev          # separate terminal
pnpm test:e2e
```

Locally, start `pnpm dev` before running E2E (Playwright targets `http://localhost:3000`). In CI it runs `pnpm build && pnpm start` against the Convex deployment URL from secrets.

## CI

Lint, typecheck, unit tests, and E2E run on push and pull requests to `main` via GitHub Actions (see `.github/workflows/ci.yml`).

E2E requires these GitHub secrets: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CONVEX_URL`.

To run the equivalent locally:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

## Features

- Multi-cohort program versions
- Pod leader and fellow roles with server-side permissions
- Peer and pod leader 1:1 tracking
- Mentor meeting rounds with assignment generation
- Demo day scheduling
- Lightning talk enrollment

## Development notes

- Use `pnpm lint:fix` to auto-fix formatting and some lint issues.
- Error and loading boundaries are provided at the root and `(app)` group for better UX.
- E2E tests use `@clerk/testing` with cached auth state for admin and fellow personas.
