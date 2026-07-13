---
name: ui-validate
description: >
  Run the full @techsio/ui-kit quality gate before commit/push: build, token validation,
  biome on changed files, tailwind lint, visual tests, consistency checklist. Use as the
  last step of any libs/ui change. Invoke explicitly with $ui-validate.
metadata:
  plugin: techsio-ui-kit-ai
  library: "@techsio/ui-kit"
---

# ui-kit quality gate

Run in order, from repo root. Stop and report on first failure.

```sh
bunx nx run ui-kit:build
pnpm --dir libs/ui validate:tokens
bunx biome check --write <changed files>     # NEVER "biome check ."
pnpm --dir libs/ui lint:tailwind             # when class names changed
pnpm --dir libs/ui test:components           # when markup/CSS changed
```

Then review the change against the bundled `component-consistency-validation` skill:

- React 19 `ref` prop, no `forwardRef`; `type` not `interface`; named exports, no barrels
- `tv()` with component token classes only (no semantic tokens, no arbitrary values)
- Two-layer tokens registered in `components/components.css`
- Data-attribute state styling (`data-disabled:`, `data-[state=…]:`, `data-[validation=…]:`)
- Story exists and follows the Playground/Variants/Sizes/States order
- `*.figma.tsx` present or explicitly deferred in the summary

Visual snapshot diffs are findings — update with
`pnpm --dir libs/ui test:components:update` only when the visual change is intended, and say
so in the summary.

## On success — mark the push gate

```sh
git rev-parse HEAD > "$(git rev-parse --absolute-git-dir)/ui-validate-passed"
```

The plugin's pre-push hook blocks `git push` of libs/ui changes until this marker matches HEAD.

## Known CI trap

`herbatica:lint` is red on master (9 pre-existing errors) and any UI diff makes herbatika
"affected" — that failure is not caused by UI work. Never modify apps/herbatika from a UI task.
