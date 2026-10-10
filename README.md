# Fellowship Toolbox

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Demo](https://img.shields.io/badge/demo-vercel-black)](https://mlh-fellowship-toolbox-kappa.vercel.app)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Convex](https://img.shields.io/badge/backend-Convex-orange)

Operations cockpit for pod leaders of the MLH Fellowship. It tracks peer 1:1s, mentor meetings, demo days, lightning talks, and action items across program cohorts.

Built by [Hugo Castro](https://github.com/HugoCL) for use in the MLH Fellowship. This is an independent project and **not an official product of Major League Hacking**.

Demo: https://mlh-fellowship-toolbox-kappa.vercel.app (sign-in required; access is invite-only).

## Features

- Multi-cohort program versions, with pods inside each cohort.
- Pod leader and fellow roles, enforced server-side in Convex.
- Invite-gated access: the first user becomes platform admin; later users need a pending invite or cohort membership.
- Peer and pod leader 1:1 tracking, with status per pair or round.
- Mentor meeting rounds with automatic assignment generation and week slots derived from the cohort dates.
- Demo day scheduling, with auto-generate or manual assignment per fellow.
- Lightning talk slots and enrollment.
- Action items per cohort, with completion tracking.
- Pod notifications with browser push (Web Push / VAPID) and recurring schedules.
- Directory and mentor schedule that can be shared through public, tokenized links (`/share/...`).
- Progress report, attendance report, and Notes Viewer: parse CSV/JSON exported from the MLH LMS in the browser.
- Impersonation ("View as fellow") for pod leaders.
- Program times are shown in `America/New_York` (ET).

## Stack

- [Next.js](https://nextjs.org) App Router (React 19), TypeScript
- [Convex](https://convex.dev) for database, server functions, and cron jobs
- [Clerk](https://clerk.com) for authentication (identity only; membership lives in Convex)
- shadcn/ui and Base UI, Tailwind CSS 4
- Vitest for unit tests, Playwright (with `@clerk/testing`) for end-to-end tests, Biome for lint and format
- Deployed on Vercel

## Project layout

| Path | What lives there |
| --- | --- |
| `app/` | Routes. `(app)/` is the authenticated area (dashboard, cohorts, `me`); `share/` is public; `invite/`, `sign-in/`, `sign-up/` |
| `components/` | UI. `app/` has feature components, `ui/` the shadcn primitives |
| `convex/` | Schema, queries, mutations, crons, seed script. Access rules in `convex/lib/` |
| `lib/` | Shared helpers and their unit tests (dates, assignments, LMS parsers, share links) |
| `e2e/` | Playwright tests |
| `docs/superpowers/specs/` | Original design spec |

## Run locally

Requirements: Node.js 20+, [pnpm](https://pnpm.io), a free [Convex](https://convex.dev) account, and a [Clerk](https://clerk.com) application.

1. Install dependencies:

```bash
pnpm install
```

2. Create `.env.local` with the variables below.

3. In Clerk, create a JWT template named `convex`. In the Convex dashboard, set `CLERK_JWT_ISSUER_DOMAIN` to your Clerk issuer domain.

4. Start the backend and the app in two terminals:

```bash
pnpm convex:dev
pnpm dev
```

The first user to sign in becomes platform admin. Optionally run `pnpm seed:pod` to add sample fellows, mentors, 1:1 matrices, and mentor assignments to a pod.

### Environment variables

| Variable | Where | Purpose | Required |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env.local` | Clerk publishable key | Yes |
| `CLERK_SECRET_KEY` | `.env.local` | Clerk secret key | Yes |
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` | Convex deployment URL (written by `convex dev`) | Yes |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex dashboard | Clerk issuer domain, used to validate JWTs | Yes |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `.env.local` | VAPID public key for browser push | For push |
| `VAPID_PUBLIC_KEY` | Convex dashboard | VAPID public key | For push |
| `VAPID_PRIVATE_KEY` | Convex dashboard | VAPID private key | For push |
| `VAPID_SUBJECT` | Convex dashboard | Contact URI, e.g. `mailto:you@example.com` | For push |
| `UNSPLASH_ACCESS_KEY` | `.env.local` | Background photo on the sign-in screen | No |

Generate VAPID keys with:

```bash
pnpm dlx web-push generate-vapid-keys
```

Fellows opt in to push from the pod **Notifications** page. Pod leaders send one-off or recurring notifications from the same page.

### Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Next.js dev server |
| `pnpm convex:dev` | Convex dev deployment and function watcher |
| `pnpm convex:deploy` | Deploy Convex functions |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` / `pnpm lint:fix` | Biome check / auto-fix |
| `pnpm format` | Biome format |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright tests (Clerk auth + Convex) |
| `pnpm test:all` | Unit tests, then E2E |
| `pnpm seed:pod` | Seed a pod with sample data |

## End-to-end tests

E2E tests need `.env.local` with the Clerk and Convex keys, plus two Clerk test-mode users provisioned in your Convex dev deployment: a platform/cohort admin and a fellow. Set their emails in:

- `E2E_CLERK_ADMIN_EMAIL` (for example `admin+clerk_test@example.com`)
- `E2E_CLERK_FELLOW_EMAIL` (for example `fellow+clerk_test@example.com`)

Clerk test-mode emails (those containing `+clerk_test`) accept the verification code `424242`.

```bash
pnpm exec playwright install chromium
pnpm convex:dev   # separate terminal
pnpm dev          # separate terminal
pnpm test:e2e
```

Locally, Playwright targets `http://localhost:3000`, so start `pnpm dev` first. In CI it runs `pnpm build && pnpm start`.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, and E2E on pushes and pull requests to `main`. E2E needs these repository secrets: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CONVEX_URL`. It also needs these repository variables: `E2E_CLERK_ADMIN_EMAIL`, `E2E_CLERK_FELLOW_EMAIL`.

## Deploy

The demo runs on Vercel, with Convex hosting the backend. Set the Clerk and Convex variables from the table above in the Vercel project, run `pnpm convex:deploy` for the backend, and deploy the Next.js app as usual.

## Development notes

- Base UI `SelectValue` needs explicit label children (for example `getStatusLabel` from `lib/status.ts`); raw enum keys display verbatim otherwise.
- While impersonating a fellow, gate UI on the effective role and skip leader-only Convex queries.
- Program weeks come from the cohort `startDate`/`endDate` (`convex/lib/programWeeks.ts`). Date helpers are in `convex/lib/dates.ts`.
- More conventions for contributors and coding agents are in [AGENTS.md](AGENTS.md).

## License

Code under the MIT license. Use it however you like, keeping the copyright notice. See [LICENSE](LICENSE).

## Author

Hugo Castro: [github.com/HugoCL](https://github.com/HugoCL) · [hugocastro.dev](https://hugocastro.dev)
