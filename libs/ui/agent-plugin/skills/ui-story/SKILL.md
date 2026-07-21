---
name: ui-story
description: >
  Write or update Storybook stories for a @techsio/ui-kit component (CSF3, Storybook 10,
  autodocs). Use when a component is added or its API changes. Invoke explicitly with
  $ui-story <component>.
metadata:
  plugin: techsio-ui-kit-ai
  library: "@techsio/ui-kit"
---

# ui-kit stories

Deep guidance: the bundled `storybook-authoring` skill. Copy the structure of an
existing story (`libs/ui/stories/atoms/button.stories.tsx`) rather than inventing one.

## Rules

- Location: `libs/ui/stories/<level>/<name>.stories.tsx` — stories are NOT colocated.
- Use kit components over native HTML; semantic token classes over hardcoded Tailwind
  (`bg-danger p-100 gap-50`, never `bg-red-500 p-2 gap-1`).
- Story order, only for what the component supports:
  1. `Playground` (always) 2. `Variants` 3. `Sizes` 4. `States` 5. component-specific.
- `VariantContainer` / `VariantGroup` from `stories/helpers/` for matrices;
  `fn()` from `storybook/test` for handlers.
- Controls only for props with visible effect (no `id`, `ref`, internal callbacks).

## Verify

```sh
bunx nx run ui-kit:storybook              # renders clean
pnpm --dir libs/ui test:components        # visual snapshots (update only intentionally)
pnpm --dir libs/ui storybook:a11y         # a11y sweep for new components
```
