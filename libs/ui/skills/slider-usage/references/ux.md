<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/slider--2774-31876.md, edited. Storybook: Molecules/Slider → UX guidelines. -->

# Slider: UX guidelines

A Slider sets an approximate number, or a range, on a known bounded scale.

## When to use

- An approximate value or range where visual feedback helps: a price range
  filter, volume, zoom.
- One thumb for a single value, two for a range. Code supports more thumbs;
  Figma shows only the two-thumb range.

## Use something else when

| Need | Use instead |
| --- | --- |
| An exact value (quantity, admin price) | `NumericInput` / `FormNumericInput` |
| A few discrete options | `RadioGroup` or `Select` |

## Anatomy

- **Label**: `label`, or `aria-label` per thumb when there is no visible label.
- **Track, range and thumbs**: one thumb per entry in `value`.
- **Value text**: `showValueText` with `formatValue` / `formatRangeText`.
- **Markers** (optional): `showMarkers` + `markerCount` for scale cues.
- **Help text**: `helpText`, the error message when `validateStatus="error"`.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Density only; the thumb stays easy to grab. |
| `state=default` | `validateStatus="default"` | No known problem. Not proof the value was applied. |
| `state=invalid` | `validateStatus="error"` | The range is invalid; the help text says how to fix it. |
| — | `validateStatus="success" \| "warning"` | Checked value or a non-blocking note. |
| `state=disabled` | `disabled` | Not usable now, for a reason the user can find. Thumbs leave the tab order. |
| — | `readOnly` | Visible at full contrast and focusable, but can't move. Figma has no read-only state. |
| two thumbs | `value={[min, max]}` | A range. `value={[n]}` is a single value. |
| — | `orientation`, `origin`, `minStepsBetweenThumbs` | Layout and spacing of thumbs; not in Figma. |

## Behaviour

**May:** move a thumb by pointer and keyboard within `min`, `max` and `step`;
adjust the lower and upper bound of a range while keeping their order.

**Must not:** require precise dragging to reach a value; show numbers outside
the bounds or finer than the step.

- The lower bound never passes the upper one (`minStepsBetweenThumbs` keeps a
  gap if needed).
- Dragging is a draft. Apply a filter on release (`onChangeEnd`), not on every
  pixel ([Value lifecycle](../../ux-guidelines/references/value-lifecycle.md)).
- In a drafted filter panel, Cancel restores the last applied range.
- An invalid range is an error state on the slider. A valid range that matches
  nothing is a normal empty result, not an error.
- For prices, pair the slider with numeric inputs so exact values are possible.

## Content and copy

- Name each thumb: `Minimum price`, `Maximum price` — cs: `Minimální cena`,
  `Maximální cena`.
- Show the current values with their unit, formatted for the locale:
  `€20 – €80` — cs: `200 Kč – 800 Kč`
  ([Formatting](../../ux-guidelines/references/formatting.md)).
- Label min and max of the scale when they aren't obvious.

## Accessibility

- The kit makes every thumb a focusable `role="slider"` with arrow-key steps,
  and links help and error text to each thumb.
- Values and units are readable as text, not only by thumb position.
- Pass `aria-label` as an array, one name per thumb.

## Edge cases

- **Filter returns 0 products**: keep the range valid and offer to widen it;
  don't mark the slider as invalid.
- **Lower bound dragged onto the upper**: the thumbs stop at each other; the
  user can still type an exact value in the paired input.
- **Bounds change at runtime** (new category price range): the kit normalises
  the shown value to the new bounds. That is not the user applying a new
  filter; the app decides whether to re-run it.

## Related

- [Value lifecycle](../../ux-guidelines/references/value-lifecycle.md): draft vs applied, Cancel.
- [Component selection](../../ux-guidelines/references/component-selection.md): Slider vs NumericInput.
- [Numeric input](../../numeric-input-usage/references/ux.md): exact values.
