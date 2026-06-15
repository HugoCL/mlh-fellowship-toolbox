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
