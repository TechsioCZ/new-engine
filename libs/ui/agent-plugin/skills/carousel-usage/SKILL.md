---
name: carousel-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Carousel for
  Zag.js-backed slides, images, controls, indicators, autoplay, sizing, aspect
  ratio, object fit, and framework image adapters.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - framework-consumer-integration
  - zag-compound-components
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/carousel.tsx"
  - "libs/ui/src/tokens/components/molecules/_carousel.css"
  - "libs/ui/stories/molecules/carousel.stories.tsx"
  - "libs/ui/src/molecules/figma/carousel.figma.tsx"
  - "https://zagjs.com/components/react/carousel"
---

# @techsio/ui-kit Carousel Usage

Use Carousel for slide-based browsing. Use Gallery for product image galleries
with thumbnails.

## Setup

```tsx
import NextImage from "next/image"
import { Carousel } from "@techsio/ui-kit/molecules/carousel"

<Carousel slideCount={slides.length} size="full" aspectRatio="landscape">
  <Carousel.Slides slides={slides} imageAs={NextImage} />
  <Carousel.Control><Carousel.Previous /><Carousel.Indicators /><Carousel.Next /></Carousel.Control>
</Carousel>
```

Supported root props:

```text
size: sm | md | lg | full
aspectRatio: square | landscape | portrait | wide | none
objectFit: cover | contain | fill | none
controlPosition: top | bottom | side | unset on Carousel.Control
orientation, loop, autoplay, allowMouseDrag, slidesPerPage, slidesPerMove
```

## Core Patterns

### Use slides data or explicit slides

`Carousel.Slides` accepts `{ id, content, src, alt, imageProps }[]`. In Next
apps pass `imageAs={NextImage}` when rendering images.

### Keep controls as Carousel parts

Use `Carousel.Previous`, `Carousel.Next`, `Carousel.Indicators`, and
`Carousel.Autoplay` so Zag props and disabled states stay wired.

### Use Gallery for thumbnail product media

If the UX includes selectable thumbnails, start with `gallery-usage`, which
wraps Carousel correctly.

## Common Mistakes

### HIGH Custom slider state

Wrong:

```tsx
<button onClick={prev}>Prev</button>{slides[index]}
```

Correct:

```tsx
<Carousel slideCount={slides.length}><Carousel.Slides slides={slides} /></Carousel>
```

Source: libs/ui/src/molecules/carousel.tsx

### HIGH Missing slideCount

Wrong:

```tsx
<Carousel><Carousel.Slides slides={slides} /></Carousel>
```

Correct:

```tsx
<Carousel slideCount={slides.length}><Carousel.Slides slides={slides} /></Carousel>
```

Source: https://zagjs.com/components/react/carousel

### HIGH Inline image/object-fit styling

Wrong:

```tsx
<Carousel.Slide className="aspect-video"><img className="object-cover" /></Carousel.Slide>
```

Correct:

```tsx
<Carousel aspectRatio="landscape" objectFit="cover" />
```

Source: libs/ui/src/tokens/components/molecules/_carousel.css

## Validation Commands

```sh
rg -P -n "setSlide|setIndex|<img\\b|<Carousel(?![^>]*slideCount=)" apps
rg -n "<Carousel[^>]*className=.*(aspect-|object-|w-|h-|rounded-|overflow-)" apps
rg -P -n "<Carousel\\.Slides(?![^>]*(imageAs|slides=))" apps
```
