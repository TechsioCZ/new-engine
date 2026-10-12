---
name: rating-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Rating for
  accessible rating capture or display using the Zag.js rating-group wrapper,
  supported value/count/allowHalf/readOnly/disabled props, and token styling.
metadata:
  component_version: "1.1.1"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/atoms/rating.tsx"
  - "libs/ui/src/tokens/components/atoms/_rating.css"
  - "libs/ui/stories/atoms/rating.stories.tsx"
  - "libs/ui/src/atoms/rating.figma.ts"
  - "https://zagjs.com/components/react/rating-group"
---

# @techsio/ui-kit Rating Usage

Use Rating for product reviews, satisfaction scores, and read-only rating
display. Do not build custom star maps.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Rating`.

**Use it when**

- Showing an average rating with count; collecting a rating in reviews or satisfaction surveys.

**Use something else when**

| Need | Use instead |
| --- | --- |
| A progress or score that isn't a rating | text or a meter |

**Do**

- Always show the numeric value and count next to read-only stars (`4.6 (128 reviews)`).
- Allow half values only in display, whole values in input unless the product needs halves.
- Label interactive ratings (`Rate this product`).

**Don't**

- Show stars with no reviews — show `No reviews yet`.
- Use colour-only stars without accessible text.

**Copy and states**

- Numbers formatted with the app locale (`4,6` in cs-CZ).

## Setup

```tsx
import { Rating } from "@techsio/ui-kit/atoms/rating"

<Rating name="score" defaultValue={4} count={5} allowHalf />
```

Supported props:

```text
value/defaultValue: number
onChange: (value: number) => void
onHoverChange: (value: number) => void
count: number, default 5
allowHalf: boolean, default true
readOnly, disabled, name, labelText, translations, dir
size: sm | md | lg
```

## Core Patterns

### Use controlled mode for editable rating state

```tsx
const [rating, setRating] = useState(0)

<Rating
  name="rating"
  value={rating}
  onChange={setRating}
  labelText="Product rating"
/>
```

Zag exposes hover/value changes; the wrapper converts them to numbers.

### Use readOnly for display-only ratings

```tsx
<Rating value={4.5} readOnly labelText="Average product rating" />
```

Use `disabled` when the control is unavailable, not for normal display.

A `readOnly` rating renders as one `role="img"` named "<labelText>: 4.5 out of 5":
no radios and no tab stop, so read-only stars are never focusable or a target.
The hidden input stays, so a `name`d read-only rating still submits with its form.

### Use token-backed size and state styling

```tsx
<Rating size="sm" value={3.5} readOnly />
```

The rating token file owns checked, highlighted, half, disabled, and readonly
visuals.

## Common Mistakes

### HIGH Custom star rendering

Wrong:

```tsx
{[1, 2, 3, 4, 5].map((i) => (
  <button className="text-yellow-500" key={i}>*</button>
))}
```

Correct:

```tsx
<Rating name="rating" defaultValue={3} />
```

Source: libs/ui/src/atoms/rating.tsx

### HIGH Inline star colors

Wrong:

```tsx
<Rating className="text-yellow-500" value={4} />
```

Correct:

```tsx
<Rating value={4} />
```

Change `_rating.css` or app token overrides if the star colors need to change.

Source: libs/ui/src/tokens/components/atoms/_rating.css

### MEDIUM Missing label/name in forms

Wrong:

```tsx
<Rating value={rating} onChange={setRating} />
```

Correct for form capture:

```tsx
<Rating
  name="rating"
  labelText="Product rating"
  value={rating}
  onChange={setRating}
/>
```

Zag rating docs note `name` plus the hidden input for form usage.

Source: https://zagjs.com/components/react/rating-group

### MEDIUM Disabled used for read-only display

Wrong:

```tsx
<Rating value={4.5} disabled />
```

Correct:

```tsx
<Rating value={4.5} readOnly />
```

## Validation Commands

```sh
rg -n "map\\(.*\\*|text-yellow|<Rating[^>]*className=.*(text-|fill-|stroke-)" apps
rg -P -n "<Rating(?![^>]*(name=|readOnly|labelText=))" apps
rg -n "<Rating[^>]*disabled" apps
rg -n "onHoverChange|allowHalf|count=" apps
```
