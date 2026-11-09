<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/image--2774-13220.md, edited. Storybook: Atoms/Image → UX guidelines. -->

# Image: UX guidelines

An Image shows a picture of a specific object that helps the user recognise it
or understand the content next to it. It adds no gallery, zoom, upload or
navigation.

## When to use

- A product, person or object picture in a card, row, header or detail.
- A framework-agnostic image slot in kit components (`as={NextImage}` in
  Next apps).

## Use something else when

| Need | Use instead |
| --- | --- |
| Several views of the same object | `Gallery` |
| A browsable sequence of slides | `Carousel` |
| A symbol or status glyph | `Icon` |
| Uploading or editing an image | `FileUpload` |

## Anatomy

One image with a size suited to its place, plus the text context that names
the object. `ImageWithFallback` (same import path) adds a reserved media box
and a neutral placeholder when the source is missing or fails.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Fixed square slots for avatars and thumbnails. Never shrinks below recognisability. |
| `size=full` | `size="full"` (default) | Full width of the container, keeping the source aspect ratio. Not a responsive breakpoint. |
| — | `size="custom"` | The parent or token overrides own the dimensions. |
| — | `ImageWithFallback` failed state | Missing or failed source: neutral glyph over a reserved box, labelled by `alt` or `fallbackLabel`. |

Image is display-only: no disabled, read-only or interactive states.

## Behaviour

**May:** show the same object as the text next to it; keep the object
recognisable by text when the picture can't load.

**Must not:** add navigation, zoom or upload by itself; replace a missing
image with a picture of a different object without saying so.

- Reserve space with `width` / `height` or an aspect ratio so the page doesn't
  jump while loading.
- Choose the crop deliberately: `object-cover` for an immersive crop,
  `object-contain` when the whole product must stay visible. The crop never
  removes what identifies the object.
- A clickable image needs its own named, keyboard-reachable host (a link or a
  button around it, or the card's name link).
- Lazy-load below the fold; prioritise the hero or LCP image.

## Content and copy

- `alt` follows the image's purpose in this place, not the file name:
  `Linen shirt in navy` — cs: `Lněná košile v námořnické modré`.
- Decorative images use `alt=""` and don't repeat a long description next to
  them.
- `fallbackLabel` says what the image was meant to show: `Ceramic bowl — photo unavailable` — cs: `Keramická miska — fotografie není k dispozici`.
- Text that matters is never only inside the image.

## Accessibility

- Meaningful images have alt text; decorative ones are hidden with `alt=""`.
- When the image fails, the object stays identifiable from its alt or the
  surrounding text.
- Image adds no focus stop.

## Edge cases

- **Missing variant photo**: neutral placeholder with the product name, never
  an unlabelled photo of another variant.
- **Missing avatar**: the contact stays readable and can't be mistaken for a
  colleague; use a neutral avatar, not someone else's photo.
- **Decorative banner**: `alt=""`, and no zoom affordance.

## Related

- [Gallery](../../gallery-usage/references/ux.md) and [Carousel](../../carousel-usage/references/ux.md): several images.
- [Accessibility](../../ux-guidelines/references/accessibility.md).
