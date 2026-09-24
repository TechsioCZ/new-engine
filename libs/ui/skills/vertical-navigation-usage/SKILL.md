---
component_version: "1.0.0"
name: vertical-navigation-usage
description: >
  Use for nested page or category links with independently expandable and
  styled subgroups, standalone or inside Sidebar or Drawer.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/vertical-navigation.tsx"
  - "libs/ui/src/tokens/components/molecules/_vertical-navigation.css"
  - "libs/ui/stories/molecules/vertical-navigation.stories.tsx"
---

# VerticalNavigation

Use for site/category navigation: native links, lists and disclosure buttons.
Sidebar owns responsive layout; Drawer owns an overlay. Neither is required.
Use TreeView for a tree widget with arrow-key navigation and selection, or
CascadeSelect for a hierarchical form value.

## Anatomy

```tsx
import { VerticalNavigation } from "@techsio/ui-kit/molecules/vertical-navigation"

<VerticalNavigation aria-label="Product categories">
  <VerticalNavigation.List>
    <VerticalNavigation.Branch defaultOpen containsCurrent>
      <VerticalNavigation.Row>
        <VerticalNavigation.Link href="/fasteners">
          Fasteners
        </VerticalNavigation.Link>
        <VerticalNavigation.BranchTrigger aria-label="Toggle fasteners">
          <VerticalNavigation.BranchIndicator />
        </VerticalNavigation.BranchTrigger>
      </VerticalNavigation.Row>
      <VerticalNavigation.BranchContent tone="subtle">
        <VerticalNavigation.List>
          <VerticalNavigation.Item>
            <VerticalNavigation.Link href="/fasteners/bolts" current>
              Bolts
            </VerticalNavigation.Link>
          </VerticalNavigation.Item>
        </VerticalNavigation.List>
      </VerticalNavigation.BranchContent>
    </VerticalNavigation.Branch>
  </VerticalNavigation.List>
</VerticalNavigation>
```

List renders ul; its direct children must be Item or Branch (li).
BranchContent holds a nested List. Row separates a navigable parent from its
disclosure button; do not put a link inside a button. A category with no URL
can use a full-width BranchTrigger containing its label and BranchIndicator.

## State and routing

- Branch uses Zag Collapsible. Set either defaultOpen or controlled
  open/onOpenChange per branch. Controlled proposals do not change the UI
  until the parent accepts them.
- The router owns Link current (aria-current="page") and Branch
  containsCurrent (ancestor-path emphasis). These flags do not open branches.
- defaultOpen is initial state only. For route changes, update controlled
  open values along the new current path in the application.
- Link supports the library LinkButton as adapter for framework links.
  A disabled link suppresses activation and is removed from Tab order.
- Branch disabled disables disclosure, not a sibling parent link. Disable
  that Link explicitly when its destination is unavailable.
- There is no global selection store, automatic route matching, or special
  tree/menu keyboard model. Tab navigates links/buttons; Enter/Space toggles
  a focused disclosure.

## Independent subgroup styling

Root size is sm or md (default md), with optional dir="rtl". Both use compact
navigation typography, smaller section labels and flat subgroup surfaces.
BranchContent and Group accept tone: plain (default), subtle, accent.
With tone="accent", variant="primary" (default) or variant="secondary" selects
the brand color for that surface. Plain and subtle stay neutral regardless of
variant. Variants do not inherit into nested groups or change current-link colors.
Prefer a few intentionally colored groups over assigning a color to every depth.
Tone belongs to the group surface, not the active page or nesting depth.
Current links also use underline and weight, so state is not color-only.

BranchContent indent defaults to true; showGuide defaults to false. Opt into
guide lines only where they help clarify the hierarchy. Root maxIndentDepth
defaults to 3: further levels retain semantic nesting without increasing
indentation. Set maxIndentDepth={7} to indent all levels of a deep catalog,
or indent=false for an individual content region. Seven levels
are demonstrated, but very deep catalogs may still benefit from search or
a separate drill-down experience.

Group/GroupLabel label top-level sections. Separator goes between groups,
outside List. Give the nav an accessible label and icon-only triggers a
specific aria-label.

Customize component tokens in the app theme rather than adding depth-specific
variants: --color-vertical-navigation-group-bg-subtle,
--color-vertical-navigation-group-bg-accent,
--color-vertical-navigation-group-fg-accent,
--color-vertical-navigation-group-bg-secondary,
--color-vertical-navigation-group-fg-secondary,
--color-vertical-navigation-item-bg-current,
--color-vertical-navigation-item-fg-current,
--spacing-vertical-navigation-indent. Override foreground/background pairs
together and verify contrast in each supported theme.

## Shell composition

Place Root inside Drawer.Body or Sidebar.Content. Navigation does not close a
Drawer on route activation; the app decides that policy. For Sidebar, use an
expanded/non-icon-collapse panel or provide an app-specific collapsed view.
The navigation does not automatically turn seven-level labels into icon-only
items.

Storybook includes Playground, Variants, Sizes, States, SevenLevels,
Controlled, WithinDrawer, WithinSidebar, RTL and AkrosCatalog.
Figma component creation and Code Connect are deferred until anatomy/tokens
are approved; there are no invented Figma node mappings.
