---
name: ui-tokens
description: >
  Work with @techsio/ui-kit design tokens: add or change component token CSS, understand
  the token cascade, shared form-control/icon-button utilities, and run token validation.
  Use for any change under libs/ui/src/tokens/. Invoke explicitly with $ui-tokens.
metadata:
  plugin: techsio-ui-kit-ai
  library: "@techsio/ui-kit"
---

# ui-kit token work

Deep guidance: the bundled `tailwind-token-authoring` skill and, in-repo,
`libs/ui/token-contribution.md`. Pipeline overview: `libs/ui/THEME-FLOW.md`.

## Cascade (defined in `src/tokens/_tokens-base.css`)

primitives (`_base/_colors/_spacing/_typography/_layout.css`)
→ `_semantic.css`
→ component tokens (`components/components.css` → `components/<level>/_<name>.css`)
→ `figma/variables.css` (generated — never hand-edit)
→ `figma/brand-overrides.css` (generated — brand themes under `[data-theme="…"]`)

## Rules

- `@theme static` blocks; two layers always — reference (`--color-button-primary`) then
  derived (`--color-button-bg-primary`); derived must end `-bg`/`-fg`/`-border`.
- Prefixes: `--color- --spacing- --padding- --gap- --text- --font-weight- --radius-
  --border-width- --shadow- --opacity-`. Border widths: `--border-width-<component>`.
- Component code consumes ONLY component token classes; semantic tokens are for stories.
- Shared utilities: `form-control-base` (`_form-control.css`) for control chrome,
  `_icon-button.css` (sizes 16/20/24, shared bg-pill) for icon sub-buttons.
- Validation states: `data-[validation=error|success|warning]` — combobox is the canonical
  pattern.
- New token file must be imported in `components/components.css` or it silently does nothing.

## Validate

```sh
pnpm --dir libs/ui validate:tokens        # usage + definitions
pnpm --dir libs/ui check:unused-tokens    # after removals/renames
```
