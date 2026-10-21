---
name: component-authoring
description: >
  Use when creating or refactoring @techsio/ui-kit React components in libs/ui,
  including atoms, molecules, organisms, tv() variants, React 19 ref props,
  component token CSS, Storybook stories, package subpath exports, and Figma
  handoff reminders.
metadata:
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - tailwind-token-authoring
  - storybook-authoring
sources:
  - "libs/ui/AGENTS.md"
  - "libs/ui/README.md"
  - "libs/ui/src/atoms/button.tsx"
  - "libs/ui/src/molecules/carousel.tsx"
  - "libs/ui/src/organisms/header.tsx"
  - "libs/ui/src/tokens/components/components.css"
  - "libs/ui/stories/atoms/button.stories.tsx"
  - "https://github.com/TechsioCZ/new-engine/issues/295"
---

# @techsio/ui-kit Component Authoring

Use this for work inside `libs/ui`. For app-side usage, load
`component-usage-ux` instead.

## Setup

Minimum atom shape for new component code:

```tsx
import type { ButtonHTMLAttributes, Ref } from "react"
import type { VariantProps } from "tailwind-variants"
import { tv } from "../utils"

const actionVariants = tv({
  base: "inline-flex items-center justify-center rounded-action text-action-fg",
  variants: {
    variant: {
      primary: "bg-action-bg-primary",
      danger: "bg-action-bg-danger",
    },
    size: {
      sm: "h-action-sm p-action-sm text-action-sm",
      md: "h-action-md p-action-md text-action-md",
    },
  },
  defaultVariants: { variant: "primary", size: "md" },
})

type ActionProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof actionVariants> & {
    ref?: Ref<HTMLButtonElement>
  }

export function Action({ variant, size, className, ref, ...props }: ActionProps) {
  return (
    <button
      className={actionVariants({ variant, size, className })}
      ref={ref}
      {...props}
    />
  )
}
```

Use `type` for new props. Existing `interface` declarations are legacy unless
the task is a targeted cleanup.

## Core Patterns

### Create the whole component slice

```text
src/atoms/action.tsx
src/tokens/components/atoms/_action.css
src/tokens/components/components.css import
stories/atoms/action.stories.tsx
src/atoms/action-icon.figma.ts follow-up reminder when public
```

Do not add a TSX component without token CSS and Storybook coverage.

### Keep component classes component-specific

```tsx
const badgeVariants = tv({
  base: "rounded-badge bg-badge-bg text-badge-fg px-badge",
})
```

Component implementations use component tokens. Semantic tokens like
`bg-primary` are allowed in Storybook examples, not in component internals.

### Use public subpath imports

```tsx
import { Button } from "@techsio/ui-kit/atoms/button"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
```

The package has wildcard subpath exports. It does not expose a root barrel.

### Hand off Figma work, do not perform it

```text
Public component added or public props/visuals changed
-> mention figma-sync-handoff
-> that skill points to component-to-figma
```

Do not invoke Figma tools from component authoring unless the maintainer asks.

## Common Mistakes

### HIGH Component without tokens or story

Wrong:

```text
Only create src/atoms/banner.tsx.
```

Correct:

```text
Create TSX, component token CSS, components.css import, Storybook story, and
run the relevant validations.
```

The library treats component code, tokens, and stories as one component slice.

Source: libs/ui/AGENTS.md

### HIGH Semantic Tailwind in component internals

Wrong:

```tsx
const card = tv({ base: "bg-primary text-fg p-200" })
```

Correct:

```tsx
const card = tv({ base: "bg-card-bg text-card-fg p-card" })
```

Direct semantic tokens in component implementations bypass component-specific
token aliases and make app overrides harder.

Source: libs/ui/AGENTS.md

### HIGH React 19 ref regression

Wrong:

```tsx
export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  return <button ref={ref} {...props} />
})
```

Correct:

```tsx
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  ref?: Ref<HTMLButtonElement>
}

export function Button({ ref, ...props }: ButtonProps) {
  return <button ref={ref} {...props} />
}
```

New React 19 components in this library use `ref` as a prop.

Source: libs/ui/AGENTS.md

### MEDIUM New interface props

Wrong:

```tsx
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "danger"
}
```

Correct:

```tsx
export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: "success" | "danger"
}
```

The current codebase still has legacy interfaces, but new component work should
follow `AGENTS.md`.

Source: libs/ui/AGENTS.md

### MEDIUM Callback memoization by habit

Wrong:

```tsx
const onOpenChange = useCallback((details: { open: boolean }) => {
  setOpen(details.open)
}, [])
```

Correct:

```tsx
const onOpenChange = (details: { open: boolean }) => {
  setOpen(details.open)
}
```

Do not add `useCallback` by habit. Consumer apps are Next 16+ with React
Compiler; keep memoization for proven identity or performance needs only.

Source: libs/ui/skills/_artifacts/domain_map.yaml

## Validation Commands

```sh
bunx biome check --write libs/ui/src/atoms/action.tsx libs/ui/stories/atoms/action.stories.tsx
pnpm --dir libs/ui validate:tokens
bunx nx run ui:build
```

Add Storybook/a11y/component visual checks when visuals or interactions change.


## Shared component contracts (required)

The canonical requirements are in `libs/ui/docs/component-contracts.md`.

- Below-control messages use StatusText. Error/warning/success icons are on by
  default; never disable them for validation. Neutral helper text has no default
  icon. Give each message an ID; merge `aria-describedby` on the focusable part,
  add `aria-invalid` and `aria-errormessage` for errors, and remove stale IDs.
  Compound parts use `useDescribedBy`, `useRegisterDescription`, and
  `joinDescribedBy` from `src/internal/described-by.ts`.
- Every value-holding form control supports `readOnly`, including controlled
  and uncontrolled usage. Preserve focus, selection/copy, full-contrast text
  and visible focus. Set native `readOnly` or supported `aria-readonly`, plus
  `data-readonly` on the value surface. Gate all mutation handlers/machine paths.
- `form-control-base` includes `form-control-readonly`/`form-control-disabled`;
  otherwise opt into the readonly utility or alias component tokens to
  `--color-form-control-{bg,fg}-readonly`. Hide value-changing descendants with
  `data-readonly-affordance` or omit them. CSS is not behavior enforcement.
  No disabled cursor/dimming, no pointer-events:none on readonly text. Disabled
  wins when both states apply and must remove all tab stops.
- Interactive size variants are sm/md/lg, default md; preserve existing xs/current
  compatibility escapes without teaching them as canonical. Use
  `h-form-control-sm/md/lg` for single-line heights, `popup-size-sm/md/lg` for
  option rows. Icon/Badge/Label and content-width exceptions are documented in
  the contracts; do not shrink global typography to solve a dense UI.
- Floating list panels use `popup-surface-base`; rich panels alias their surface
  tokens to the opaque popup background/border/shadow. Apply `popup-layer` on
  Content and Positioner, preserving `--layer-index`, not hard-coded z-50.
- Do not use forwardRef or useCallback. Use type, not interface, for new props.
  For stories, follow storybook-authoring and the shared documentation contract.
