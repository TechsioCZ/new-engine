---
name: ui-component-creator
description: Create or update `libs/ui` components with matching `.tsx`, component-token `.css`, and `.stories.tsx` files. Use when adding/refactoring atoms, molecules, templates, or Zag.js-based components and you need consistent Tailwind token usage, semantic story styling, and internal component composition.
---

# UI Component Creator

Create components in `libs/ui` as a 3-file unit:
- implementation in `.tsx`
- tokens in component `.css`
- Storybook in `.stories.tsx`

Load detailed references as needed:
- `references/component-blueprint.md`
- `references/zagjs-doc-map.md`

## Run Workflow

1. Choose layer and slug.
- Use matching paths:
  - `libs/ui/src/atoms/<name>.tsx`
  - `libs/ui/src/molecules/<name>.tsx`
  - `libs/ui/src/organisms/<name>.tsx`
  - `libs/ui/src/templates/<name>.tsx`
  - `libs/ui/stories/<layer>/<name>.stories.tsx`
  - `libs/ui/src/tokens/components/<layer>/_<name>.css`
- Keep file slug kebab-case and exported component PascalCase.

2. Define token CSS first.
- Start with `@theme static`.
- Keep section order:
  - `BASE COLOR MAPPING`
  - `DERIVED COLORS`
  - `STATE VARIATIONS`
  - `COMPONENT VARIANTS`
  - `VALIDATION STATES` (if needed)
  - `DISABLED STATES`
  - `SPACING`
  - `TYPOGRAPHY`
  - `BORDERS & RADIUS`
  - `SHADOWS` (if needed)
  - `FOCUS RINGS`
- Map everything to semantic tokens from `libs/ui/src/tokens/_semantic.css`.
- Add icon utilities as `@utility token-icon-<component>-<name>` when icons are part of API.
- Add the token file import to `libs/ui/src/tokens/components/components.css`.

3. Build `.tsx` with token utilities only.
- Use `tv` from `libs/ui/src/utils.ts` for slots/variants/defaultVariants.
- Use token classes such as `bg-<component>-*`, `text-<component>-*`, `p-<component>-*`, `rounded-<component>-*`, `border-(length:--border-*)`.
- Avoid raw palette classes and literal color values in source (`bg-blue-*`, `text-red-*`, `#...`, `oklch(...)` inline in TSX).
- Compose existing UI primitives instead of native controls where available:
  - Use `Button` instead of raw `<button>` for actions/triggers.
  - Use `Input`, `Label`, `StatusText`, `Icon` from `libs/ui/src/atoms`.
- For Zag.js components:
  - Use `useMachine` + `normalizeProps`.
  - Generate stable ids with `useId`.
  - Use `api.get*Props()` and `data-*` attributes for state-based styling.
  - Update `libs/ui/src/types/zag.ts` if adding a new Zag package type export.

4. Build consistent stories.
- Use `Meta` + `StoryObj` and `tags: ['autodocs']`.
- Set `parameters.layout` (usually `centered`).
- Define `argTypes` and baseline `args`.
- Use `VariantContainer` and `VariantGroup` from `libs/ui/.storybook/decorator` for variant matrices.
- Use semantic classes in examples (`bg-surface*`, `text-fg*`, `border-border*`, `bg-overlay`).
- Reuse UI-kit components in stories:
  - Use `Button` for interactive controls inside stories.
  - Prefer `libs/ui/src/...` components instead of native elements when equivalents exist.

5. Validate from `libs/ui`.
- `pnpm lint:tailwind`
- `pnpm validate:tokens`
- `pnpm check:unused-tokens`
- Smoke test in Storybook for keyboard/focus/interaction states.

## Tailwind Guidance

Use Tailwind v4 theme variable docs:
`https://tailwindcss.com/docs/theme`

## Definition of Done

- `.tsx`, component token `.css`, and `.stories.tsx` are present and coherent.
- Token file is imported in `libs/ui/src/tokens/components/components.css`.
- Story styling uses semantic tokens and internal UI primitives.
- Validation commands pass.
