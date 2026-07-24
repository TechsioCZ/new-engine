---
name: action-icon-usage
description: >
  Use when an app needs the @techsio/ui-kit ActionIcon atom — an icon-only,
  square action button (toolbar/inline actions). Covers variant, size, disabled
  state, accessible labelling, and token-first styling.
type: core
library: "@techsio/ui-kit"
component: ActionIcon
component_version: "1.0.0"
---

# ActionIcon usage

`ActionIcon` is an icon-only, square action button for compact/inline actions where a
full `Button` with a text label would be too heavy (toolbars, table row actions, input adornments).

## When to use

- A single icon communicates the action (close, edit, delete, expand).
- Space is constrained and a labelled `Button` does not fit.

Otherwise prefer `Button` (with `icon` props) so the action keeps a visible text label.

## Accessibility

An icon-only control has no visible text, so it **must** carry an accessible name — pass
`aria-label` (or an equivalent labelling mechanism). Never ship an ActionIcon without one.

## Styling

Use the component's own token classes; do not reach for semantic tokens or arbitrary Tailwind
values in app code. Size and variant are props, not ad-hoc classes.
