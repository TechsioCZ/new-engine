---
name: adopting-ui-kit-in-apps/app-component-inventory
description: Map a concrete app component need, Figma node, or design handoff onto existing @techsio/ui-kit components, variants, themes, sizes, and props before implementation. Use when the user says they need a specific component in the app, wants a Figma component composed correctly according to app rules, needs the preferred JSX usage for a design element, or needs to know whether the remaining differences belong in app tokens or a shared-library gap.
---

# App Component Inventory

Build an app-scoped inventory, not a library-wide catalog. Start from the concrete component the app needs now, map it onto existing `libs/ui` components first, write the clean prop-only usage shape, and send purely visual differences to `app-token-overrides`.

## Read First

Read only the files needed for the current component or app surface:

- `package.json` for exports and package intent
- `stories/overview/component-comparison.stories.tsx` for a fast library scan
- relevant files under `src/atoms/`, `src/molecules/`, `src/organisms/`, and `src/templates/`
- matching `stories/**/*.stories.tsx` for the candidate components

## Workflow

1. Identify the concrete app component need from the design, Figma node, or requirements.
2. Scope the review to the current component or tightly-related surface. Do not spec the whole app or every variant the library offers.
3. Map the requested design element to an existing component before proposing anything new.
4. Read the relevant `tsx` and story files for the candidate component.
5. For each mapped component, capture:
   - component path
   - variant, theme, size, and important props
   - required states
   - preferred JSX usage
   - whether the difference is solved by app tokens
6. Write the preferred JSX usage in the cleanest prop-only form the component already supports.
7. If the design difference is visual only, route it to `app-token-overrides`.
8. If the component almost fits, inspect existing props and supported composition before suggesting inline `className`.
9. Suggest a new shared component only when the pattern is likely to repeat across multiple apps and is best expressed as a reusable composition of existing primitives.

## Preferred Usage Shape

Treat the chosen component's prop-only JSX as the default correct target shape.

Start with the cleanest form:

- `<Badge variant="discount">Akcia</Badge>`
- `<Badge variant="success">Novinka</Badge>`
- `<Badge variant="warning">Tip</Badge>`
- `<Badge variant="tertiary">Fitness</Badge>`
- `<Badge variant="discount" size="lg">-4,50 EUR</Badge>`

Do not add appearance `className` unless you have already confirmed that the prop-only form plus the token chain still cannot match the design.

## Decision Rules

- Choose by semantics and interaction first, not by screenshot similarity.
- Existing component plus existing props beats a new component.
- Preferred prop-only usage beats appearance `className`.
- App token work beats JSX appearance tweaks.
- Inline `className` for appearance is a smell; it usually means you skipped props or app token mapping.
- A new shared component should solve a repeatable higher-order pattern, usually at organism or template level.

## Output Shape

Return a compact inventory table with one row per app need:

| App surface | Recommended component | Required API | Preferred JSX usage | Token work | Notes |
| --- | --- | --- | --- | --- | --- |

Fill `Required API` with the chosen variant, theme, size, and props. Fill `Preferred JSX usage` with the clean prop-only JSX target. Fill `Token work` with `none`, `semantic`, `typography`, `spacing`, or a component-specific override.

If the user asked for a single component rather than a whole surface, return one focused row plus:

1. `Chosen component`
2. `Preferred JSX usage`
3. `Token work`
4. `Notes`
5. `Possible API gaps`

## Hand-offs

- Use `component-usage-ux` when the hard part is choosing the right component or supported props.
- Use `app-token-overrides` when the component is correct but the visual output must match the app design.
- Escalate to `component-authoring` only when the app exposes a repeatable shared-library gap.
