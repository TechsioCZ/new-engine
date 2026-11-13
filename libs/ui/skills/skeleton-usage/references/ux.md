<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/skeleton-circle--2774-16695.md, skeleton-rectangle--2774-16670.md, skeleton-text--2774-16792.md, edited. Storybook: Atoms/Skeleton → UX guidelines. -->

# Skeleton: UX guidelines

A Skeleton holds the place of content that is still loading, in the shape
that content will have. It exists only while the app is really waiting.

## When to use

- Content that takes longer than about 300 ms and whose layout is known:
  lists, cards, detail pages, charts.

## Use something else when

| Need | Use instead |
| --- | --- |
| A button's action in progress | Button `isLoading` + `loadingText` |
| Very short waits | nothing |
| Unknown layout or a long background job | progress text or a `loading` toast |
| The result is known: empty or failed | the real empty or error state |

## Anatomy

- **`Skeleton`** (root): one loading region with `isLoaded`. It announces
  loading once; the shapes inside are decorative.
- **`Skeleton.Circle`**: round content such as an avatar.
- **`Skeleton.Rectangle`**: a block such as an image or a card.
- **`Skeleton.Text`**: text lines; `noOfLines` and `lastLineWidth` hint at the
  structure, not at the real length.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `variant=primary` / `secondary` | `severity="primary" \| "secondary"` | Placeholder tone, for contrast with the surface. No meaning. |
| `speed=slow` / `normal` / `fast` | `speed="slow" \| "normal" \| "fast"` | Pulse tempo only. It never conveys progress or time left. |
| Circle `size=sm` … `xl` | `Skeleton.Circle size` | Circle diameter. `xl` is a legacy media size. |
| Text `size=sm` … `xl` | `Skeleton.Text size` | Gap between lines. |
| Text `noOfLines=1` / `3` / `5` | `noOfLines` (any number, default 3) | Placeholder line count, not a text limit. |
| Text `lastLineWidth=60%` / `80%` / `90%` | `lastLineWidth` (default `"80%"`) | Width of the last line. |
| — | `isLoaded` | `false` shows the placeholder; `true` shows the real children. |

## Behaviour

**May:** stand in for content for exactly as long as the app is waiting.

**Must not:** pretend to be a known value; stay up for an error or an empty
result; hold real links or actions (the placeholder is inert).

- Mirror the real layout: same rows, columns, heights and widths, so the
  content replaces it without a layout shift.
- Keep headers, navigation and actions real while their content loads.
- When the response arrives, show the data, an explained empty state, or the
  error with a way to fix it.
- On retry, only the missing area waits again; confirmed content around it
  isn't reset to placeholders.

## Content and copy

- The loading label names what is loading: `Loading orders` — cs:
  `Načítání objednávek` (`aria-label` on the root; default
  `Loading content`).

## Accessibility

- The kit gives the root `role="status"`, `aria-busy` and the label, and
  makes the shapes inert and hidden. Don't add a second announcement per
  shape.
- A shape used alone is its own loading region; pass `aria-hidden="true"`
  when another component already announces loading.
- The pulse stops under reduced motion, so motion is never the only sign of
  waiting.

## Edge cases

- **Avatar fails to load**: show the fallback (initials), not a grey circle
  forever. A circle never means "unknown user".
- **Partial refresh of a dashboard**: one card shows a skeleton; the other
  cards keep their numbers.

## Related

- [States](../../ux-guidelines/references/states.md): loading, empty and error.
- [Formatting](../../ux-guidelines/references/formatting.md): loading values.
- [Button](../../button-usage/references/ux.md): loading on an action.
