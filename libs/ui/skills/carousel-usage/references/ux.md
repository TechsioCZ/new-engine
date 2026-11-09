<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/carousel--2774-35761.md (+ part docs carouselslide, carouselcontrol, carouselindicators, carouselindicator and glyph docs token-icon-carousel-prev, -next), edited. Storybook: Molecules/Carousel → UX guidelines. -->

# Carousel: UX guidelines

A Carousel shows a finite sequence of related slides, one page at a time. The
user can see where they are and move to another slide. The main task never
depends on going through the sequence.

## When to use

- Horizontally browsable sets of equal items: related products, banners,
  testimonials.
- Content where only part needs to be visible and the rest is optional.

## Use something else when

| Need | Use instead |
| --- | --- |
| A main product image with thumbnails | `Gallery` |
| Items the user must compare side by side | a grid or list |
| Content every user must see (price, purchase conditions) | a static layout |
| An ordered process with confirmed steps | `Steps` |
| A long list of results | a grid with `Pagination` |

## Anatomy

`Carousel` (`slideCount`, `aria-label`) with `Carousel.Slides` (or explicit
`Carousel.Slide`s) and `Carousel.Control` holding `Carousel.Previous`,
`Carousel.Indicators` (one `Carousel.Indicator` per page, one current) and
`Carousel.Next`; `Carousel.Autoplay` whenever rotation is enabled.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Media dimension. Prev / next follow it on the ActionIcon scale (24 / 32 / 40 px). |
| `size=full` | `size="full"` | Fills the parent. Not an automatic responsive breakpoint. |
| CarouselControl `size=sm…lg` | follows the root `size` | No separate prop on `Carousel.Control`. |
| — | `controlPosition="top" \| "bottom" \| "side" \| "unset"` | Where the control rail sits; `bottom` is the default. |
| — | `controls="minimal"` | Two opaque arrows over the viewport ends; no indicators. |
| `Alignment=Left` / `Center` | no code prop | Layout of the Figma reference only. |
| CarouselSlide `objectFit=cover` | `objectFit="cover"` (default) | Fills the frame; the crop must keep the decisive content. |
| `objectFit=contain` | `objectFit="contain"` | Shows the whole image, with empty space if needed. |
| `objectFit=fill` / `none` | same values | Only when distortion or natural size doesn't hurt the information. |
| — | `aspectRatio="square" \| "landscape" \| "portrait" \| "wide" \| "none"` | Keeps slides the same height. |
| CarouselIndicator `state=active` | `aria-current="true"` | The slide actually shown, not the focused or hovered one. |
| — | `loop` (default `true`), `autoplay` (default `false`) | See Behaviour. |

## Behaviour

**May:** show the previous, next or a specific existing slide; update the
indicators with the slide.

**Must not:** force the user through a marketing sequence before the main
action; change the product, order or another control's selection.

- The slide, the current indicator and the arrows always agree.
- `loop` is on by default: past the last slide comes the first. With
  `loop={false}` the arrow at each end is disabled, so availability matches
  what is really possible. With one page both arrows are disabled.
- Autoplay is off by default. When enabled, always render `Carousel.Autoplay`
  so it can be stopped. Hover or focus stops rotation; reduced motion stops
  it from starting.
- Activating an indicator keeps focus on that indicator. When a slide that
  holds focus slides out, focus moves to the viewport, not to the page.
- Swipe and drag are extras; every slide is reachable with the buttons and
  the keyboard.

## Content and copy

- Name the carousel by its content: `Product photos`, `Related products` —
  cs: `Fotografie produktu`, `Související produkty`.
- Arrows by direction: `Previous slide`, `Next slide` — cs: `Předchozí snímek`, `Další snímek`. Localize through Zag `translations`.
- Indicators name the target and the real total, plus the slide's meaning
  when useful: `Go to slide 2 of 5: label detail` — cs: `Zobrazit snímek 2 z 5: detail štítku`. The default `Go to slide 2` has no total; pass
  `translations.indicator`.

## Accessibility

- Every arrow and indicator is a named button that works by keyboard and
  pointer. The visible 8 px dot sits inside a 24 px target; space indicators
  by the target, never by the dot.
- The current indicator is marked by `aria-current`, not by colour alone.
- Off-screen slides are `inert`; don't rely on focusing content inside them.
- Images in slides have alt text for their role; a clickable slide needs its
  own named control.

## Edge cases

- **End of the sequence vs failed image**: a disabled next arrow (no more
  slides) looks different from a slide whose image didn't load.
- **Key price or condition**: never only on one temporarily visible slide.
- **Changing slide count**: indicators follow the pages; keep slide `id`s
  stable so focus and position survive.

## Related

- [Gallery](../../gallery-usage/references/ux.md): product images with thumbnails.
- [Image](../../image-usage/references/ux.md): alt text, aspect ratio and fit.
- [Accessibility](../../ux-guidelines/references/accessibility.md): focus vs current vs hover.
