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
- Week-based scheduling (mentor rounds, lightning talks, demo days) should offer bulk "Generate All Weeks" from cohort dates while keeping manual add plus per-slot edit/delete.

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
- Program weeks are derived from cohort `startDate`/`endDate` via `getProgramWeeks` in `convex/lib/programWeeks.ts` (re-exported from `lib/programWeeks.ts` for tests).
