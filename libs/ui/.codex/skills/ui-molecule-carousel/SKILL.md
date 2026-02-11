---
name: ui-molecule-carousel
description: Use when working with the @libs/ui Carousel molecule (src/molecules/carousel.tsx) to implement usage, refactor behavior, fix bugs, or write stories/tests while preserving props, semantics, accessibility, and UX behavior.
---

# Carousel molecule
Use this skill to apply Carousel correctly in UI work.

## Source Of Truth
- Read `src/molecules/carousel.tsx` before changing behavior.
- Keep styling in component tokens and `tv()` variants.
- Keep React 19 patterns (use `ref` prop, avoid `forwardRef` and `useCallback`).

## Exports
- `Carousel`
- `CarouselSlide`
- `CarouselRootProps`

## Purpose
Zag carousel root with compound subcomponents for slides, controls, indicators, and autoplay.

## Props
| Prop | Required | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | No | `string` | - | - |
| `children` | Yes | `ReactNode` | - | - |
| `className` | No | `string` | - | - |
| `imageAs` | No | `ElementType` | - | - |
| `width` | No | `number` | - | - |
| `height` | No | `number` | - | - |
| `size` | No | `"sm"  &#124;  "md"  &#124;  "lg"  &#124;  "full"` | `md` | Variant prop. |
| `objectFit` | No | `"cover"  &#124;  "contain"  &#124;  "fill"  &#124;  "none"` | `cover` | Variant prop. |
| `aspectRatio` | No | `"square"  &#124;  "landscape"  &#124;  "portrait"  &#124;  "wide"  &#124;  "none"` | `square` | Variant prop. |
| `orientation` | No | `"horizontal"  &#124;  "vertical"` | `horizontal` | Zag prop. |
| `slideCount` | No | `number` | `1` | Zag prop. |
| `loop` | No | `boolean` | `true` | Zag prop. |
| `autoplay` | No | `boolean` | `false` | Zag prop. |
| `allowMouseDrag` | No | `boolean` | `true` | Zag prop. |
| `slidesPerPage` | No | `number` | `1` | Zag prop. |
| `slidesPerMove` | No | `number` | `1` | Zag prop. |
| `spacing` | No | `string` | `0px` | Zag prop. |
| `padding` | No | `string` | `0px` | Zag prop. |
| `dir` | No | `"ltr"  &#124;  "rtl"` | `ltr` | Zag prop. |
| `onPageChange` | No | `(details: { page: number }) => void` | - | Zag callback. |

## Compound API
- `Carousel.Slides`
- `Carousel.Slide`
- `Carousel.Previous`
- `Carousel.Next`
- `Carousel.Indicators`
- `Carousel.Indicator`
- `Carousel.Autoplay`
- `Carousel.Control`
- `Carousel.Root`

## Controlled State
No explicit controlled/uncontrolled mode is documented.

## Semantics And Accessibility
Zag carousel props applied to root/items/controls/indicators; buttons used for triggers.

## Usage Pattern
```tsx
<Carousel>
  <Carousel.Slides>...</Carousel.Slides>
  <Carousel.Slide>...</Carousel.Slide>
</Carousel>
```

## UI/UX Rules
- Use this component instead of raw HTML when an equivalent molecule exists.
- Keep labels, help text, and error feedback explicit; never rely on color alone.
- Prefer predictable defaults first, then opt into advanced props only when needed.
- Preserve keyboard and screen-reader behavior provided by the implementation.
- Keep visual consistency by using component variants and sizes before custom classes.

## Integration Checklist
- Verify required props first.
- Verify semantic structure in rendered markup.
- Verify focus, keyboard navigation, and disabled/read-only behavior.
- Verify controlled/uncontrolled mode is used consistently.
- Verify Storybook examples cover primary and stateful cases.
