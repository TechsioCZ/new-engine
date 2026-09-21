---
name: sidebar-usage
description: >-
  Use after component-usage-ux when an app needs responsive start/end
  navigation, icon collapse, two-pane navigation, or a sticky-header shell.
type: core
component: Sidebar
component_version: "1.0.0"
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - drawer-usage
  - app-token-overrides
sources:
  - libs/ui/src/organisms/sidebar.tsx
  - libs/ui/src/internal/organisms/sidebar.context.tsx
  - libs/ui/src/internal/organisms/sidebar.focus.ts
  - libs/ui/src/internal/organisms/sidebar.styles.ts
  - libs/ui/src/tokens/components/organisms/_sidebar.css
  - libs/ui/stories/organisms/sidebar.stories.tsx
---

# Sidebar Usage

Use `Sidebar` for application navigation that must change between persistent
desktop panels and modal mobile navigation. Its sides are logical: `start` and
`end` follow `dir`, so consumers do not need separate RTL layouts.

## Import

```tsx
import { Sidebar } from "@techsio/ui-kit/organisms/sidebar"
```

## State contract

Desktop expansion and mobile disclosure are separate state channels.

Use the uncontrolled props when the shell owns no durable navigation state:

```tsx
<Sidebar defaultExpanded={["start"]} defaultMobileOpen={null}>
  {/* panels and inset */}
</Sidebar>
```

Use the controlled props when a router, preference store, or shell coordinator
owns the state:

```tsx
const [expanded, setExpanded] = useState<readonly ("start" | "end")[]>([
  "start",
])
const [mobileOpen, setMobileOpen] = useState<"start" | "end" | null>(null)

<Sidebar
  expanded={expanded}
  mobileOpen={mobileOpen}
  onExpandedChange={({ expanded: next }) => setExpanded(next)}
  onMobileOpenChange={({ open }) => setMobileOpen(open)}
>
  {/* panels and inset */}
</Sidebar>
```

- `defaultExpanded` and `defaultMobileOpen` are initial values only.
- `undefined` selects uncontrolled mobile state; `mobileOpen={null}` is a
  controlled, closed Sidebar and never falls back to `defaultMobileOpen`.
- `expanded` requires `onExpandedChange`; `mobileOpen` requires
  `onMobileOpenChange` for an interactive controlled shell.
- Do not switch either channel between controlled and uncontrolled after mount.
- At most one mobile side is open. Opening one side closes the other.
- `Sidebar.Context` exposes `toggle`, `setExpanded`, `openMobile`, and
  `closeMobile` for navigation items that coordinate with the shell.

## Basic composition

Every panel needs an accessible name. Put the application content in
`Sidebar.Inset`; do not reproduce panel widths or breakpoint behavior in the
app.

```tsx
<Sidebar
  collapsible={{ start: "icon" }}
  defaultExpanded={["start"]}
>
  <Sidebar.Panel
    aria-label="Primary navigation"
    side="start"
  >
    <Sidebar.Header>
      {/* workspace switcher */}
      <Sidebar.CloseTrigger aria-label="Close primary navigation" />
    </Sidebar.Header>
    <Sidebar.Content>
      <Sidebar.Group>
        <Sidebar.GroupLabel>Workspace</Sidebar.GroupLabel>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            <Sidebar.Item>{/* navigation link */}</Sidebar.Item>
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    </Sidebar.Content>
    <Sidebar.Footer>{/* account action */}</Sidebar.Footer>
    <Sidebar.Rail aria-label="Toggle primary navigation" />
  </Sidebar.Panel>

  <Sidebar.Inset>
    <Sidebar.Trigger
      aria-label="Toggle primary navigation"
      side="start"
      tooltip="Toggle navigation"
    />
    {/* routed content */}
  </Sidebar.Inset>
</Sidebar>
```

Choose each logical side's collapse behavior once on `Sidebar.Root` through
the `collapsible` policy. Missing sides default to `icon`:

```tsx
<Sidebar collapsible={{ start: "offcanvas", end: "none" }}>
  {/* start/end panels and inset */}
</Sidebar>
```

- `icon` keeps an icon rail visible on desktop.
- `offcanvas` removes the collapsed desktop panel from interaction and the
  accessibility tree.
- `none` keeps the desktop panel expanded and hides its rail.

`Sidebar.CloseTrigger` renders only in the mobile Drawer branch. Include it in
each standard panel header so pointer and touch users have an explicit close
command. A `none` panel remains open on desktop, its desktop Trigger is omitted,
and the same Trigger remains available below the breakpoint to open the Drawer.

## Responsive behavior

The desktop boundary is the component token
`--breakpoint-sidebar-desktop`, which defaults to `64rem`. Sidebar derives both
its CSS visibility and React rendering mode from the Tailwind variant generated
for that token. Override it only at build time in the app's Tailwind theme:

```css
@theme static {
  --breakpoint-sidebar-desktop: 72rem;
}
```

Do not redefine the breakpoint from a runtime selector or per instance.

Below the breakpoint, each `Sidebar.Panel` is rendered through the UI kit
`Drawer`. Use `Sidebar.Trigger` to open it. Drawer focus management, Escape,
backdrop dismissal, scroll locking, and logical-edge swipe behavior are part of
the Sidebar contract; do not wrap a mobile panel in another Dialog or Drawer.
When one side has multiple triggers, their optional explicit `value` props must
be unique within that side; omitting `value` generates a unique value.

