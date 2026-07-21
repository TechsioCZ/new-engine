---
name: slider-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Slider for
  single or range numeric adjustment with Zag.js slider behavior, label,
  markers, value text, orientation, min/max/step, validation status, and token
  styling.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/slider.tsx"
  - "libs/ui/src/tokens/components/molecules/_slider.css"
  - "libs/ui/stories/molecules/slider.stories.tsx"
  - "https://zagjs.com/components/react/slider"
---

# @techsio/ui-kit Slider Usage

Use Slider for bounded numeric adjustment. Use NumericInput when exact typed
entry is required.

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

