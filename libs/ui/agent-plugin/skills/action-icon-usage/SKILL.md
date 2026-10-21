---
name: action-icon-usage
description: >
  Use when an app needs the @techsio/ui-kit ActionIcon atom — an icon-only,
  square action button (toolbar/inline actions). Covers tone, size, disabled
  state, accessible labelling, and token-first styling.
metadata:
  type: "core"
  library: "@techsio/ui-kit"
  component: "ActionIcon"
  component_version: "1.1.2"
  requires: "ux-guidelines"
  resources: "../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

# ActionIcon usage

`ActionIcon` is an icon-only, square action button for compact/inline actions where a
full `Button` with a text label would be too heavy (toolbars, table row actions, input adornments).

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `ActionIcon`.

**Use it when**

- A single, universally understood icon communicates the action: close, edit, delete, more, expand, copy.
- Space is constrained: table row actions, toolbars, input adornments, card corners.
- The action repeats many times on the screen, so a text label would be noise.

**Use something else when**

| Need | Use instead |
| --- | --- |
| The action is the main thing on the surface, or the icon is ambiguous | Button with `icon` and a text label |
| Navigation to another page | Link / LinkButton |
| Several actions on one row | one ActionIcon that opens a Menu (`More actions`) |
| Decorative icon next to text | Icon |

**Do**

- Always pass `aria-label` as a verb + object: `Delete product`, `Close notification`, `Copy link`.
- Pair it with a Tooltip carrying the same text on pointer devices.
- Keep the destructive one last in a group and use the danger tone.
- Keep hit area ≥ 24×24 CSS px (the kit sizes do); prefer `md` for touch surfaces.

**Don't**

- Use icon-only actions for the page's primary action.
- Invent icons for abstract actions (`Sync`, `Reconcile`) — use a labelled Button.
- Put two different actions with similar icons side by side (edit pencil vs rename pencil).
- Disable an ActionIcon without explaining why elsewhere — tooltips don't show on disabled controls.

**Copy and states**

- The `aria-label` and Tooltip text follow button-label rules from ux-guidelines/ux-writing.
- Destructive icon actions still confirm or offer Undo (ux-guidelines/feedback-and-actions).

## Accessibility

An icon-only control has no visible text, so it **must** carry an accessible name — pass
`aria-label` (or an equivalent labelling mechanism). Never ship an ActionIcon without one.

Since v1.1.0 the type enforces it: `ActionIconProps` requires `aria-label` or
`aria-labelledby`, so `<ActionIcon icon="…" />` without a name no longer compiles.
When spreading Zag trigger props (typed with an optional `aria-label`), pass the
name explicitly: `aria-label={triggerProps["aria-label"] ?? "Next slide"}`.

## Styling

Use the component's own token classes; do not reach for semantic tokens or arbitrary Tailwind
values in app code. Size and tone are props, not ad-hoc classes.

## Interaction and sizing contract

Sizes sm/md/lg use the shared **icon-control hit area**, not the full boxed-field
height: they are supporting actions embedded in fields and toolbars. Default md;
prefer lg for standalone touch actions. Disabled actions do not take hover or
pressed treatments and are removed from keyboard tab order. Every instance must
have `aria-label` or `aria-labelledby`; a glyph alone is not a name.

## Supported tone

`tone="neutral" | "danger"`, default `neutral`. Use `danger` for a destructive
supporting action, not a nonexistent `variant` prop. Sizes are `sm | md | lg`.

```tsx
import { ActionIcon } from "@techsio/ui-kit/atoms/action-icon"

<ActionIcon icon="token-icon-trash" tone="danger" aria-label="Delete product" />
```

The pressed danger foreground/background are an explicit paired set of
`--color-action-icon-{bg,fg}-danger-active` aliases; override both together.
