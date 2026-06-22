<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Base UI (shadcn)

This project uses **shadcn/ui with the `base-mira` preset** (`components.json`). Primitives come from **`@base-ui/react`**, not Radix. Do not copy Radix/shadcn-Radix snippets without adapting them.

### Not Radix — common mistakes

- **Do not use `asChild`.** Base UI uses a **`render`** prop instead.
- **Do not assume Radix part names.** Example: Select uses `Popup`/`Positioner`/`List` under the hood; our wrappers live in `components/ui/`.
- **Do not paste old shadcn docs** that import `@radix-ui/*` or wrap with `<Slot>`.

### Composition: use `render`, not `asChild`

Merge props onto a custom element with `render`:

```tsx
// Link as button
<Button render={<Link href="/cohorts" />} nativeButton={false}>
  Create Cohort
</Button>

// Sidebar nav
<SidebarMenuButton render={<Link href={item.href} />} isActive={isActive}>
  <Icon />
  <span>{item.label}</span>
</SidebarMenuButton>

// Dropdown trigger styled as Button — put content on Trigger, not inside render element
<DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
  Menu label
</DropdownMenuTrigger>

// Menu item as link
<DropdownMenuItem render={<Link href="/cohorts" />}>
  Manage cohorts
</DropdownMenuItem>
```

Applies to `Button`, `SidebarMenuButton`, `DropdownMenuTrigger`, `DropdownMenuItem`, `DialogClose`, `AlertDialogAction`, etc.

### `nativeButton` when rendering links

Base UI warns (and breaks a11y) if a button component uses `render={<Link />}` while `nativeButton` defaults to `true`:

> A component that acts as a button expected a native `<button>` … Use a real `<button>` in the `render` prop, or set `nativeButton` to `false`.

**Fix:** add `nativeButton={false}` on any `Button` (or trigger) whose `render` is `<Link>` or another non-`<button>` element. Seen in `CohortSwitcher`, `dashboard-client`, and sidebar links.

### Menu / dropdown structure

Base UI requires group context for labels. **`DropdownMenuLabel` must be inside `DropdownMenuGroup` or `DropdownMenuRadioGroup`** — not a bare sibling above them.

Runtime error if wrong:

> MenuGroupContext is missing. Menu group parts must be used within `<Menu.Group>` or `<Menu.RadioGroup>`.

```tsx
// Good
<DropdownMenuContent>
  <DropdownMenuGroup>
    <DropdownMenuLabel>Theme</DropdownMenuLabel>
  </DropdownMenuGroup>
  <DropdownMenuSeparator />
  <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
    …
  </DropdownMenuRadioGroup>
</DropdownMenuContent>

// Also good: label inside the radio group
<DropdownMenuRadioGroup …>
  <DropdownMenuLabel>Theme</DropdownMenuLabel>
  …
</DropdownMenuRadioGroup>
```

### Select: `onValueChange` can be `null`

Base UI Select passes **`string | null`** to `onValueChange` (e.g. clearing selection). Guard before updating state:

```tsx
<Select
  value={selected}
  onValueChange={(value) => {
    if (value) setSelected(value)
  }}
>
```

Pattern used in cohort feature pages (`lightning-talks`, `demo-days`, etc.).

### Where to look before editing UI

- Preset: `components.json` (`"style": "base-mira"`)
- Wrappers: `components/ui/*.tsx` (imports from `@base-ui/react/...`)
- Working examples: `components/app/app-shell.tsx`, `components/app/cohort-switcher.tsx`, `components/app/theme-selector.tsx`

When adding shadcn components, use the **Base UI** registry/preset for this repo, not the default Radix one.

## Learned User Preferences

- Prefer short, plain page header subtitles; avoid permission-heavy explanatory copy.
- User-facing scheduling copy should be vendor-neutral (e.g. "scheduling link"); the URL field and link behavior matter more than the provider name.
- Dashboards should be role-aware: fellows see action items and personal next steps; pod leaders and admins see at-a-glance operational signals, not bare 0/0 stat grids.
- Lightning Talks should list only fellows who have registered, not every pod fellow with empty placeholder rows.
- People/Directory should use a card layout with Clerk avatars (initials fallback), not a table.
- Use Biome for lint/format (`pnpm lint`); do not add ESLint to this project.
- Exclude `components/ui` from Biome checks (generated shadcn wrappers).
- Week-based scheduling (mentor rounds, lightning talks, demo days) should offer bulk "Generate All Weeks" from cohort dates while keeping manual add plus per-slot edit/delete; lightning talks and demo days should prompt pod leaders for weekday (and start date for demo days) before autogenerating; mentor rounds should spread each fellow×mentor pair across program weeks (once with each mentor before end, not clustered in early weeks).
- Retro/standup Notes Viewer should stay client-only (paste LMS JSON, no Convex persistence), with a fullscreen Meet-friendly presenter UI including shuffle and navigation controls.
- Mentors usually do not sign in; pod leaders and admins manage mentor Discord handles and scheduling links.
- Always account for timezones when inputting and displaying times; Eastern Time (ET) is the program standard.
- Prefer per-feature bulk actions over combined cross-feature admin buttons.

