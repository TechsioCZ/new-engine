---
name: ui-theme-brand
description: >
  Add or edit a brand theme (light/dark pair) for @techsio/ui-kit — either via the Figma
  variables pipeline or fully in code ("vibe" a theme). Use for brand colors, data-theme
  switching, or theme overrides. Invoke explicitly with $ui-theme-brand.
metadata:
  plugin: "techsio-ui-kit-ai"
  library: "@techsio/ui-kit"
  resources: "../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  audience: "contributor"
  requires: "tailwind-token-authoring app-token-overrides"
---

> Portable scope: Source-authoring steps and monorepo commands require an explicit kit source checkout. In an installed consumer app, route to ../component-usage-ux/SKILL.md instead; do not run contributor commands or require repository artifacts. Resolve ../../references/ paths from this skill's folder, not the app working directory.

# ui-kit brand theming

Architecture: brands are data (`BrandDefinition`: key, label, the modes it supports —
light, dark or both — and token overrides) passed to `AppThemeProvider` at runtime, which
renders each brand's stylesheet and sets `data-theme` + `.light`/`.dark`. `BrandScope`
applies a brand to one subtree. The kit's Figma brands `business` (default), `akros`, `n1`
(all light-only) ship as the same data in `theme/built-in-brands`; the attribute-less base
layer is the shared foundation, not a brand. Full picture: `libs/ui/THEME-FLOW.md`.

## Three ways to create a brand

**0. Runtime data (no kit release)** — the application stores a `BrandDefinition`,
validates it with `validateBrand` from `@techsio/ui-kit/theme/brand-validator` where it
is written, and passes it to `AppThemeProvider`. See `.agents/skills/vibe-theme/`
("A runtime brand instead of a kit brand").

**1. Figma pipeline (default, when the brand is designed in Figma)**
- Brand variables are exported per mode to `libs/ui/src/tokens/figma/<brand>/variables.css`
  and `<brand>-dark/variables.css`.
- Merge with the scripts in `.agents/skills/figma-token-binding/scripts/`
  (`merge-figma-themes.mjs` emits `figma/variables.css` + `figma/brand-overrides.css`).
- Never hand-edit the two generated files.

**2. Code-authored / "vibed" brand (no Figma yet)**
- Follow `.agents/skills/vibe-theme/` — scaffold with `scaffold-brand.mjs` (copies the base
  brand), edit ONLY primitives and re-aliases, register it in
  `libs/ui/src/tokens/figma/brands.json` (toggle-selectable, never the new default), merge,
  run `node libs/ui/scripts/validate-token-scopes.js --write`, and validate with
  `tests/brand-themes.test.ts`.

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
