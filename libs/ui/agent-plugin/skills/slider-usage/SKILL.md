---
name: slider-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Slider for
  single or range numeric adjustment with Zag.js slider behavior, label,
  markers, value text, orientation, min/max/step, validation status, and token
  styling.
metadata:
  component_version: "1.1.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides ux-guidelines"
  sources: "libs/ui/src/molecules/slider.tsx libs/ui/src/tokens/components/molecules/_slider.css libs/ui/stories/molecules/slider.stories.tsx https://zagjs.com/components/react/slider"
---

# @techsio/ui-kit Slider Usage

Use Slider for bounded numeric adjustment. Use NumericInput when exact typed
entry is required.

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

