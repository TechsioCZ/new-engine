---
name: ui-figma-sync
description: >
  Keep @techsio/ui-kit and Figma in sync: Code Connect (*.figma.tsx) mappings, Figma
  variable naming/aliasing, and the token export pipeline. Use after a component's public
  API or visuals changed. Invoke explicitly with $ui-figma-sync.
metadata:
  plugin: techsio-ui-kit-ai
  library: "@techsio/ui-kit"
---

# ui-kit ↔ Figma sync

Code is the source of truth; Figma mirrors the code token hierarchy. Deep guidance:
the bundled `figma-sync-handoff` skill + the "Figma Sync Rules" section of
`libs/ui/AGENTS.md`.

## Code Connect

- Mapping file per component: `libs/ui/src/<level>/<name>.figma.tsx`
  (config: `libs/ui/figma.config.json`, alias `@libs/ui/* → src/*`).
- Validate: `pnpm --dir libs/ui figma:connect:parse`
- Publish (needs Figma auth; only when explicitly asked):
  `pnpm --dir libs/ui figma:connect:publish`

## Figma variables

- Hierarchy mirrors code: primitives → semantic aliases → component aliases; component
  variables alias upward, never hold raw values when an upper token exists.
- Names: `property/component/cssProperty/variant/state`, omitting non-varying segments —
  `color/button/bg/primary/hover`, `spacing/form-field/gap`.
- Explicit scopes (never ALL_SCOPES); code syntax set to the real custom property
  (`var(--color-button-bg-primary)`).
- Export/merge pipeline: `.agents/skills/figma-token-binding/scripts/` — regenerates
  `src/tokens/figma/variables.css` + `brand-overrides.css`; never hand-edit those.

## Checklist when a component changed

1. Props added/renamed → update `<name>.figma.tsx` and re-parse.
2. New tokens → mirror as Figma variables with correct aliasing + scopes.
3. Visual change → flag for a fresh Figma screenshot/spec check (figma MCP:
   `get_design_context` / `get_screenshot`).
