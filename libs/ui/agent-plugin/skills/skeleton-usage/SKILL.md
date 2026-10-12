---
name: skeleton-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Skeleton for
  loading placeholders using Root, Circle, Text, and Rectangle compound parts
  with token-backed variants, sizes, and animation speeds.
metadata:
  component_version: "1.0.2"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides ux-guidelines"
  sources: "libs/ui/src/atoms/skeleton.tsx libs/ui/src/tokens/components/atoms/_skeleton.css libs/ui/stories/atoms/skeleton.stories.tsx libs/ui/src/atoms/skeleton-rectangle.figma.ts"
---

# @techsio/ui-kit Skeleton Usage

Use Skeleton for loading placeholders that preserve the final layout shape.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Skeleton`.

**Use it when**

- Content that takes longer than ~300 ms to load, where the final layout is known (lists, cards, detail pages, charts).

**Use something else when**

| Need | Use instead |
| --- | --- |
| A button action in progress | Button `isLoading` + `loadingText` |
| Very short waits | nothing |
| Unknown layout / long job | progress text or a loading toast |

**Do**

- Mirror the real layout: same number of rows/columns, same heights and widths.
- Keep headers, navigation and actions real while their content loads.
- Replace the skeleton in place without layout shift.

**Don't**

- Show skeletons for errors or empty results.
- Animate aggressively; respect reduced motion.

**Copy and states**

- Announce loading once for assistive tech (`Loading orders`).

## Setup

```tsx
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"

<Skeleton isLoaded={Boolean(product)}>
  <Skeleton.Text noOfLines={2} />
</Skeleton>
```

Supported props:

```text
Skeleton: isLoaded, variant primary | secondary, speed slow | normal | fast
Skeleton.Circle: size sm | md | lg | xl
Skeleton.Text: noOfLines, size, lastLineWidth, containerClassName
Skeleton.Rectangle: variant, speed, isLoaded
```

## Core Patterns

### Mirror final content shape

```tsx
<Skeleton isLoaded={isLoaded}>
  <div className="flex items-center gap-100">
    <Skeleton.Circle size="md" />
    <Skeleton.Text noOfLines={2} size="sm" />
  </div>
</Skeleton>
```

Use Circle for avatars/icons, Text for lines, and Rectangle for media/cards.

### Use isLoaded to reveal children

```tsx
<Skeleton isLoaded={Boolean(product)}>
  {product ? <ProductSummary product={product} /> : <Skeleton.Text />}
</Skeleton>
```

The component returns children directly when loaded.

### Use layout className only for dimensions

```tsx
<Skeleton.Rectangle className="h-1000 w-full" />
```

Skeleton rectangle needs a box size from layout. Do not use className for
colors/radius/animation when props/tokens already cover those.

## Common Mistakes

### HIGH Custom loading divs

Wrong:

```tsx
<div className="h-4 animate-pulse rounded bg-gray-200" />
```

Correct:

```tsx
<Skeleton.Text noOfLines={1} />
```

Source: libs/ui/src/atoms/skeleton.tsx

### HIGH Inline skeleton colors

Wrong:

```tsx
<Skeleton.Text className="bg-gray-200 dark:bg-gray-800" />
```

Correct:

```tsx
<Skeleton.Text variant="secondary" />
```

Use `_skeleton.css` or app token overrides for color changes.

Source: libs/ui/src/tokens/components/atoms/_skeleton.css

### MEDIUM Wrong placeholder shape

Wrong:

```tsx
<Skeleton.Text noOfLines={5} />
```

for an avatar.

Correct:

```tsx
<Skeleton.Circle size="lg" />
```

Match the final layout.

### MEDIUM Unstable line count

Wrong:

```tsx
<Skeleton.Text noOfLines={items.length} />
```

Correct:

```tsx
<Skeleton.Text noOfLines={3} lastLineWidth="70%" />
```

Skeletons should keep predictable dimensions while loading.

## Validation Commands

```sh
rg -n "animate-pulse|bg-gray|skeleton" apps
rg -n "<Skeleton[^>]*className=.*(bg-|rounded-|animate-)" apps
rg -n "<Skeleton\\.Text[^>]*noOfLines=\\{.*\\.length" apps
rg -P -n "<Skeleton\\.Rectangle(?![^>]*className=)" apps
```
