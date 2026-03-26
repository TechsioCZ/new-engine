---
name: adopting-ui-kit-in-apps/app-component-inventory
description: Map a new app design, Figma handoff, or requirements list onto existing @techsio/ui-kit components, variants, themes, sizes, and props before implementation. Use when planning a new app surface, deciding whether a visual difference belongs in app tokens or shared library work, or evaluating whether a new higher-order shared component is justified.
---

# App Component Inventory

Build an app-scoped inventory, not a library-wide catalog. Start from what the app needs now, map it onto existing `libs/ui` components first, and send purely visual differences to `app-token-overrides`.

## Read First

Read only the files needed for the current app surface:

- `package.json` for exports and package intent
- `stories/overview/component-comparison.stories.tsx` for a fast library scan
- relevant files under `src/atoms/`, `src/molecules/`, `src/organisms/`, and `src/templates/`
- matching `stories/**/*.stories.tsx` for the candidate components

## Workflow

1. Identify the app surface from the design or requirements.
2. Inventory only the components the app will actually use. Do not spec every variant the library offers.
3. Map each design element to an existing component before proposing anything new.
4. For each mapped component, capture:
   - component path
   - variant, theme, size, and important props
   - required states
   - whether the difference is solved by app tokens
5. If the design difference is visual only, route it to `app-token-overrides`.
6. If the component almost fits, inspect existing props and supported composition before suggesting inline `className`.
7. Suggest a new shared component only when the pattern is likely to repeat across multiple apps and is best expressed as a reusable composition of existing primitives.

## Decision Rules

- Choose by semantics and interaction first, not by screenshot similarity.
- Existing component plus existing props beats a new component.
- App token work beats JSX appearance tweaks.
- Inline `className` for appearance is a smell; it usually means you skipped props or app token mapping.
- A new shared component should solve a repeatable higher-order pattern, usually at organism or template level.

## Output Shape

Return a compact inventory table with one row per app need:

| App surface | Recommended component | Required API | Token work | Notes |
| --- | --- | --- | --- | --- |

Fill `Required API` with the chosen variant, theme, size, and props. Fill `Token work` with `none`, `semantic`, `typography`, `spacing`, or a component-specific override.

## Hand-offs

- Use `component-usage-ux` when the hard part is choosing the right component or supported props.
- Use `app-token-overrides` when the component is correct but the visual output must match the app design.
- Escalate to `component-authoring` only when the app exposes a repeatable shared-library gap.
