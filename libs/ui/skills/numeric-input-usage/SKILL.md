---
name: numeric-input-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit NumericInput
  for accessible number entry with Zag.js spinbutton behavior, compound parts,
  numeric public values, locale formatting, min/max/step, and token-first
  styling.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - zag-compound-components
  - app-token-overrides
sources:
  - "libs/ui/src/atoms/numeric-input.tsx"
  - "libs/ui/src/tokens/components/atoms/_numeric-input.css"
  - "libs/ui/stories/atoms/numeric-input.stories.tsx"
  - "libs/ui/src/atoms/figma/numeric-input.figma.tsx"
  - "https://zagjs.com/components/react/number-input"
---

# @techsio/ui-kit NumericInput Usage

Use NumericInput for quantities, percentages, currency-like values, or bounded
numbers where keyboard, wheel, increment/decrement, and validation behavior
matter.

## Setup

```tsx
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"

<NumericInput id="quantity" name="quantity" defaultValue={1} min={1} step={1}>
  <NumericInput.Control>
    <NumericInput.Input />
    <NumericInput.TriggerContainer>
      <NumericInput.IncrementTrigger />
      <NumericInput.DecrementTrigger />
    </NumericInput.TriggerContainer>
  </NumericInput.Control>
</NumericInput>
```

Public wrapper props use numbers:

```text
value/defaultValue: number
onChange: (value: number) => void
size: sm | md | lg
locale: string, default cs-CZ
precision, min, max, step, name, disabled, required, invalid
allowMouseWheel, allowOverflow, clampValueOnBlur, spinOnPress, formatOptions
```

## Core Patterns

### Keep the compound anatomy intact

```tsx
<NumericInput defaultValue={50} min={0} max={100}>
  <NumericInput.Control>
    <NumericInput.Input />
    <NumericInput.TriggerContainer>
      <NumericInput.IncrementTrigger />
      <NumericInput.DecrementTrigger />
    </NumericInput.TriggerContainer>
  </NumericInput.Control>
</NumericInput>
```

Do not replace trigger parts with native buttons. The subcomponents spread Zag
part props and use Button/Input tokens.

### Respect wrapper value types

Zag number-input documents string values internally, but this UI-kit wrapper
converts public `number` values to the Zag string format and calls `onChange`
with `valueAsNumber`.

```tsx
const [quantity, setQuantity] = useState(1)

<NumericInput value={quantity} onChange={setQuantity} min={1} />
```

### Use locale and precision deliberately

```tsx
<NumericInput
  defaultValue={12.5}
  locale="cs-CZ"
  precision={1}
  step={0.1}
/>
```

Use `formatOptions` for currency/percent formatting only after checking that
the output is still a usable input value.

### Use describedBy for external help/error text

```tsx
<NumericInput id="stock" describedBy="stock-help" invalid>
  <NumericInput.Control>
    <NumericInput.Input />
  </NumericInput.Control>
</NumericInput>
```

`describedBy` is merged into the input `aria-describedby`.

## Common Mistakes

### HIGH Passing Zag string values to the wrapper

Wrong:

```tsx
<NumericInput value="10" onValueChange={setValue} />
```

Correct:

```tsx
<NumericInput value={10} onChange={setValue} />
```

Source: libs/ui/src/atoms/numeric-input.tsx

### HIGH Custom steppers

Wrong:

```tsx
<NumericInput defaultValue={1}>
  <Input />
  <button>+</button>
</NumericInput>
```

Correct:

```tsx
<NumericInput defaultValue={1}>
  <NumericInput.Control>
    <NumericInput.Input />
    <NumericInput.TriggerContainer>
      <NumericInput.IncrementTrigger />
      <NumericInput.DecrementTrigger />
    </NumericInput.TriggerContainer>
  </NumericInput.Control>
</NumericInput>
```

Source: https://zagjs.com/components/react/number-input

### HIGH Inline sizing/color classes

Wrong:

```tsx
<NumericInput className="w-24 text-sm">
  <NumericInput.Control className="border-red-500 px-2">
    <NumericInput.Input />
  </NumericInput.Control>
</NumericInput>
```

Correct:

```tsx
<NumericInput size="sm" invalid>
  <NumericInput.Control>
    <NumericInput.Input />
  </NumericInput.Control>
</NumericInput>
```

Source: libs/ui/src/tokens/components/atoms/_numeric-input.css

### MEDIUM Missing min/max semantics

Wrong:

```tsx
<NumericInput defaultValue={1} />
```

Correct for a quantity:

```tsx
<NumericInput defaultValue={1} min={1} step={1} />
```

Use min/max/step to express domain constraints, not custom blur handlers.

## Validation Commands

```sh
rg -n "<input[^>]*type=\"number\"|<NumericInput\\b(?!\\.)[^>]*(onValueChange|value=\")" apps
rg -U -n "<NumericInput\\b(?!\\.)[\\s\\S]{0,400}<button|<NumericInput\\b(?!\\.)[\\s\\S]{0,400}<Input" apps
rg -n "<NumericInput\\b(?!\\.)[^>]*className=.*(bg-|text-|border-|px-|py-)" apps
rg -U -P -n "<NumericInput\\b(?!\\.)(?![\\s\\S]{0,600}<NumericInput\\.Input)" apps
```
