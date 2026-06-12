---
name: ui-kit-publish-readiness
description: >
  Use before releasing or packaging @techsio/ui-kit. Checks RSLib build,
  package subpath exports, publint, token validators, Storybook build/a11y,
  component screenshots, files array, and semantic-release CI constraints.
type: lifecycle
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-consistency-validation
sources:
  - "libs/ui/package.json"
  - "libs/ui/project.json"
  - "libs/ui/rslib.config.ts"
  - "libs/ui/release.config.mjs"
  - "libs/ui/scripts/storybook-a11y.sh"
  - "libs/ui/scripts/storybook-a11y-summary.mjs"
  - "libs/ui/scripts/run-component-tests.mjs"
---

# @techsio/ui-kit Publish Readiness Checklist

Run this before publishing or when package-level changes could affect
consumers.

## Package Checks

### Check: package exports are subpath-based

Expected:

```tsx
import { Button } from "@techsio/ui-kit/atoms/button"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
```

Fail condition: examples or docs import from `@techsio/ui-kit` root.
Fix: use the exported atoms/molecules/organisms/templates subpaths.

### Check: token CSS entrypoints are public

Expected:

```css
@import "@techsio/ui-kit/tokens";
@import "@techsio/ui-kit/tokens-with-tailwind";
```

Fail condition: an app deep-imports `@techsio/ui-kit/src/tokens/...`.
Fix: use package exports or adjust package exports intentionally.

### Check: release runs only in CI

Expected:

```sh
GITHUB_ACTIONS=true pnpm --dir libs/ui semantic-release
```

Fail condition: local `semantic-release` is expected to publish.
Fix: release is restricted by `release.config.mjs` to GitHub Actions.

## Validation Commands

```sh
pnpm --dir libs/ui validate:tokens
bunx nx run ui:build
pnpm --dir libs/ui build:storybook
pnpm --dir libs/ui storybook:a11y
pnpm --dir libs/ui test:components
pnpm --dir libs/ui figma:connect:parse
```

Run the full set only for release readiness. For normal changes, run the
focused subset from `component-consistency-validation`.

## Common Mistakes

### HIGH Expecting root package imports

Wrong:

```tsx
import { Button } from "@techsio/ui-kit"
```

Correct:

```tsx
import { Button } from "@techsio/ui-kit/atoms/button"
```

The package exports wildcard subpaths, not a root barrel.

Source: libs/ui/package.json

### HIGH Running semantic-release locally

Wrong:

```sh
pnpm --dir libs/ui semantic-release
```

Correct:

```text
Let GitHub Actions run semantic-release on master/main.
```

`release.config.mjs` throws unless `GITHUB_ACTIONS === "true"`.

Source: libs/ui/release.config.mjs

### MEDIUM Skipping build after export changes

Wrong:

```text
Change package.json exports and skip build.
```

Correct:

```sh
bunx nx run ui:build
```

RSLib and publint checks catch package structure and export mistakes.

Source: libs/ui/rslib.config.ts

## Pre-Release Summary

- [ ] Subpath imports verified
- [ ] Token entrypoints verified
- [ ] `validate:tokens` run
- [ ] `ui:build` run
- [ ] Storybook/a11y checked when visuals changed
- [ ] Code Connect parse checked when Figma mappings changed
