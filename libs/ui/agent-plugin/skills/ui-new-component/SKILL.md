---
name: ui-new-component
description: >
  Scaffold a new @techsio/ui-kit component in libs/ui. Use when asked to create a new
  atom, molecule, organism, or template — walks through component source with tv(),
  token CSS, story, and Figma follow-up. Invoke explicitly with $ui-new-component <name>.
metadata:
  plugin: techsio-ui-kit-ai
  library: "@techsio/ui-kit"
---

# New ui-kit component

Deep guidance lives in the bundled `component-authoring` skill — read it before writing
code. This skill is the checklist and file map.

## 1. Classify

- **atom** — single element, no Zag machine (`src/atoms/`)
- **molecule** — interactive/compound, usually a Zag.js machine (`src/molecules/`,
  read the bundled `zag-compound-components` skill)
- **organism** — page-level section (`src/organisms/`)
- **template** — composition example only (`src/templates/`)

## 2. Create exactly these files (kebab-case, flat, no index.ts)

| File | Purpose |
| --- | --- |
| `libs/ui/src/<level>/<name>.tsx` | Component. `tv()` from `../utils`, component token classes only, `ref?: Ref<T>` prop (no forwardRef), `type` not `interface`, named export. |
| `libs/ui/src/tokens/components/<level>/_<name>.css` | Two-layer tokens in `@theme static` (reference → derived `-bg/-fg/-border`). Register the import in `src/tokens/components/components.css`. |
| `libs/ui/stories/<level>/<name>.stories.tsx` | CSF3 story — delegate to `$ui-story` / ui-storybook-writer. |
| `libs/ui/src/<level>/<name>.figma.tsx` | Code Connect mapping — may be deferred; say so explicitly. |

Subpath exports (`./atoms/*`, `./molecules/*`, …) are wildcard — no package.json change needed
unless you introduce a new level.

## 3. State styling

Data attributes only: `data-disabled:` (boolean shorthand), `data-[state=open]:`,
`data-[validation=error]:` (enumerated). Form-like controls reuse `form-control-base` from
`src/tokens/components/_form-control.css`.

## 4. Verify (mandatory)

Run `$ui-validate` (or spawn the `ui-qa-validator` agent):
`bunx nx run ui-kit:build` → `pnpm --dir libs/ui validate:tokens` →
`bunx biome check --write <files>` → stories render in `bunx nx run ui-kit:storybook`.
