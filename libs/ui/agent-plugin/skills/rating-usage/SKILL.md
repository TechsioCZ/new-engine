---
name: rating-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Rating for
  accessible rating capture or display using the Zag.js rating-group wrapper,
  supported value/count/allowHalf/readOnly/displayOnly/disabled props, and token styling.
metadata:
  component_version: "1.3.2"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides ux-guidelines"
  sources: "https://zagjs.com/components/react/rating-group"
  contributor_sources: "libs/ui/src/atoms/rating.tsx libs/ui/src/tokens/components/atoms/_rating.css libs/ui/stories/atoms/rating.stories.tsx libs/ui/src/atoms/rating.figma.ts"
  resources: "../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

# @techsio/ui-kit Rating Usage

Use Rating for product reviews, satisfaction scores, read-only form values,
and explicit aggregate display. Do not build custom star maps.

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

- Always show the numeric value and review count next to aggregate stars (`4.6 (128 reviews)`).
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
readOnly, displayOnly, disabled, name, labelText, translations, dir
size: sm | md | lg
```

## Core Patterns

### Accessible names and changing scales

Name editable ratings with `labelText`, `aria-label`, or `aria-labelledby` that
references mounted external text. These attributes name the actual radiogroup.
An external reference takes precedence; otherwise an explicit `aria-label`
overrides the visible-label reference. The unlabeled fallback is "Rating", but
use a meaningful question when collecting scores.

`count` is a positive integer (invalid/nonfinite counts fall back to a usable
scale). Scores clamp to `0..count`; editable values round to the nearest whole
or half star according to `allowHalf`. Read-only averages retain fractional
precision. Uncontrolled initialization, runtime scale/precision changes and
native reset share this policy. Each actual editable uncontrolled correction
emits one `onChange`; reset emits none and restores the initial default under the **current**
constraints. Canceled resets do not change the score. Controlled invalid values
use a normalized display/submission projection without writing back to the
parent; application state remains the parent's responsibility.

If a focused star is removed, focus moves to a surviving star without changing
selection solely for focus recovery. Updates while focus is elsewhere never
steal focus. Zero scores retain one keyboard entry target without pretending a
star is selected.


### Feedback, targets and display semantics

Interactive stars have at least 32-pixel targets at every size, with outlined
empty stars, filled selected stars and a visible numeric value. `helpText` and
`validateStatus="default" | "error" | "warning" | "success"` provide associated
StatusText feedback; caller `aria-describedby` is merged onto the group and each
focus target, with `aria-invalid` and `aria-errormessage` for errors.
A `readOnly` form rating retains radiogroup/radio semantics, an inspectable
keyboard target and named form submission, while ignoring pointer/keyboard
mutation. It is not aggregate display. `displayOnly` instead exposes a
nonfocusable `role="img"` summary with no radios and no hidden form input.
Disabled takes priority over the read-only interaction state and removes all
keyboard targets. Sizes are `sm`, `md`,
`lg`, default `md`; stars are glyphs, not single-line boxed controls, so shared
form-control heights do not replace their square hit targets.


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

### Separate read-only form values from aggregate display

```tsx
<Rating name="deliveryScore" value={4.5} readOnly labelText="Your delivery rating" />
<Rating value={4.6} displayOnly labelText="Average product rating" />
```

`readOnly` is an immutable **form control**, not an unavailable value: keep its
normal focus target and submission. `displayOnly` is an **aggregate summary**:
no tab stop, mutation callback or form submission, even if a name is passed.
It implicitly prevents editing and retains fractional averages. Name the image
meaningfully (for example "Average product rating: 4.6 out of 5") and show the
locale-formatted numeric average and review count in adjacent app copy.
Use `disabled` for a temporarily unavailable control, not for an average.

Native reset for a form rating follows the current form owner and waits for all
native/React cancellation before restoring an uncontrolled initial score under
the current constraints. Canceled reset preserves it and emits no reset change;
controlled state always belongs to the parent. A controlled reset requires an
explicit app-state update. Native nested-fieldset disabling and first-legend
exceptions apply; reset does not click a star or steal focus. Aggregate display
has no input and therefore no native form lifecycle.

### Use token-backed size and state styling

```tsx
<Rating size="sm" value={3.5} displayOnly labelText="Average product rating" />
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

## State consistency

An untouched rating displays `0 / count` with no checked radio. A checked half-star option announces its exact value (for example, “4.5 stars”); the visible score is also associated with the group and each interactive focus target. `translations.ratingValueText` receives the exact selected value. Disabled stars and their label use disabled foregrounds. Long scales wrap inside the available width without shrinking the minimum 32px targets.

## Validation Commands

```sh
rg -n "map\\(.*\\*|text-yellow|<Rating[^>]*className=.*(text-|fill-|stroke-)" apps
rg -P -n "<Rating(?![^>]*(name=|readOnly|labelText=))" apps
rg -n "<Rating[^>]*disabled" apps
rg -n "onHoverChange|allowHalf|count=" apps
```

## Silent native form reset

Native reset calls no value-change callbacks and dispatches no native `input`
or `change` events, in controlled or uncontrolled usage. Uncontrolled controls
silently restore their default; controlled controls
keep the latest parent value and re-sync visible/accessibility/native submission
state to it. Handle the form's `onReset` to intentionally change parent state.
Canceled resets leave every channel unchanged. Reset does not synthesize events
or move focus; the first real user edit afterward emits exactly one normal
callback, including when the same value was entered before reset.

Expose the disabled state across the whole widget so assistive tech and contrast checks treat it as inactive.
