---
name: gallery-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Gallery for
  product or media image galleries with Carousel integration, thumbnails,
  controlled page, orientation, thumbnail image adapters, thumbnail aria labels,
  empty state, and NextImage support.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - carousel-usage
  - framework-consumer-integration
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/organisms/gallery.tsx"
  - "libs/ui/src/tokens/components/organisms/_gallery.css"
  - "libs/ui/stories/organisms/gallery.stories.tsx"
---

# @techsio/ui-kit Gallery Usage

Use Gallery for product or media galleries with thumbnails. Use Carousel
directly when thumbnails are not part of the UX.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Gallery`.

**Use it when**

- Product detail images with thumbnails, zoom/fullscreen and variant switching.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Banners or related items without thumbnails | Carousel |
| Single image | Image |
| Media management in admin | a media library grid |

**Do**

- Keep a fixed aspect ratio so the page doesn't jump between images.
- Give every image meaningful alt text (product, colour, angle); thumbnails can share the main alt.
- Switch the gallery when the user changes the colour variant.
- Support keyboard and swipe; show position (`2 / 6`).

**Don't**

- Auto-rotate product images.
- Hide the only view of a variant behind the 10th thumbnail.

**Copy and states**

- Alt text: `Linen shirt in navy, front`; controls `Previous image`, `Next image`.

## Setup

```tsx
import NextImage from "next/image"
import { Gallery } from "@techsio/ui-kit/organisms/gallery"

<Gallery
  items={items}
  thumbnailImageAs={NextImage}
  carouselProps={{ imageAs: NextImage, aspectRatio: "square", size: "full" }}
>
  <Gallery.Main><Gallery.Carousel /></Gallery.Main>
  <Gallery.Thumbnails />
</Gallery>
```

Supported props:

```text
items: GalleryItem[]
orientation: horizontal | vertical
value/defaultValue, onValueChange
showThumbnails, hideThumbnailsWhenSingle, thumbnailSize
thumbnailImageAs, getThumbnailAriaLabel, carouselProps, emptyState
parts: Main, Thumbnails, Thumbnail, Carousel, Slides
```

## Core Patterns

### Use Gallery for thumbnail UX

It coordinates active page state between thumbnails and Carousel.

### Use NextImage adapters in Next apps

Pass `thumbnailImageAs={NextImage}` and `carouselProps.imageAs`.

### Keep thumbnail labels meaningful

Override `getThumbnailAriaLabel` when "Show slide N" is not enough.

## Common Mistakes

### HIGH Custom thumbnail state

Wrong:

```tsx
<img src={items[active].src} />{items.map((item, i) => <button onClick={() => setActive(i)} />)}
```

Correct:

```tsx
<Gallery items={items}><Gallery.Main><Gallery.Carousel /></Gallery.Main><Gallery.Thumbnails /></Gallery>
```

Source: libs/ui/src/organisms/gallery.tsx

### HIGH Carousel used when thumbnails required

Wrong:

```tsx
<Carousel slideCount={items.length}><Carousel.Slides slides={items} /></Carousel>
```

Correct:

```tsx
<Gallery items={items}><Gallery.Carousel /><Gallery.Thumbnails /></Gallery>
```

Source: libs/ui/src/organisms/gallery.tsx

### HIGH Inline thumbnail styling

Wrong:

```tsx
<Gallery.Thumbnail className="h-16 w-16 rounded border" />
```

Correct:

```tsx
<Gallery thumbnailSize={64}><Gallery.Thumbnails /></Gallery>
```

Source: libs/ui/src/tokens/components/organisms/_gallery.css

## Validation Commands

```sh
rg -n "setActive|setPage|<Gallery\\.Thumbnail[^>]*className=.*(h-|w-|rounded-|border-)" apps
rg -U -P -n "<Gallery(?![\\s\\S]{0,800}<Gallery\\.Thumbnails)" apps
rg -P -n "<Gallery(?![^>]*(thumbnailImageAs|carouselProps=\\{\\{[^}]*imageAs))" apps
```