## Learned Workspace Facts

- Stack: Next.js App Router, Convex backend, Clerk auth, Base UI shadcn (`base-mira` preset).
- Program codes follow `YY.SEASON.LETTER(optional).POD`; URL slugs hyphenate dots (`/cohorts/26-SUM-B-5`), not nested `/pods/{n}/` paths. Helpers live in `lib/cohort-routes.ts` and `convex/lib/programCode.ts`.
- Fellows, mentors, and pod roster data belong to pod cohorts (e.g. `26.SUM.B.5.1`), not umbrella cohort rows.
- Base UI `DropdownMenuItem` handlers use `onClick`, not Radix-style `onSelect`.
- Base UI `SelectValue` needs explicit label children (e.g. `getStatusLabel` from `lib/status.ts`); raw enum keys display verbatim otherwise.
- Impersonation ("View as fellow"): gate UI on effective fellow role, hide leader-only actions, and skip leader-only Convex queries (e.g. `listGroupsForParent`) while impersonating.
- Feature pages (Mentors, Directory, etc.) use role-based views: simplified personal UI for fellows, full management UI for pod leaders and admins.
- Dev seed: `pnpm seed:pod` runs `convex/seed.ts` to idempotently add fellows, mentors, 1:1 matrices, and mentor assignments to a pod.
- App access is invite-gated: the first user becomes platform admin (`isPlatformAdmin`); later users need a pending invite or cohort membership or see the not-invited screen (`convex/lib/appAccess.ts`, `NotInvitedScreen`).
- Program weeks are derived from cohort `startDate`/`endDate` via `getProgramWeeks` in `convex/lib/programWeeks.ts` (re-exported from `lib/programWeeks.ts` for tests); mentor week slots display a week start–end range, not a single day. Program timezone is `America/New_York` (ET); date/time helpers live in `convex/lib/dates.ts` and use `@internationalized/date`.
- Demo days use one date per demo (no spreading across weekdays). Auto-generate assigns one fellow per program week first; when fellows exceed weeks, overflow fellows share an already-assigned date (multiple demos same day) or leaders assign dates manually.
- Notes Viewer (`notes-viewer`) is pod-leader-only and lives in the pod leader sidebar section (with Pod Settings); it parses pasted LMS retro/standup JSON in-browser via `lib/lms-notes-viewer.ts`.

## Cursor Cloud specific instructions

Environment is pre-provisioned. The startup update script runs `pnpm install`. Required secrets are injected as env vars (and present in the Convex deployment): `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CONVEX_DEPLOYMENT`, `CONVEX_DEPLOY_KEY`, `NEXT_PUBLIC_CONVEX_URL`, plus Clerk URL vars. The Convex dev deployment already has `CLERK_JWT_ISSUER_DOMAIN` and VAPID keys set, so auth and push work out of the box.

- **`.env.local` is required for tmux/background processes.** Injected secrets live in the agent's interactive shell but are NOT inherited by fresh tmux/login shells, so `convex dev` will fall back to an interactive login prompt and Clerk keys won't reach `next dev`. Write the injected secrets to `.env.local` (gitignored) once so both the Convex CLI and Next.js read them from disk: `CONVEX_DEPLOYMENT`, `CONVEX_DEPLOY_KEY`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`, and the `*CLERK*` vars. Running `npx convex dev --once` also auto-writes the Convex URLs into `.env.local`.
- **Run services** (each in its own tmux session): `npx convex dev` (backend watcher; functions push to the shared `hugo-castro:fellowship-toolbox:dev` deployment) and `pnpm dev` (Next.js on http://localhost:3000). `/` 404s for guests by design — the root redirects to sign-in, and authenticated users land on a dashboard; app pages live under the `(app)` route group.
- **Login / E2E test users** (Clerk test mode, verification code `424242`): `hugo.castro+clerk_test@mlh.io` (platform admin) and `hugo.castro.fellow-test+clerk_test@mlh.io` (fellow). The UI sign-in flow is: enter email → Continue → "Use another method" → "Email code" → enter `424242`.
- **E2E (`pnpm test:e2e`)** targets the already-running `pnpm dev` locally (no webServer unless `CI=true`). Install the browser first: `pnpm exec playwright install --with-deps chromium`. The Playwright browser cache is not part of the standard dependency refresh, so re-run that install in a fresh VM before E2E.
- `pnpm lint` (Biome) currently reports one pre-existing formatting error in `app/(app)/cohorts/[cohortCode]/demo-days/page.tsx` on `main`; `pnpm lint:fix` would resolve it.
