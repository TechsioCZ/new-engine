# UI Kit (`@techsio/ui-kit`)

React 19 + Tailwind 4 + Zag.js + Storybook 10 component library. This file is canonical; `CLAUDE.md` is its symlink.

## Component rules

- Consumers import explicit `@techsio/ui-kit/{atoms,molecules,organisms,templates}/...` subpaths.
- Use React 19 ref-as-prop, named exports, `type` aliases, and direct source imports. No `forwardRef`, unnecessary `useCallback`, default exports, or barrel files unless a framework requires them.
- Use existing accessible primitives before adding components.
- Interactive components use Zag compound patterns. Spread `api.get*Props()` before presentation overrides and compose handlers rather than replacing machine behavior.
- Preserve semantics, labels, keyboard behavior, focus visibility, states, and ARIA relationships.

## Tokens and styling

- Use `tv()` plus component-token classes. Component implementations do not consume raw semantic colors directly.
- Token layers are primitive/reference -> semantic -> component. Component tokens alias upper layers; no raw palette values or arbitrary Tailwind values.
- Use `@theme static`, explicit Figma scopes, real CSS variable syntax, and stable component/property/state naming.
- Stories use UI components where practical and semantic tokens only for demonstration/layout.

## Correctness

- External values are `unknown` until validated. No `any`, double casts, `@ts-ignore`, hidden baselines, or direct edits to `dist`/`storybook-static`.
- Reuse `@techsio/std` before adding framework-agnostic helpers.
- Add component tests/stories for supported variants, sizes, states, interactions, and accessibility.

## Verification

```sh
pnpm exec ultracite check <changed-paths> # advisory
pnpm exec tsc --noEmit -p scripts/typescript/projects/libs/ui/tsconfig.json
pnpm exec tsgo --noEmit -p scripts/typescript/projects/libs/ui/tsconfig.json
pnpm -C libs/ui validate:tokens
pnpm -C libs/ui test:components
pnpm -C libs/ui build
pnpm -C libs/ui build:storybook
```

Verify interactive changes in Storybook/browser with keyboard, focus, console, network, and light/dark checks.
