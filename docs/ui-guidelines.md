# UI Guidelines

Authoritative reference for building views in Fellowship Toolbox. Follow these patterns so new pages stay polished, consistent, and easy to assemble.

## Design principles

**Editorial product aesthetic.** Use Instrument Sans (`font-heading`) for headings and Geist (`font-sans`) for body. Establish clear hierarchy: page title → section title → body → caption.

**Restraint.** No decorative gradients, glassmorphism, backdrop-blur as decoration, sparkles, emoji as UI chrome, stock photos, or motivational quotes.

**One card treatment.** Subtle `border border-border bg-card` — not heavy shadows or mixed ring/border styles.

**Semantic tokens only.** Never hard-code `text-amber-600`, `bg-green-500`, etc. Use `success`, `warning`, `info`, `neutral`, `primary`, `destructive`, `muted`.

**Consistent radii.** Cards and panels: `rounded-lg`. Controls (buttons, inputs): `rounded-md`. Chips/badges: `rounded-full`. Avoid arbitrary `rounded-xl` / `rounded-md` mixing on the same surface type.

**Single spacing rhythm.** Page sections: `gap-6`. Within sections: `gap-4`. Tight inline groups: `gap-2`.

**Purposeful states.** Use skeleton helpers and `EmptyState` — not bare "Loading…" paragraphs.

## Typography scale

Defined in `app/globals.css`. Default body is `text-sm` (14px).

| Token | Size | Use |
|-------|------|-----|
| `text-xs` | 12px | Captions, stat labels, metadata |
| `text-sm` | 14px | Primary content, descriptions, table cells |
| `text-base` | 16px | Emphasized body (rare) |
| `text-lg` | 18px | Section headings (`SectionHeader`) |
| `text-xl` | 20px | Sub-page emphasis |
| `text-2xl` | 24px | Page titles (`PageHeader`) |
| `text-3xl` | 30px | Display / hero (rare) |

Headings: `font-heading font-semibold tracking-tight`.

## Color tokens

Core (unchanged): `background`, `foreground`, `card`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`.

Status (new — use for callouts, badges, alerts):

| Token | Tailwind class | Use |
|-------|----------------|-----|
| Success | `text-success`, `bg-success/8`, `border-success/25` | Completed, confirmed |
| Warning | `text-warning`, `bg-warning/10`, `border-warning/30` | Attention needed |
| Info | `text-info`, `bg-info/8`, `border-info/25` | Neutral guidance |
| Neutral | `text-neutral`, `bg-muted/40`, `border-border` | Low-emphasis notes |

Each has a `-foreground` pair for text on solid fills.

## Radius scale

Base `--radius: 0.5rem`. Derived: `rounded-sm`, `rounded-md` (default control), `rounded-lg` (cards/panels), `rounded-xl` (empty states only when dashed).

## Page layout

Use `PageHeader`, `PageBody`, and `PageToolbar` from `components/app/page-frame.tsx`.

```tsx
import { PageBody, PageHeader, PageToolbar } from "@/components/app/page-frame"

<>
  <PageHeader title="Mentors" description="Manage mentor roster." actions={<Button>Add</Button>} />
  <PageBody width="default">
    <PageToolbar title="Filters">{/* inputs */}</PageToolbar>
    {/* content */}
  </PageBody>
</>
```

**`PageBody` width prop:**

| Value | Max width | When |
|-------|-----------|------|
| `narrow` | `max-w-2xl` | Forms, settings, reading-heavy |
| `default` | `max-w-4xl` | Most feature pages |
| `wide` | `max-w-6xl` | Tables, dashboards |
| `full` | none | Full-bleed layouts |

## Shared components

### SectionHeader

Replaces ad-hoc `<h2 className="font-heading text-lg …">` blocks.

```tsx
import { SectionHeader } from "@/components/app/section-header"

<SectionHeader
  title="Open items"
  description="Tasks awaiting action."
  actions={<Button size="sm">Add</Button>}
