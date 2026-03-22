# UI Library (`@libs/ui`)

React 19 + Tailwind v4 + Zag.js component library using atomic design.

NOTE: `libs/ui/AGENTS.md` is the canonical source of truth.
- `libs/ui/CLAUDE.md` is a symlink to this file.
- Edit only `AGENTS.md`.
- Windows: enable Developer Mode and set `git config core.symlinks true` so symlinks work.

## Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19 | UI framework (ref as prop, no forwardRef) |
| Tailwind CSS | 4 | Styling (@theme static, no config file) |
| Zag.js | latest | State machines for interactive components |
| tailwind-variants | latest | Component styling with tv() |
| Storybook | 10 | Documentation (CSF3, autodocs) |

## Structure (UI library)

src/
  atoms/            # Button, Input, Icon, Badge
  molecules/        # Dialog, Combobox, Toast
  tokens/
    components/atoms/      # _button.css, _input.css
    components/molecules/  # _dialog.css
    _semantic.css
  utils.ts
stories/
  atoms/            # button.stories.tsx
  molecules/        # dialog.stories.tsx

## Commands

- `bunx nx run ui:storybook`   # Component preview
- `bunx nx run ui:build`       # Build library
- `pnpm validate:tokens`       # Token validation
- `bunx biome check --write <file>`   # Lint-specific file (never ".")

## PR Descriptions (CLI)

When using `gh pr create` or `gh pr edit`, avoid escaped `\n` or backticks in double-quoted strings.
Use a heredoc or `--body-file` to preserve real newlines and avoid shell interpolation.

```sh
cat <<'EOF' > /tmp/pr-body.md
## Summary
- ...

## Testing
- Not run (docs-only)
EOF

gh pr edit <pr-number> --body-file /tmp/pr-body.md
```

## Critical Rules (Do not break these)

