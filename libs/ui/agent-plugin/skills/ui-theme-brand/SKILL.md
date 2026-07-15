---
name: ui-theme-brand
description: >
  Add or edit a brand theme (light/dark pair) for @techsio/ui-kit — either via the Figma
  variables pipeline or fully in code ("vibe" a theme). Use for brand colors, data-theme
  switching, or theme overrides. Invoke explicitly with $ui-theme-brand.
metadata:
  plugin: techsio-ui-kit-ai
  library: "@techsio/ui-kit"
---

# ui-kit brand theming

Architecture: brands × color-scheme runtime switching via `better-themes`, `data-theme`
attribute + `.light`/`.dark`/`.reverse` classes. Existing brands: base (default), `neo`,
`cyber` — each with a light/dark pair. Full picture: `libs/ui/THEME-FLOW.md`.

## Two ways to create a brand

**1. Figma pipeline (default, when the brand is designed in Figma)**
- Brand variables are exported per mode to `libs/ui/src/tokens/figma/<brand>/variables.css`
  and `<brand>-dark/variables.css`.
- Merge with the scripts in `.agents/skills/figma-token-binding/scripts/`
  (`merge-figma-themes.mjs` emits `figma/variables.css` + `figma/brand-overrides.css`).
- Never hand-edit the two generated files.

**2. Code-authored / "vibed" brand (no Figma yet)**
- Follow `.agents/skills/vibe-theme/` — scaffold with `scaffold-brand.mjs` (copies the base
  brand), edit ONLY primitives and re-aliases, validate with `validate-brand.mjs`, then merge.
- Register the brand in `libs/ui/src/theme/theme-config.ts`; it must be toggle-selectable,
  never the new default.

## Rules

- A brand changes primitive values and re-aliases — never component-layer structure.
- Brand overrides land under `[data-theme="<brand>"]` selectors in `brand-overrides.css`
  (generated).
- App-level (non-kit) overrides belong in the consuming app via the bundled
  `app-token-overrides` skill, not in the kit.

## Verify

`pnpm --dir libs/ui validate:tokens`, then flip through brands/modes in Storybook
(`bunx nx run ui-kit:storybook` — two toolbar switches: brand + color scheme) and run
`pnpm --dir libs/ui test:components` if visuals of the default brand could be affected.
