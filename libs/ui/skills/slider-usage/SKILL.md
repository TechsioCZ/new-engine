---
name: slider-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Slider for
  single or range numeric adjustment with Zag.js slider behavior, label,
  markers, value text, orientation, min/max/step, validation status, and token
  styling.
metadata:
  component_version: "1.4.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/molecules/slider.tsx"
  - "libs/ui/src/tokens/components/molecules/_slider.css"
  - "libs/ui/stories/molecules/slider.stories.tsx"
  - "https://zagjs.com/components/react/slider"
---

# @techsio/ui-kit Slider Usage

Use Slider for bounded numeric adjustment. Use NumericInput when exact typed
entry is required.

## Shared field contract

Canonical sizes are `sm`, `md` (default), and `lg`. `showValueText` formats every
thumb count: one value, a two-value range, or an ordered list of several values.
Pass one `aria-label` per thumb (for example `Minimum price` and `Maximum price`);
these explicit names take precedence over the shared visible label.

`helpText` has a stable message ID merged with caller `aria-describedby` on each
focusable thumb. Error status sets `aria-invalid` and `aria-errormessage` on the
thumbs; non-neutral feedback always includes a status icon. Markers reserve a
separate line above help text. `readOnly` keeps thumbs focusable, full contrast
and immutable by pointer and keyboard; `disabled` removes their normal tab stops.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Slider`.

**Use it when**

- Approximate values in a range where visual feedback matters: price range filters, volume, zoom.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Exact values | NumericInput / FormNumericInput |
| Few discrete options | RadioGroup / Select |

**Do**

- Show the current value(s) formatted (`€20 – €80`), and pair price ranges with numeric inputs.
- Use sensible steps; label min and max.
- Apply filter changes on release, not on every pixel.

**Don't**

- Use a slider for values the user must set exactly (quantity, price in admin).

**Copy and states**

- Thumb labels `Minimum price`, `Maximum price`.

## Setup

```tsx
<Slider
  label="Price range"
  aria-label={["Minimum price", "Maximum price"]}
  defaultValue={[10, 100]}
  min={0}
  max={200}
  step={5}
  showValueText
/>
```

Supported props:

```text
value/defaultValue: number[]
min, max, step, minStepsBetweenThumbs
orientation: horizontal | vertical
origin: start | center | end
thumbAlignment: center | contain
showMarkers, markerCount, showValueText
formatRangeText, formatValue
validateStatus, helpText, onChange, onChangeEnd
size: sm | md | lg
```

A slider without a visible `label` (a price filter under an accordion title)
names its thumbs with `aria-label`, one entry per thumb:
`<Slider aria-label={["Minimum price", "Maximum price"]} />`.

## Core Patterns

### Use array values

Slider values are arrays. A range has two numbers; a single slider can use one
number.

### Use markers for scale cues

Use `showMarkers` and `markerCount`, not custom tick markup.

### Use NumericInput for precision

If the user must type an exact value, use NumericInput or pair both components
deliberately.

## Focus refs and native form lifecycle

`getThumbProps(index)` accepts only `ref`, `onFocus` and `onBlur` for the
zero-based thumb. The ref is a `HTMLDivElement` with `role="slider"`, not its
hidden form input. Focus/blur handlers compose with the machine; do not replace
its keyboard handlers or set thumb values through the DOM. Object refs and
React 19 callback-ref cleanup are supported, including thumb removal.

```tsx
import { useRef, useState } from "react"
import { Button } from "@techsio/ui-kit/atoms/button"
import { Slider } from "@techsio/ui-kit/molecules/slider"

function Budget() {
  const [values, setValues] = useState([20, 80])
  const minimum = useRef<HTMLDivElement>(null)
  const maximum = useRef<HTMLDivElement>(null)
  return <>
    <Slider label="Budget" name="budget" value={values} onChange={setValues}
      aria-label={["Minimum budget", "Maximum budget"]}
      getThumbProps={(index) => ({ ref: index === 0 ? minimum : maximum })} />
    <Button variant="secondary" onClick={() => minimum.current?.focus()}>Focus minimum</Button>
    <Button variant="secondary" onClick={() => maximum.current?.focus()}>Focus maximum</Button>
  </>
}
```

Use `name` for native form values and `form` for an external owner. Owner changes
follow the actual native input association (including moved forms or changed
IDs). Uncontrolled reset restores the initial defaults under the current bounds
only after all native/React reset listeners can cancel it. `preventDefault()`
in `onReset` preserves the value and emits no reset proposal. Pending work is
cleaned up on unmount. Controlled `value` remains authoritative, including when
the parent rejects a proposal; reset does not silently rewrite parent state.
If the product needs a controlled reset, the app explicitly sets that state.

Native disabled fieldsets (including nested fieldsets and first-legend
exceptions) affect thumbs and submission; read-only remains focusable and
submittable. Runtime bounds/precision normalization and removed-thumb recovery
must not be mistaken for app consent to commit a different controlled value.
The component-owned ThumbFocus/native-form stories cover these contracts.

## Common Mistakes

### HIGH Native range input

Wrong:

```tsx
<input type="range" min={0} max={100} />
```

Correct:

```tsx
<Slider min={0} max={100} defaultValue={[50]} />
```

Source: libs/ui/src/molecules/slider.tsx

### HIGH Scalar value

Wrong:

```tsx
<Slider value={50} />
```

Correct:

```tsx
<Slider value={[50]} />
```

Source: https://zagjs.com/components/react/slider

### HIGH Inline track styling

Wrong:

```tsx
<Slider className="h-2 rounded bg-gray-200" />
```

Correct:

```tsx
<Slider size="md" />
```

Source: libs/ui/src/tokens/components/molecules/_slider.css

## Validation Commands

```sh
rg -n "<input[^>]*type=\"range\"|<Slider[^>]*value=\\{[0-9]" apps
rg -n "<Slider[^>]*className=.*(bg-|rounded-|h-|w-|text-)" apps
rg -n "showMarkers|markerCount|formatRangeText|onChangeEnd" apps
```


Every multi-thumb slider needs distinct, contextual `aria-label` entries even when `label` is visible. Missing/duplicate names emit a warning. `getAriaValueText({value,index})` overrides spoken values per thumb and defaults to `formatValue(value)`; `formatRangeText` formats only the visible group summary. Inherited disabling follows native fieldset semantics, including disabled outer fieldsets and the first-legend exemption; dynamic changes update machine interactivity, thumb tab order and form submission together.
