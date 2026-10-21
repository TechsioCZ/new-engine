---
name: image-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Image or a
  framework image adapter such as NextImage through the Image atom's as prop.
metadata:
  component_version: "1.2.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux framework-consumer-integration app-token-overrides ux-guidelines"
  sources: "libs/ui/src/atoms/image.tsx libs/ui/src/tokens/components/atoms/_image.css libs/ui/stories/atoms/image.stories.tsx libs/ui/src/atoms/image.figma.ts"
---

# @techsio/ui-kit Image Usage

Use Image when the UI-kit or a molecule needs a framework-agnostic image slot.
In Next apps, prefer NextImage through `as` when the app needs framework image
optimization.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Image`.

**Use it when**

- Framework-agnostic image slots in kit molecules/templates; `as={NextImage}` in Next apps.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Several product images | Gallery |
| Decorative symbols | Icon |

**Do**

- Always reserve space (width/height or aspect ratio) to avoid layout shift.
- Write alt text for meaningful images; `alt=""` for decorative ones.
- Lazy-load below-the-fold images; prioritise the hero/LCP image.
- Provide a neutral placeholder for missing images, not a broken icon.

**Don't**

- Put text that matters inside images.
- Stretch images — use cover/contain deliberately.

**Copy and states**

- Alt text describes content and purpose (`Linen shirt in navy`), not `image` or file names.

## Setup

```tsx
import NextImage from "next/image"
import { Image } from "@techsio/ui-kit/atoms/image"

<Image as={NextImage} src="/product.jpg" alt="Ceramic bowl" width={960} height={640} size="full" />
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
  width={960}
  height={640}
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

### Aspect, fit, and shape

Image renders as a block, stays within its container, and uses `object-cover`
by default so fixed square slots crop rather than stretch. `full` keeps the
source aspect ratio unless the consumer deliberately constrains the slot.
Use `size="custom"` with token utilities when the layout owns the aspect ratio:

```tsx
<Image src={product.image} alt={product.title} size="custom"
  className="w-full aspect-video rounded-lg object-contain" />
```

Use `object-cover` for an immersive crop and `object-contain` when the complete
product must remain visible. `rounded-none`, `rounded-lg`, and `rounded-full`
control shape. Width/height reserve intrinsic space and are forwarded through
`as`; framework adapters must forward `className`, `src`, `alt`, and sizing props.
NextImage also requires its own width/height or fill contract; the UI-kit size
prop alone does not satisfy it. The Storybook adapter is a dependency-free
stand-in, not a claim that Next.js optimization runs in Storybook.

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

## Opt-in resilient media

`Image` remains an unwrapped native/adapter primitive. Use `ImageWithFallback`
from the same `@techsio/ui-kit/atoms/image` subpath for a reusable neutral media
box with missing-source and failed-request handling. It keeps the actual image
mounted (and its ref pointing to that image), hides broken-image paint, and
shows one decorative missing-image glyph. Meaning comes from the original alt,
not clipped text in a small thumbnail. `fallbackLabel` can supply a complete
localized accessible description such as "Ceramic bowl — photo unavailable";
`alt=""` keeps the fallback decorative. Positive numeric `width` and `height`
reserve the media box before an adapter supplies its source, including inside
shrink-to-fit layouts. An inert, accessibility-hidden SVG supplies intrinsic
sizing, not image content; the actual image remains mounted over it. The box
uses the supplied dimensions' aspect ratio by default; an `aspect-*` class can
override it without changing the reserved width. Fixed sm/md/lg slots stay
square. With dimensions omitted (for example, a fill adapter), the parent must
provide a definite width and height or aspect ratio. The extra relative span is
opt-in, never silently added by Image.

```tsx
import { ImageWithFallback } from "@techsio/ui-kit/atoms/image"

<ImageWithFallback src={product.image ?? ""} alt={product.title}
  fallbackLabel={`${product.title} — photo unavailable`}
  width={960} height={640} className="aspect-video" />
```

`as={NextImage}` (or another adapter) must forward native image `onLoad` and
`onError` events, className, alt, and dimensions/fill to the real image. Both
consumer event callbacks still run. A source/srcSet change remounts the request
state, clearing prior failures without retry loops or remote fallback URLs.
The adapter's own ref type is preserved; the wrapper does not manufacture ref
support for ref-less adapters. The media box owns fallback paint; the consumer
owns application error reporting and retries.

Commerce adapters must use this same composition for **every** entry point:
`ProductCard.Image as`, Gallery full media, `thumbnailImageAs` and per-thumbnail
`imageAs`. For thumbnails, keep the button's descriptive accessible name and
use a decorative `alt=""` fallback rather than long visible text. Do not bypass
the resilient composition by passing a bare framework image component.
