---
name: badge-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Badge for
  compact status, category, discount, or metadata labels without duplicating
  token-backed color and spacing classes in JSX.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/atoms/badge.tsx"
  - "libs/ui/src/tokens/components/atoms/_badge.css"
  - "libs/ui/stories/atoms/badge.stories.tsx"
  - "libs/ui/src/atoms/figma/badge.figma.tsx"
---

# @techsio/ui-kit Badge Usage

Use Badge for short non-interactive labels. It is not a button, link, alert, or
long message container.

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

