---
name: adopting-ui-kit-in-apps/existing-app-refactor-review
description: Audit an existing app that already uses @techsio/ui-kit, classify adoption problems such as inline appearance className, ignored props, redundant overrides, and native element drift, and propose a phased refactor plan. Use when a consuming app feels inconsistent, over-styled in JSX, or poorly aligned with the library's token-first model.
---

# Existing App Refactor Review

Audit a consuming app that already uses `libs/ui`. The goal is not to rewrite everything, but to classify drift, remove the highest-value anti-patterns first, and push appearance back into props and tokens instead of JSX styling.

## Read First

Inspect the target app before proposing changes:

- app files that import `@techsio/ui-kit` components
- app token override files if they exist
- nearby native controls or local wrappers that duplicate ui-kit primitives
- `AGENTS.md`
- `token-contribution.md`
- the relevant `libs/ui` component `tsx`, token CSS, and story files for the affected surfaces

## Workflow

1. Inventory how the app currently uses `libs/ui`.
2. Search for anti-patterns around each usage:
   - inline appearance `className`
   - ignored component props or variants
   - redundant `_app-<component>.css` overrides
   - native elements where ui-kit already provides a primitive
   - local wrappers that should be plain composition or a real shared-library gap
3. Classify every finding before proposing a fix.
4. Preserve legitimate layout or composition classes. Refactor appearance classes first.
5. Recommend the smallest correct fix:
   - existing prop or variant
   - semantic/typography/spacing token cleanup
   - component-specific app override cleanup
   - library-gap escalation
6. Group repeated findings into a phased refactor plan so the app can improve safely.

## Finding Categories

Use these categories consistently:

- `prop-or-api-miss`
- `token-layer-misplacement`
- `redundant-component-override`
- `native-element-drift`
- `local-wrapper-drift`
- `shared-library-gap`

## Review Heuristics

- Do not treat every `className` as wrong. Layout and composition classes can stay.
- If an existing prop solves the problem, use it before touching tokens.
- If semantic, typography, or spacing mapping solves it, do not keep a component-specific override.
- A one-off app quirk should stay app-local; only repeated, reusable gaps should be escalated into `libs/ui`.
- Prefer phased cleanup over a giant refactor that rewrites every usage at once.

## Output Shape

Return:

1. Findings first, ordered by severity, with file paths.
2. For each finding:
   - category
   - why it is wrong
   - smallest correct fix
3. A phased refactor plan:
   - phase 1: highest-value safe cleanup
   - phase 2: token structure cleanup
   - phase 3: possible shared-library gaps

Use `app-token-overrides` when the next step is mostly token cleanup. Use `component-usage-ux` when the next step is mostly choosing the right component or props. Use `component-authoring` only when the audit proves a repeated shared-library gap.
