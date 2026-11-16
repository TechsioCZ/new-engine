<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/gallery--2774-38963.md, edited. Storybook: Organisms/Gallery → UX guidelines. -->

# Gallery: UX guidelines

A Gallery shows one main image and thumbnails for the other views of the same
object. The selected thumbnail and the main image always match.

## When to use

- Several views of one product or object (front, side, detail, colour
  variant) with a clear choice of the main image.

## Use something else when

| Need | Use instead |
| --- | --- |
| A single image | `Image` |
| A general sequence of content, banners or related products | `Carousel` |
| Several slides visible per page | `Carousel` (Gallery shows one image at a time) |
| Media management in an admin | a media library grid |

Gallery has no zoom, lightbox or fullscreen view. Don't promise one in copy
or icons; a zoom needs its own named control built by the app.

## Anatomy

`Gallery` (`items`, `orientation`, `value` / `defaultValue`) with
`Gallery.Main` holding `Gallery.Carousel` (the main image, with its own
previous / next controls), and `Gallery.Thumbnails` rendering one
`Gallery.Thumbnail` button per item. `emptyState` replaces everything when
there are no items.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `orientation=vertical` | `orientation="vertical"` (default) | Thumbnails in a column beside the main image on wider screens. Doesn't change the order. |
| `orientation=horizontal` | `orientation="horizontal"` | Thumbnails in a row under the main image. |
| — | `showThumbnails`, `hideThumbnailsWhenSingle` (default `true`) | One image needs no thumbnail rail. |
| — | `thumbnailSize` | Thumbnail size in pixels; a media dimension, not a control size. |
| active thumbnail | `aria-current="true"` on the thumbnail | Marks the image shown in the main area. |

## Behaviour

**May:** select a thumbnail and show the matching main image; browse with the
main image's previous / next controls, keyboard and swipe.

**Must not:** treat zoom, lightbox or a product change as built in; link one
variant's thumbnail to another variant's main image; auto-rotate product
images.

- Selecting a thumbnail updates the main image and the active marker together.
- When the user changes the colour variant, the app switches `items` (and
  usually resets `value`) so the gallery shows that variant.
- Every thumbnail stays reachable however many there are; the rail scrolls and
  keeps the active thumbnail in view without moving page focus.
- Viewing an image confirms nothing; it never stands in for a business action.

## Content and copy

- Each image's `alt` says what the view shows: `Linen shirt in navy, front` —
  cs: `Lněná košile, námořnická modrá, zepředu`.
- The default thumbnail name is `Show slide N` in English. Pass
  `getThumbnailAriaLabel` to name the view and the position in the user's
  language: cs: `Zobrazit obrázek 2 z 6: detail límce`.
- Name the main carousel when a page has more than one gallery.

## Accessibility

- Thumbnails are buttons with the active one marked by `aria-current`, not by
  brightness alone.
- Thumbnail images are hidden from screen readers; the button name carries the
  meaning.
- The main image's alt text is distinct per view, so a screen-reader user
  knows which view is shown.

## Edge cases

- **Missing image for a variant**: show a neutral placeholder, never a photo
  of a different variant without saying so.
- **Many thumbnails**: the last one is still reachable by scrolling and by
  keyboard; don't hide the only view of a variant at the end of the rail.
- **No images**: render `emptyState` with a placeholder, not an empty frame.

## Related

- [Carousel](../../carousel-usage/references/ux.md): the main image's controls and indicators.
- [Image](../../image-usage/references/ux.md): alt text and fallbacks.
- [Component selection](../../ux-guidelines/references/component-selection.md): Gallery vs Carousel.