Desktop expansion is preserved while the viewport is mobile. Returning to the
desktop breakpoint closes any open mobile Drawer without discarding the saved
desktop sides. If a breakpoint change removes a panel that currently contains
focus, Sidebar transfers focus to a visible Trigger for the same side. Keep
stateful controls inside a panel controlled when their state must survive a
desktop/mobile branch change.

## Two physical panes

Use `Sidebar.PaneGroup` and `Sidebar.Pane` for the two-column navigation pattern.
This is spatial navigation, not progressive disclosure, so do not substitute an
Accordion.

```tsx
<Sidebar collapsible={{ start: "icon" }}>
  <Sidebar.Panel aria-label="Workspace navigation">
    <Sidebar.PaneGroup>
      <Sidebar.Pane
        aria-label="Workspace switcher"
        role="navigation"
        size="rail"
      >
        {/* icon-only destinations */}
      </Sidebar.Pane>
      <Sidebar.Pane
        aria-label="Selected workspace navigation"
        role="navigation"
        size="content"
        visibility="expanded"
      >
        {/* links for the selected destination */}
      </Sidebar.Pane>
    </Sidebar.PaneGroup>
    <Sidebar.Rail aria-label="Toggle workspace navigation" />
  </Sidebar.Panel>
</Sidebar>
```

The `rail` pane stays at icon width. A pane with `visibility="expanded"` is
removed when its enclosing desktop panel collapses. Selecting a rail destination
can call `api.setExpanded("start", true)` through `Sidebar.Context` so its detail
pane becomes available in the same action.

## Sticky site header

Keep a full-width `Header` and the panel/content row inside one Sidebar root so
header triggers retain Sidebar context. Match the header height with the
component offset token.

```tsx
type SidebarStyle = React.CSSProperties & {
  "--spacing-sidebar-offset"?: string
}

const sidebarStyle: SidebarStyle = {
  "--spacing-sidebar-offset": "var(--spacing-700)",
}

<Sidebar className="flex-col" style={sidebarStyle}>
  <Header
    className="sticky top-0 w-full max-w-none"
    style={{ height: "var(--spacing-700)" }}
  >
    <Sidebar.Trigger aria-label="Toggle primary navigation" />
  </Header>
  <div className="flex min-h-0 flex-1">
    <Sidebar.Panel aria-label="Primary navigation">
      {/* navigation */}
    </Sidebar.Panel>
    <Sidebar.Inset>{/* routed content */}</Sidebar.Inset>
  </div>
</Sidebar>
```

Use the same token value for both heights. The panel then uses the remaining
viewport height and its sticky offset clears the site header.

## Accessibility

- Give every `Sidebar.Panel`, `Sidebar.Trigger`, `Sidebar.CloseTrigger`, and
  `Sidebar.Rail` a concise, unique accessible name.
- Render destinations as real links, set `aria-current="page"` on the active
  destination, and reserve buttons for actions.
- Wrap link text in `Sidebar.Label` for icon-collapse navigation. It remains
  available to assistive technology when visually reduced.
- Add a `Tooltip` to icon-only links. A tooltip supplements rather than replaces
  the link's `aria-label`.
- Put expanded-only headings, descriptions, and controls in
  `Sidebar.Expanded`; it removes them from layout and accessibility when the
  desktop panel collapses.
- Prefer `side="start"` and `side="end"` over physical left/right assumptions.
  Set `dir="rtl"` on the root when the application direction is RTL.
- Do not manually add `aria-expanded`, `aria-controls`, focus traps, or inert
  state to the built-in trigger and panel. Sidebar and Drawer own those states.

## Acceptance checklist

- Icon collapse leaves the active link understandable by name and tooltip.
- A two-pane panel retains the rail and removes the detail pane when collapsed.
- End-side panels render and swipe from the logical end edge.
- Start and end panels can coexist without sharing expansion state.
- A full-width sticky Header remains outside the panel/content row and its height
  matches `--spacing-sidebar-offset`.
- Keyboard users can reach the trigger and links, dismiss a mobile panel with
  its CloseTrigger or Escape, and return focus to the trigger.
- Both LTR and RTL layouts are checked at widths above and below
  `--breakpoint-sidebar-desktop`.

## Common mistakes

- Do not add visual `variant="floating"` or `variant="inset"` branches to model
  layouts that composition already expresses.
- Do not use Accordion for two physical panes.
- Do not create a second mobile navigation tree; Sidebar moves the same panel
  composition into Drawer.
- Do not hardcode `16rem`, `3.5rem`, `18rem`, or `64rem` in app code. Override
  the documented Sidebar tokens at the theme boundary when needed.
- Do not place a header trigger outside its Sidebar root.

## Validation Commands

```sh
rg -n "<(aside|nav)[^>]*className=.*(fixed|sticky|w-|border-)" apps
rg -P -n "<Sidebar\.Panel(?![^>]*(aria-label|aria-labelledby))" apps
rg -P -n "<Sidebar\.(Trigger|CloseTrigger|Rail)(?![^>]*aria-label)" apps
rg -n -- "--breakpoint-sidebar-desktop|--spacing-sidebar-offset" apps
```
