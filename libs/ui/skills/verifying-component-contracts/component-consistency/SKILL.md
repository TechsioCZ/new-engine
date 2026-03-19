---
name: verifying-component-contracts/component-consistency
description: Keep a `libs/ui` component aligned across `component.tsx`, `_component.css`, token bundle imports, and `*.stories.tsx`. Use when reviewing a component change, checking whether variants and states drifted between files, or verifying that Storybook still documents the actual supported contract.
---

# Component Consistency

Check the whole component contract, not just one file. In this library, a component is only consistent when the source, tokens, imports, and stories all still describe the same surface.

## Files To Compare

For the component under review, inspect:

- `src/{atoms|molecules|organisms|templates}/<component>.tsx`
- `src/tokens/components/**/_<component>.css`
- `src/tokens/components/components.css`
- `stories/**/<component>.stories.tsx`

Use `stories/overview/component-comparison.stories.tsx` when the component participates in library-wide visual comparison.

## Consistency Checklist

1. Confirm every supported variant, theme, size, slot, and state in `tsx` has matching token coverage.
2. Confirm every token class referenced in `tsx` is backed by the component token file.
3. Confirm a new token file is imported from `src/tokens/components/components.css`.
4. Confirm stories expose the visible API, not internal or no-op props.
5. Confirm stories use library components and library tokens instead of native elements and hardcoded Tailwind values where possible.
6. Confirm story order still makes sense:
   - `Playground`
   - `Variants` if applicable
   - `Sizes` if applicable
   - `States` if applicable
   - component-specific stories
7. Confirm documented usage matches the canonical composition pattern from the source component.

## Common Drift Patterns

- A variant is added in `tsx` but tokens or stories were not updated.
- Stories still demonstrate an old prop shape.
- A new token file exists but was not imported into the token bundle.
- Stories look correct only because they use native HTML or hardcoded utility classes instead of the real component path.

## Output Shape

Report drift by surface:

- source mismatch
- token mismatch
- import mismatch
- story mismatch

Prefer concrete findings with file paths over a general summary.
