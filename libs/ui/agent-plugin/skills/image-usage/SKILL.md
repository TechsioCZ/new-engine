---
name: image-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Image or a
  framework image adapter such as NextImage through the Image atom's as prop.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - framework-consumer-integration
  - app-token-overrides
sources:
  - "libs/ui/src/atoms/image.tsx"
  - "libs/ui/src/tokens/components/atoms/_image.css"
  - "libs/ui/stories/atoms/image.stories.tsx"
  - "libs/ui/src/atoms/figma/image.figma.tsx"
---

# @techsio/ui-kit Image Usage

Use Image when the UI-kit or a molecule needs a framework-agnostic image slot.
In Next apps, prefer NextImage through `as` when the app needs framework image
optimization.

## Setup

```tsx
import NextImage from "next/image"
import { Image } from "@techsio/ui-kit/atoms/image"

<Image as={NextImage} src="/product.jpg" alt="Ceramic bowl" size="full" />
```

Supported props:

```text
as: component accepting src and alt
src: string
alt: string
size: sm | md | lg | full | custom
```

## Core Patterns

### Use NextImage adapter in Next apps

```tsx
<Image
  as={NextImage}
  src={product.image}
  alt={product.title}
  size="full"
/>
```

The UI-kit Image is intentionally framework agnostic. Let the app framework
provide image behavior when available.

### Use size prop before layout className

```tsx
<Image src={avatarUrl} alt={name} size="sm" />
```

Use `size="custom"` only when layout constraints must come from the parent or
component token overrides.

### Keep alt text meaningful

```tsx
<Image src={product.image} alt={product.title} />
```

Empty alt is only for decorative images, and that should be a deliberate
accessibility choice.

## Common Mistakes

### HIGH Raw img in app UI

Wrong:

```tsx
<img src={product.image} alt={product.title} className="rounded-lg" />
```

Correct:

```tsx
<Image as={NextImage} src={product.image} alt={product.title} size="full" />
```

Source: libs/ui/src/atoms/image.tsx

### HIGH Styling the component shape inline

Wrong:

```tsx
<Image src="/avatar.jpg" alt="Avatar" className="h-10 w-10 rounded-full" />
```

Correct:

```tsx
<Image src="/avatar.jpg" alt="Avatar" size="sm" />
```

Use Image size/tokens first. Use layout classes only around the component when
the image is part of a larger layout.

Source: libs/ui/src/tokens/components/atoms/_image.css

### MEDIUM Next app without framework adapter

Wrong:

```tsx
<Image src="/hero.jpg" alt="Hero" />
```

Correct:

```tsx
<Image as={NextImage} src="/hero.jpg" alt="Hero" size="full" />
```

In Next apps, default to NextImage unless the image is intentionally plain.

### MEDIUM Missing useful alt

Wrong:

```tsx
<Image src={product.image} alt="" />
```

Correct:

```tsx
<Image src={product.image} alt={product.title} />
```

## Validation Commands

```sh
rg -n "<img\\b|<Image[^>]*className=.*(rounded-|h-|w-|object-)" apps
rg -P -n "<Image(?![^>]*alt=)" apps
rg -P -n "<Image(?![^>]*as=\\{?NextImage)" apps
rg -n "from \"next/image\"|from '@techsio/ui-kit/atoms/image'" apps
```
