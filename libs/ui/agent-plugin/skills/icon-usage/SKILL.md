---
name: icon-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Icon tokens or
  Iconify classes with the library's supported size and semantic color props.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/atoms/icon.tsx"
  - "libs/ui/src/tokens/components/atoms/_icon.css"
  - "libs/ui/stories/atoms/icon.stories.tsx"
  - "libs/ui/src/atoms/figma/icon.figma.tsx"
---

# @techsio/ui-kit Icon Usage

Use Icon for decorative or component-adjacent icons. The Icon atom renders
`aria-hidden`, so it must not be the only accessible content for an action.

## Setup

```tsx
import { Icon } from "@techsio/ui-kit/atoms/icon"

<Icon icon="token-icon-status-text-success" size="md" color="success" />
```

Supported props:

```text
icon: token-icon-${string} | icon-[${string}]
size: current | xs | sm | md | lg | xl | 2xl
color: current | primary | secondary | danger | success | warning
```

## Core Patterns

### Prefer token icons for UI-kit semantics

```tsx
<Icon icon="token-icon-status-text-warning" color="warning" />
```

Use `icon-[...]` for specific Iconify icons only when there is no token icon
for that component state.

### Match icon size to component size

```tsx
<Button icon="token-icon-button-add" iconSize="sm">
  Add
</Button>
```

When a component has an `icon` prop, use that prop instead of placing a
separate Icon next to text.

### Provide accessible text outside Icon

```tsx
<Button aria-label="Search" icon="icon-[mdi--magnify]" />
```

Icon itself is decorative. The parent action or surrounding text carries the
accessible name.

## Common Mistakes

### HIGH Inline SVG instead of token/icon class

Wrong:

```tsx
<svg className="h-4 w-4 text-green-600" />
```

Correct:

```tsx
<Icon icon="token-icon-status-text-success" size="sm" color="success" />
```

Source: libs/ui/src/atoms/icon.tsx

### HIGH Icon-only button without accessible name

Wrong:

```tsx
<Button icon="icon-[mdi--trash-can-outline]" />
```

Correct:

```tsx
<Button aria-label="Delete" icon="icon-[mdi--trash-can-outline]" />
```

The icon is `aria-hidden`.

Source: libs/ui/src/atoms/icon.tsx

### MEDIUM Arbitrary color class

Wrong:

```tsx
<Icon icon="icon-[mdi--alert]" className="text-red-500" />
```

Correct:

```tsx
<Icon icon="token-icon-status-text-error" color="danger" />
```

Change component or semantic tokens when the app needs different color mapping.

### MEDIUM Separate Icon beside Button text

Wrong:

```tsx
<Button>
  <Icon icon="icon-[mdi--plus]" />
  Add
</Button>
```

Correct:

```tsx
<Button icon="icon-[mdi--plus]">Add</Button>
```

Use component icon props when they exist.

## Validation Commands

```sh
rg -n "<svg|<Icon[^>]*className=.*(text-|size-|h-|w-)" apps
rg -n "<Button[^>]*>\\s*<Icon" apps
rg -P -n "<Button(?![^>]*aria-label)[^>]*icon=" apps
rg -P -n "icon=\"(?!token-icon-|icon-\\[)" apps
```
