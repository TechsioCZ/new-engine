# Frontend Demo

Next.js 16 + React 19 storefront on `http://localhost:3000`. Assume the dev server and UI Storybook are already running; do not ask to start them.

## Boundaries

- Check `libs/ui/src` and app components before creating a component.
- Consume explicit `@techsio/ui-kit/...` subpaths; do not use `@libs/ui`, package roots, or `dist`.
- Keep app-specific behavior here; promote genuinely shared behavior to its owning library.
- Keep server/client boundaries explicit and never edit `.next`, `out`, or generated category output directly.

## UI

- Use existing accessible UI-kit primitives before native controls.
- Follow the UI token grammar: primitive -> semantic -> component. No raw palette classes, arbitrary values, or inline one-off CSS values.
- Use React 19 ref-as-prop; do not add `forwardRef` or unnecessary callback memoization.
- Preserve semantics, keyboard behavior, visible focus, states, and ARIA relationships.
- Put visible Czech copy in locale resources with correct diacritics.

## Data and correctness

- External data starts as `unknown`; validate/narrow before use.
- Reuse `@techsio/std` before creating micro-helpers.
- Bound pagination, retries, polling, and batch work.
- Product forms use TanStack Form plus schema validation.

## Verification

From the repository root, run the narrowest relevant checks:

```sh
pnpm exec ultracite check <changed-paths> # advisory
pnpm exec tsc --noEmit -p scripts/typescript/projects/apps/frontend-demo/tsconfig.json
pnpm exec tsgo --noEmit -p scripts/typescript/projects/apps/frontend-demo/tsconfig.json
pnpm -C apps/frontend-demo build
```

For interactive changes, verify the affected flow in a browser and inspect console/network output.
