---
name: skeleton-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Skeleton for
  loading placeholders using Root, Circle, Text, and Rectangle compound parts
  with token-backed variants, sizes, and animation speeds.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/atoms/skeleton.tsx"
  - "libs/ui/src/tokens/components/atoms/_skeleton.css"
  - "libs/ui/stories/atoms/skeleton.stories.tsx"
  - "libs/ui/src/atoms/figma/skeleton.figma.tsx"
---

# @techsio/ui-kit Skeleton Usage

Use Skeleton for loading placeholders that preserve the final layout shape.

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