**NEVER:**
- `forwardRef` / `useCallback` for handlers (React 19 doesn't need them)
- `tailwind.config.*` (Tailwind v4 uses @theme)
- Arbitrary values (`bg-[#ff0000]`, `p-[1rem]`)
- Default exports or barrel files (`index.ts`) unless framework requires
- `interface` for type definitions (use `type`)
- Direct semantic tokens in component implementations (`bg-primary`, `text-fg`)

**ALWAYS:**
- Use `tv()` with component-specific token classes
- Use `@theme static` for tokens
- Use data attributes for state styling
- Keep tokens two-layered (reference -> derived)

## Tailwind v4 State Selectors (standard)

Tailwind v4 supports shorthand for boolean data attributes:
- `data-disabled:...`, `data-highlighted:...`, `data-selected:...`

For enumerated attributes, keep bracket syntax:
- `data-[state=open]:...`, `data-[validation=error]:...`, `data-[orientation=vertical]:...`

Use `has-` and `group-` variants when appropriate:
- `has-focus-visible:ring`, `group-hover:...`

## Component Development

### File Locations

- Atoms: `src/atoms/component-name.tsx`
- Molecules: `src/molecules/component-name.tsx`

### Simple Components (Atoms)

Use `tv()` for styling. No state machine needed.

```tsx
import type { ButtonHTMLAttributes, Ref } from 'react'
import type { VariantProps } from 'tailwind-variants'
import { tv } from '../utils'

const buttonVariants = tv({
  base: 'inline-flex items-center justify-center',
  variants: {
    variant: {
      primary: 'bg-button-bg-primary text-button-fg-primary',
      secondary: 'bg-button-bg-secondary text-button-fg-secondary',
    },
    size: {
      sm: 'h-button-sm px-button-sm text-button-sm',
      md: 'h-button-md px-button-md text-button-md',
    },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
})

type ButtonVariants = VariantProps<typeof buttonVariants>

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonVariants & { ref?: Ref<HTMLButtonElement> }

export function Button({ variant, size, className, ref, ...props }: ButtonProps) {
  return (
    <button ref={ref} className={buttonVariants({ variant, size, className })} {...props} />
  )
}
```

### Interactive Components (Zag.js)

Use Zag.js patterns (machine + connect). Style via data attributes.

```tsx
import * as accordion from '@zag-js/accordion'
import { normalizeProps, useMachine } from '@zag-js/react'
import { createContext, useContext, useId, type PropsWithChildren } from 'react'
import { tv } from '../utils'

const styles = tv({
  slots: {
    root: 'rounded-accordion bg-accordion-bg',
    trigger: 'data-disabled:cursor-not-allowed data-[state=open]:bg-accordion-bg-open',
  },
})

type AccordionApi = ReturnType<typeof accordion.connect>
const AccordionContext = createContext<AccordionApi | null>(null)

function useAccordionContext() {
  const ctx = useContext(AccordionContext)
  if (!ctx) throw new Error('Accordion components must be used within Accordion')
  return ctx
}

export function Accordion({ children }: PropsWithChildren) {
  const service = useMachine(accordion.machine, { id: useId() })
  const api = accordion.connect(service, normalizeProps)
  const { root } = styles()

  return (
    <AccordionContext.Provider value={api}>
      <div {...api.getRootProps()} className={root()}>{children}</div>
    </AccordionContext.Provider>
  )
}
```

### Compound Components (no object export)

Use `Component.Subcomponent = function ...`.

```tsx
export function Accordion(...) { ... }

Accordion.Item = function AccordionItem(...) { ... }
Accordion.Trigger = function AccordionTrigger(...) { ... }
```

## Tokens (.css)

### Two-layer tokens (required)

```css
@theme static {
  /* Reference layer */
  --color-button-primary: var(--color-primary);

  /* Derived layer */
  --color-button-bg-primary: var(--color-button-primary);
  --color-button-fg-primary: var(--color-primary-fg);
}
```

### Naming rules

- Reference layer may omit `-bg`/`-fg`/`-border` (e.g., `--color-button-primary`)
- Derived layer must use `-bg`, `-fg`, or `-border`
- No abbreviations in component names
- Border widths use `--border-width-<component>` (locked standard)

Common prefixes used in this repo:
- `--color-`, `--spacing-`, `--padding-`, `--gap-`, `--text-`, `--font-weight-`,
  `--radius-`, `--border-width-`, `--shadow-`, `--opacity-`

### Tokens in code

- Component code: use component-specific token classes only
- Storybook: semantic tokens are allowed for demonstration
- Brand/status text accents use `--color-<semantic>-fg` (e.g., `--color-primary-fg`, `--color-success-fg`)

## Storybook (.stories.tsx)

### Token & Component Usage (Stories)

- Use our components from `src/` instead of native HTML elements whenever possible.
  Example: prefer `<Button />` / `<Input />` over `<button>` / `<input>`.
- Use our token system (`_semantic.css`, `_layout.css`, `_spacing.css`, `tokens/`) in `className`.
  Avoid hardcoded Tailwind values like `bg-red-500 p-2 mt-3 gap-1`.
  Prefer semantic tokens like `bg-danger text-fg-reverse p-100 mt-150 gap-50`.
- Layout helpers are available via `--container`; use the matching width classes (e.g. `w-md`, `max-w-*`).

### Controls

Define controls only for props that change appearance or behavior in Storybook.
Avoid controls for `id`, `ref`, internal callbacks, or props with no visible effect.

### Story order (conditional)

Always include `Playground`. Include other stories only if the component supports them:
1. Playground
2. Variants (if variants exist)
3. Sizes (if sizes exist)
4. States (if disabled/invalid/loading exists)
5. Component-specific stories

Use `VariantContainer` and `VariantGroup` for visual matrices.
Use `fn()` from `storybook/test` for event handlers.

## Research

- Zag.js: check official docs before implementing interactive components.
- Optional deep-dive: clone Zag.js to `~/.local/share/zagjs` for local search.
