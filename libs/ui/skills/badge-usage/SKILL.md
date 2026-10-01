---
name: badge-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Badge for
  compact status, category, discount, or metadata labels without duplicating
  token-backed color and spacing classes in JSX.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/atoms/badge.tsx"
  - "libs/ui/src/tokens/components/atoms/_badge.css"
  - "libs/ui/stories/atoms/badge.stories.tsx"
  - "libs/ui/src/atoms/badge.figma.ts"
---

# @techsio/ui-kit Badge Usage

Use Badge for short non-interactive labels. It is not a button, link, alert, or
long message container.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Badge`.

**Use it when**

- Short, non-interactive labels of state or category: `Draft`, `Paid`, `New`, `−20 %`.
- Counts next to navigation items or tabs (unread, pending).
- Product flags on cards (discount, new, out of stock).

**Use something else when**

| Need | Use instead |
| --- | --- |
| A sentence explaining something | StatusText |
| Something the user can click or remove | Button / ActionIcon (removable filter chips live in the filter UI) |
| A page-level alert | inline StatusText section at the top of the content |
| Confirming an action | Toast |

**Do**

- Use one word, two at most; map each state to one variant app-wide (see the status table in ux-guidelines/ux-writing).
- Pair colour with the word — the text carries the meaning, colour only supports it.
- Place status badges next to the title they describe (page header meta, first table column or a Status column).
- Use `discount` only for price reductions, `danger` only for failed/blocked states.

**Don't**

- Mix synonyms (`Live`, `Active`, `Enabled`) for one state.
- Use a badge as a button or link.
- Stack more than two badges on one item — prioritise.
- Show a `0` count badge; hide it until there is something to count.

**Copy and states**

- Sentence case, no punctuation; counts formatted with `Intl.NumberFormat` (`1,204`), capped (`99+`) in navigation.
- Give count badges context for screen readers (`3 unread messages`).

## Setup

```tsx
import { Badge } from "@techsio/ui-kit/atoms/badge"

<Badge variant="success" size="md">
  Published
</Badge>
```

Supported props from `src/atoms/badge.tsx`:

```text
variant: primary | secondary | tertiary | discount | info | success | warning | danger | outline | dynamic
size: sm | md | lg | xl
children: string
dynamic: requires bgColor, fgColor, and borderColor
```

## Core Patterns

### Match the UX role to variant

```text
success -> completed, published, available
warning -> needs attention, low stock, pending risk
danger -> failed, destructive status, critical problem
info -> neutral informational state
discount -> price/promotion label
outline -> low-emphasis label
```

Do not use `danger` only because the design has red text. If the visual should
change globally, use `app-token-overrides`.

### Keep Badge text short

```tsx
<Badge variant="warning">Pending</Badge>
```

If the content needs a sentence or action, use `StatusText`, `Toast`, `Alert`
when available, or another molecule/organism usage skill.

### Treat dynamic as an explicit escape hatch

```tsx
<Badge
  variant="dynamic"
  bgColor="var(--color-brand-swatch-bg)"
  fgColor="var(--color-brand-swatch-fg)"
  borderColor="var(--color-brand-swatch-border)"
>
  Custom
</Badge>
```

Use `dynamic` only for values that cannot be represented by the standard
semantic/component token chain, such as runtime swatches. Prefer semantic
variants first.

## Common Mistakes

### HIGH Native span badge

Wrong:

```tsx
<span className="rounded bg-green-500 px-2 py-1 text-white">Active</span>
```

Correct:

```tsx
<Badge variant="success">Active</Badge>
```

Source: libs/ui/src/atoms/badge.tsx

### HIGH Inline color duplicate

Wrong:

```tsx
<Badge variant="danger" className="bg-danger text-fg-reverse">
  Failed
</Badge>
```

Correct:

```tsx
<Badge variant="danger">Failed</Badge>
```

The badge token classes already provide background, foreground, border,
padding, radius, and text sizing.

Source: libs/ui/src/tokens/components/atoms/_badge.css

### MEDIUM Dynamic variant without required colors

Wrong:

```tsx
<Badge variant="dynamic">Brand</Badge>
```

Correct:

```tsx
<Badge
  variant="dynamic"
  bgColor="var(--color-brand-badge-bg)"
  fgColor="var(--color-brand-badge-fg)"
  borderColor="var(--color-brand-badge-border)"
>
  Brand
</Badge>
```

`dynamic` requires explicit color props in the component source.

Source: libs/ui/src/atoms/badge.tsx

### MEDIUM Long actionable content

Wrong:

```tsx
<Badge variant="warning">Your profile needs attention, click here</Badge>
```

Correct:

```tsx
<StatusText status="warning" showIcon>
  Your profile needs attention.
</StatusText>
```

Badge is for compact labels, not messages or actions.

## Validation Commands

```sh
rg -n "<span[^>]*className=.*(badge|rounded|bg-|text-)" apps
rg -n "variant=\"(ghost|neutral|error)\"" apps
rg -n "<Badge[^>]*variant=\"dynamic\"" apps
rg -n "<Badge[^>]*className=.*(bg-|text-|border-|px-|py-|rounded-)" apps
```

