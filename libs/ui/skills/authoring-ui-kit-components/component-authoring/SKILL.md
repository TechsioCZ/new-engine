---
name: authoring-ui-kit-components/component-authoring
description: Create or update shared atoms, molecules, organisms, or templates inside `libs/ui` with `tv()`, component token CSS, Storybook coverage, canonical `type` aliases, and Zag-powered interaction where appropriate. Use when implementing a new shared component, extending an existing one, or replacing ad hoc styling with library-native patterns.
---

# Component Authoring

Author components the way this library already works. The default should be: inspect the closest existing `libs/ui` pattern, reuse it, and only widen the abstraction when the shared library genuinely needs it.

## Read First

Always read:

- `AGENTS.md`
- `src/utils.ts`
- the nearest existing component analogue in `src/`
- the analogue's token file in `src/tokens/components/`
- the analogue's story file in `stories/`
- `references/authoring-rules.md`

Read `references/zag-powered-patterns.md` whenever the component has machine-driven interaction, layered popups, keyboard navigation, selection state, or complex disclosure behavior.

## Workflow

1. Choose the correct layer: atom, molecule, organism, or template.
2. Decide whether the need belongs in `libs/ui` at all. Shared-library work should solve a repeatable pattern, not one app's one-off styling.
3. Read the closest existing pattern before writing code.
4. Implement or update the `tsx` file with:
   - `type`, not `interface`
   - `ref?: Ref<...>` instead of `forwardRef`
   - `tv()` classes only
   - component token classes, not direct semantic tokens
   - minimal comments
5. Implement or update the component token file with a two-layer token strategy.
6. If the component is interactive, prefer the established Zag.js machine plus connect plus context pattern used in this repo.
7. Add or update the Storybook file to demonstrate the supported API and canonical composition.
8. If you create a new token file, update `src/tokens/components/components.css`.
9. Validate with the narrowest useful commands, typically:
   - `bunx biome check --write <file>`
   - `pnpm validate:tokens`

## Design Rules

- Prefer existing props and composition over new flags.
- Prefer library components over native elements when composing stories or subcomponents.
- Do not hardcode default Tailwind utilities where a library token exists.
- Do not hide API gaps behind permanent inline `className`.
- Keep the implementation consistent with nearby files even when the current codebase still contains some older patterns; the canonical rule remains `type`.

## Outputs

When you finish, make sure the change includes all required surfaces:

- source `tsx`
- token CSS
- story file
- token import update if a new token file was added

Call out any remaining gaps explicitly instead of silently leaving ad hoc behavior in place.
