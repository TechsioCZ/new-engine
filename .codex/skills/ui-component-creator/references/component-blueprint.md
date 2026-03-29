# Component Blueprint

Use this blueprint when creating a new `libs/ui` component.

## Canonical File Set

Create or update all three files together:

1. `libs/ui/src/<layer>/<component>.tsx`
2. `libs/ui/src/tokens/components/<layer>/_<component>.css`
3. `libs/ui/stories/<layer>/<component>.stories.tsx`

Also update:

1. `libs/ui/src/tokens/components/components.css` (import new token file)
2. `libs/ui/src/types/zag.ts` (only if adding a new Zag machine package)

## TSX Patterns

Mirror existing components:

- `libs/ui/src/atoms/button.tsx`
- `libs/ui/src/molecules/accordion.tsx`
- `libs/ui/src/molecules/carousel.tsx`
- `libs/ui/src/molecules/combobox.tsx`
- `libs/ui/src/molecules/tree-view.tsx`

### Implementation Rules

1. Build styling via `tv` and token classes.
2. Keep interaction states as utility variants (`hover:*`, `active:*`, `data-*`).
3. Use UI-kit primitives for controls:
   - `Button` for actions/triggers
   - `Input`, `Label`, `StatusText`, `Icon` for form and icon composition
4. Avoid raw color utilities and literal colors in `.tsx`.
5. Keep sizing/spacing/radius tied to component token names.

### Zag.js Integration Rules

1. Import machine from `@zag-js/<machine>`.
2. Use `useMachine` and `normalizeProps`.
3. Create stable ids with `useId`.
4. Call `connect(service, normalizeProps)` and spread `api.get*Props()`.
5. Style with `data-part`, `data-state`, `data-disabled`, `data-highlighted`, etc.

## Token CSS Patterns

Mirror structure used in:

- `libs/ui/src/tokens/components/atoms/_button.css`
- `libs/ui/src/tokens/components/molecules/_accordion.css`
- `libs/ui/src/tokens/components/molecules/_carousel.css`
- `libs/ui/src/tokens/components/molecules/_combobox.css`
- `libs/ui/src/tokens/components/molecules/_tree-view.css`

### Required Section Order

1. `BASE COLOR MAPPING`
2. `DERIVED COLORS`
3. `STATE VARIATIONS`
4. `COMPONENT VARIANTS`
5. `VALIDATION STATES` (if relevant)
6. `DISABLED STATES`
7. `SPACING`
8. `TYPOGRAPHY`
9. `BORDERS & RADIUS`
10. `SHADOWS` (if relevant)
11. `FOCUS RINGS`

### Token Rules

1. Reference semantic tokens first (`--color-primary`, `--color-surface`, etc.).
2. Derive component tokens from references.
3. Use state math (`oklch(from ... calc(l + var(--state-hover)) c h)` and `--alpha(...)`) in CSS token files, not in TSX.
4. Keep naming explicit and unambiguous.
5. Add `@utility token-icon-<component>-<name>` for icon aliases.

## Story Patterns

Mirror structure used in:

- `libs/ui/stories/atoms/button.stories.tsx`
- `libs/ui/stories/molecules/accordion.stories.tsx`
- `libs/ui/stories/molecules/carousel.stories.tsx`
- `libs/ui/stories/molecules/combobox.stories.tsx`
- `libs/ui/stories/molecules/tree-view.stories.tsx`

### Story Rules

1. Use `Meta`/`StoryObj` with `tags: ['autodocs']`.
2. Keep `parameters.layout` explicit.
3. Provide `argTypes` and practical defaults in `args`.
4. Use semantic classes for visual wrappers (`bg-surface*`, `text-fg*`, `border-border*`, `bg-overlay`).
5. Prefer `VariantContainer` / `VariantGroup` for variant showcases.
6. Use UI-kit primitives for interactions in stories:
   - Use `Button` instead of native `<button>`.
   - Use existing atoms/molecules as supporting controls.

### Story Anti-Patterns

Avoid:

1. Native `<button>` in stories when `Button` works.
2. Raw palette classes (`bg-blue-500`, `text-green-700`) in demos.
3. Story-only styling that bypasses semantic token system.

## Validation Checklist

Run in `libs/ui`:

1. `pnpm lint:tailwind`
2. `pnpm validate:tokens`
3. `pnpm check:unused-tokens`

Then verify in Storybook:

1. Keyboard navigation works.
2. Focus ring states are visible.
3. Disabled, hover, active, selected states render via tokenized classes.
