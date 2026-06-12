---
name: gallery-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Gallery for
  product or media image galleries with Carousel integration, thumbnails,
  controlled page, orientation, thumbnail image adapters, thumbnail aria labels,
  empty state, and NextImage support.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - carousel-usage
  - framework-consumer-integration
  - app-token-overrides
sources:
  - "libs/ui/src/organisms/gallery.tsx"
  - "libs/ui/src/tokens/components/organisms/_gallery.css"
  - "libs/ui/stories/organisms/gallery.stories.tsx"
---

# @techsio/ui-kit Gallery Usage

Use Gallery for product or media galleries with thumbnails. Use Carousel
directly when thumbnails are not part of the UX.

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