/>
```

### InfoCallout

Replaces `<Info />` + muted paragraph patterns.

```tsx
import { InfoCallout } from "@/components/app/info-callout"

<InfoCallout variant="info">
  Fellows see only their own 1:1s here.
</InfoCallout>
<InfoCallout variant="warning">Schedule is incomplete.</InfoCallout>
<InfoCallout variant="success">All mentors assigned.</InfoCallout>
<InfoCallout variant="neutral">Optional note.</InfoCallout>
```

### ProgressBar

Replaces inline `style={{ width: \`${percent}%\` }}` progress markup.

```tsx
import { ProgressBar } from "@/components/app/progress-bar"

<ProgressBar value={completed} max={total} aria-label="1:1 progress" />
```

`ProgressStat` in `lib/status.tsx` wraps label + fraction + bar for completion metrics.

### Stat / StatStrip / StatGroup

Dashboard at-a-glance numbers.

```tsx
import { Stat, StatGroup, StatStrip } from "@/components/app/stat"

<StatStrip>
  <Stat label="Fellows" value={12} />
  <Stat label="Mentors" value={4} />
</StatStrip>

<StatGroup columns={3}>
  <Stat label="Completed" value="8/12" detail="1:1s" />
</StatGroup>
```

### PageSkeleton helpers

Content-shaped loading — not blank screens.

```tsx
import {
  PageSkeleton,
  SkeletonCardGrid,
  SkeletonList,
  SkeletonTable,
} from "@/components/app/page-skeleton"

if (data === undefined) {
  return <PageSkeleton title="Directory" width="wide" />
}

// Or compose:
<PageBody>
  <SkeletonCardGrid count={6} columns={3} />
  <SkeletonTable rows={5} columns={4} />
</PageBody>
```

### EmptyState

```tsx
import { EmptyState } from "@/components/app/empty-state"

<EmptyState
  title="No talks scheduled"
  description="Generate weeks or add a slot manually."
  action={<Button>Generate all weeks</Button>}
/>
```

## Surface rules

| Surface | Classes |
|---------|---------|
| Card | `rounded-lg border border-border bg-card` (use `<Card>`) |
| Toolbar / filter bar | `PageToolbar` or `rounded-lg border border-border bg-card p-4` |
| Inline setup section | `rounded-lg border border-border bg-card p-4` |
| Action-required setup | `border-primary/30 bg-primary/5` + `InfoCallout` |
| Muted callout | `InfoCallout` with appropriate variant |

Prefer borders over shadows. Do not combine `ring-1` and `border` on the same element.

## Base UI (shadcn) notes

- Primitives from `@base-ui/react` — use `render` prop, never `asChild`.
- Links as buttons: `<Button render={<Link href="…" />} nativeButton={false}>`.
- `DropdownMenuLabel` must be inside `DropdownMenuGroup` or `DropdownMenuRadioGroup`.
- Select `onValueChange` can be `null` — guard before updating state.

## Non-AI do / don't

**Do**

- Use shared layout and section components.
- Keep subtitles short and plain.
- Use semantic status tokens for state color.
- Show skeletons while Convex queries load (`undefined`).
- Use ET for all program dates/times.

**Don't**

- Hard-code Tailwind color names (`amber`, `green`, `blue-500`).
- Mix arbitrary border radii on similar surfaces.
- Add backdrop-blur, gradients, or decorative animation.
- Use emoji or sparkle icons for empty states.
- Build one-off progress bars or info rows when shared components exist.
- Use `text-xs` for primary readable content.

## File map

| Need | Import from |
|------|-------------|
| Page shell | `@/components/app/page-frame` |
| Section title | `@/components/app/section-header` |
| Info / warning note | `@/components/app/info-callout` |
| Progress | `@/components/app/progress-bar` or `@/lib/status` |
| Dashboard stats | `@/components/app/stat` |
| Loading | `@/components/app/page-skeleton` |
| Empty | `@/components/app/empty-state` |
| Status badge / label | `@/lib/status` |
| Tokens | `app/globals.css` |
