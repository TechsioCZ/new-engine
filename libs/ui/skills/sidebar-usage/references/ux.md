<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/sidebar-desktop--3100-5255.md and sidebar-mobile--3107-5230.md (+ sidebar-header, -content, -footer, -group, -grouplabel, -groupcontent, -menu, -item, -label, -separator, -expanded, -trigger, -rail, -tooltip, -navigationitem, -pane, -panegroup, -inset; internal frames and sidebarglyph-* skipped), edited. Storybook: Organisms/Sidebar → UX guidelines. -->

# Sidebar: UX guidelines

Sidebar is the application frame: persistent navigation beside the main
content on desktop, a temporary Drawer on narrow screens. Collapsing,
expanding or opening it changes the frame only; it never navigates, saves or
signs anyone out.

## When to use

- Application navigation that stays reachable while the user works (the admin
  shell): many destinations, grouped, next to routed content.

## Use something else when

| Need | Use instead |
| --- | --- |
| Just a navigation list inside an existing layout | `VerticalNavigation` |
| A temporary contextual panel (cart, filters, record detail) | `Drawer` |
| A global storefront top bar | `Header` |
| Sections within one page | `Tabs` |

## Anatomy

- **Root** (`Sidebar`): owns the collapse policy, desktop expansion and the
  mobile Drawer state.
- **Panel** (`Sidebar.Panel`, `side` start / end): one named navigation
  frame with:
  - **Header** (`Sidebar.Header`): identity or workspace switcher.
  - **Content** (`Sidebar.Content`): the scrollable middle.
  - **Groups** (`Sidebar.Group`): a **GroupLabel** (`Sidebar.GroupLabel`, a
    heading, not a link) and **GroupContent** with a **Menu**
    (`Sidebar.Menu`) of **Items** (`Sidebar.Item`). Each item holds one
    destination link; the link, not the item, decides action and current
    state. The Menu is navigation, not a command `Menu`.
  - **Separator** (`Sidebar.Separator`): only between groups that are
    present.
  - **Footer** (`Sidebar.Footer`): account and settings; stays reachable
    however long the navigation is.
  - **Label** (`Sidebar.Label`): the one visible name of a destination; kept
    for assistive tech when collapsed to icons.
  - **Expanded** (`Sidebar.Expanded`): content shown only when expanded.
  - **PaneGroup / Pane**: two physical panes (icon rail + detail).
  - **Rail** (`Sidebar.Rail`): edge control that toggles the panel.
- **Trigger** (`Sidebar.Trigger`) and **CloseTrigger**
  (`Sidebar.CloseTrigger`, mobile only).
- **Inset** (`Sidebar.Inset`): the main work area beside the panel.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `Sidebar.Desktop` | `Sidebar` at or above `--breakpoint-sidebar-desktop` | The persistent panel. Not a separate component. |
| `Sidebar.Mobile` | the same `Sidebar` below the breakpoint | The panel renders in a `Drawer`. Not a separate component. |
| `collapsible=icon` | `collapsible={{ start: "icon" }}` (default) | Collapses to an icon rail; names stay available through `Sidebar.Label` and tooltips. |
| `collapsible=offcanvas` | `collapsible={{ start: "offcanvas" }}` | Collapses out of view; a Trigger stays reachable to bring it back. |
| `collapsible=none` | `collapsible={{ start: "none" }}` | Always expanded on desktop. No rail and no desktop trigger. |
| `expanded=true` / `false` | `expanded` / `defaultExpanded` (array of sides) | Desktop expansion. Never shown as collapsed for `none`. |
| `open=true` / `false` (Mobile) | `mobileOpen` / `defaultMobileOpen` (`"start" \| "end" \| null`) | Mobile Drawer state, separate from desktop expansion. |
| `side=start` / `end`, `dir=ltr` / `rtl` | `side` on Panel and Trigger; `dir` on the root | Logical sides; RTL mirrors layout, not meaning. |
| `Sidebar.NavigationItem` | `Sidebar.Item` + `LinkButton` + `Sidebar.Label` | No NavigationItem component. `active=true` → `aria-current="page"` on the link; `state=disabled` → `disabled` on LinkButton. |
| `Sidebar.Tooltip` | `tooltip` on `Sidebar.Trigger`; `Tooltip` around icon links | Not an exported part. |
| Pane `size=rail` / `content` / `auto`, `visibility=always` / `expanded` | same props on `Sidebar.Pane` | Rail pane keeps icon width; an `expanded` pane is removed when the panel collapses. |
| `sidebarglyph-*` | `icon-[mdi--…]` | Figma glyph sets; code uses icons directly. |

## Behaviour

**May:** open a destination; expand, collapse or close the frame as its mode
allows; on narrow screens, open the same navigation in a Drawer.

**Must not:** confuse collapsing with signing out or changing page; treat
`none` as another kind of collapsed rail or show a collapse control that does
nothing.

- Destination, current page and an open branch are three different things.
  Only the page actually shown is current.
- Collapsing to icons keeps each destination's name available (label for
  assistive tech, tooltip on hover and focus). The tooltip stays open while
  the pointer moves into it.
- A disabled destination really blocks navigation and says so, not only by
  colour.
- Expanding or collapsing never covers important controls in the Inset. With
  a sticky site header, the panel uses the remaining viewport height so its
  bottom items stay reachable.
- On mobile, focus stays inside the open Drawer and returns to the trigger
  (or the next sensible target) on close. Opening and closing keep the main
  content's context, including unsaved drafts.
- The rail toggles with a click or the keyboard; no precise drag is required.

## Content and copy

- Destinations are nouns that match page titles and the rest of the app's
  navigation: `Orders`, `Products` — cs: `Objednávky`, `Produkty`.
- One readable name per destination; the name, icon and target all describe
  the same page.
- Trigger names describe the real action and side: `Toggle primary navigation`
  — cs: `Přepnout hlavní navigaci`. Tooltip text matches the destination name.

## Accessibility

- The kit sets `aria-expanded` and `aria-controls` on Trigger and Rail and
  owns the Drawer's focus trap, Escape and focus return.
- Every Panel, Trigger, CloseTrigger and Rail needs its own accessible name.
- The current destination has `aria-current="page"`; colour is never the only
  sign of current or disabled.
- Long names, translations and RTL stay readable in both expanded and
  collapsed modes.

## Edge cases

- **Multi-agenda ERP**: `icon` keeps names reachable; a `none` panel stays
  expanded and shows no fake rail.
- **Long customer-account list on mobile**: the last destination and the close
  control are always reachable by scrolling.
- **Sticky header in a project tool**: the panel's footer doesn't fall below
  the viewport.

## Related

- [Accessibility](../../ux-guidelines/references/accessibility.md): landmarks, names, focus return.
- [VerticalNavigation](../../vertical-navigation-usage/references/ux.md): the navigation list inside the panel.
- [Drawer](../../drawer-usage/references/ux.md): the mobile panel.
- [Header](../../header-usage/references/ux.md): the site bar above the frame.
