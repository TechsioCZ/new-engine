---
name: carousel-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Carousel for
  Zag.js-backed slides, images, controls, indicators, autoplay, sizing, aspect
  ratio, object fit, and framework image adapters.
metadata:
  component_version: "1.2.1"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - framework-consumer-integration
  - zag-compound-components
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/molecules/carousel.tsx"
  - "libs/ui/src/tokens/components/molecules/_carousel.css"
  - "libs/ui/stories/molecules/carousel.stories.tsx"
  - "libs/ui/src/molecules/carousel.figma.ts"
  - "https://zagjs.com/components/react/carousel"
---

# @techsio/ui-kit Carousel Usage

Use Carousel for slide-based browsing. Use Gallery for product image galleries
with thumbnails.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Carousel`.

**Use it when**

- Horizontally browsable sets of equal items: related products, banners, testimonials.
- Content where only part needs to be visible and the rest is optional.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Product images with thumbnails and zoom | Gallery |
| Content every user must see (key offer, required info) | a static layout — most users never swipe |
| Navigating between steps | Steps |
| A long list of results | a grid with Pagination |

**Do**

- Show a partial next item or visible controls so users know there is more.
- Provide previous/next controls and indicators with accessible labels; keep swipe as an addition, not the only way.
- Stop any auto-rotation on hover, focus and with `prefers-reduced-motion`; offer pause.
- Keep slides the same height to avoid layout shift.

**Don't**

- Auto-rotate promotional banners faster than users can read (or at all, if the content has actions).
- Put critical CTAs only on slide 3+.
- Nest carousels or put a carousel inside a horizontally scrolling area.

**Copy and states**

- Controls labelled `Previous slide` / `Next slide`; indicators `Go to slide 2 of 5`.
- Prev / next / autoplay are `ActionIcon`s sized from the carousel `size` (`sm` → 24 px, `md` → 32 px, `lg` / `full` → 40 px). Don't restyle them with `Button` classes.
- Give every carousel an `aria-label` ("Product photos") — several unnamed carousels on one page are indistinguishable regions.
- Off-screen slides are `inert`; never rely on focusing content inside a hidden slide.
- `Carousel.Indicator` is a 24 px target with an 8 px dot inside (`--size-carousel-indicator`, `--size-carousel-indicator-dot`). Passing `children` replaces the dot (e.g. numbered indicators); keep the button at least 24 px.

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
