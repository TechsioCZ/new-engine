---
name: ui-kit-publish-readiness
description: >
  Use before releasing or packaging @techsio/ui-kit. Checks RSLib build,
  package subpath exports, publint, token validators, Storybook build/a11y,
  component screenshots, files array, and semantic-release CI constraints.
metadata:
  type: "lifecycle"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-consistency-validation"
  sources: "libs/ui/package.json libs/ui/project.json libs/ui/rslib.config.ts libs/ui/release.config.mjs libs/ui/scripts/storybook-a11y.sh libs/ui/scripts/storybook-a11y-summary.mjs libs/ui/scripts/run-component-tests.mjs"
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

```text
The UI Release GitHub Actions workflow validates and publishes the exact SHA.
```

Fail condition: local `semantic-release` is expected to publish.
Fix: release is restricted by `release.config.mjs` to GitHub Actions.

## Validation Commands

```sh
pnpm --dir libs/ui validate:tokens
pnpm --dir libs/ui check:package
pnpm --dir libs/ui build:storybook
pnpm --dir libs/ui storybook:a11y
pnpm --dir libs/ui test:components:release
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
pnpm --dir libs/ui check:package
```

Rslib, publint, and AreTheTypesWrong catch package structure, export, and
cross-module-resolution declaration mistakes. Package checks also verify emitted
client-boundary directives and compound members, then exercise both CSS exports,
SSR and callback/skill-example types from a packed installation. The type fixture
includes negative compiler controls so erased runtime types cannot fake a pass.

Source: libs/ui/rslib.config.ts

## Pre-Release Summary

- [ ] Subpath imports verified
- [ ] Token entrypoints verified
- [ ] `validate:tokens` run
- [ ] `check:package` run
- [ ] Storybook/a11y checked when visuals changed
- [ ] Code Connect parse checked when Figma mappings changed

## Required validation versus report collection

CI/release share the exact-commit ui-quality workflow. It runs both TypeScript
projects (`typecheck`), unit/SSR/tooling tests, tokens, package output, the full
Docker suite, and enforced accessibility. `force_release` bypasses only affected
detection, never quality checks. Local semantic-release --dry-run is unsupported;
do not set GITHUB_ACTIONS manually to defeat the publishing guard.

The required visual matrix has 12 projects: base/neo light+dark and
business/Akros light, desktop+mobile. `test:components:release` rejects filters,
brand overrides and snapshot updates and verifies unique successful story/project
identities. Before starting Docker, release readiness also checks the exact Linux
primary baseline filename for every indexed story/project, failing with a missing
count and example paths. A filename containing `akros` only in the story name is
not an Akros project baseline. A focused test run is not release-readiness
evidence. Review missing/changed baselines independently; never generate or
accept them in the release gate.

`storybook:a11y` is enforcing by default across all six supported brand/mode
pairs. Reporter calibration stories have exact expected rule/node assertions and
separate results, not blanket contrast waivers. Missing results fail validation.
`storybook:a11y:report` is explicitly non-blocking collection for reviewed debt;
it is not a passing release accessibility check. Baselines/reports are keyed by
brand and mode, and unsupported Business/Akros dark combinations are never run.

During the shared overhaul, use the assigned shared-browser and serial Docker
wrappers. Do not start a separate Storybook build/server or browser merely to
run this checklist.
