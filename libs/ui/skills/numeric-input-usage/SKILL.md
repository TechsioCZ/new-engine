---
name: numeric-input-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit NumericInput
  for accessible number entry with Zag.js spinbutton behavior, compound parts,
  numeric compatibility or controlled string drafts, locale formatting, min/max/step, and token-first
  styling.
metadata:
  component_version: "1.1.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - zag-compound-components
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/atoms/numeric-input.tsx"
  - "libs/ui/src/tokens/components/atoms/_numeric-input.css"
  - "libs/ui/stories/atoms/numeric-input.stories.tsx"
  - "libs/ui/src/atoms/numeric-input.figma.ts"
  - "https://zagjs.com/components/react/number-input"
---

# @techsio/ui-kit NumericInput Usage

Use NumericInput for quantities, percentages, currency-like values, or bounded
numbers where keyboard, wheel, increment/decrement, and validation behavior
matter.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `NumericInput`.

**Use it when**

- Bare numeric controls in compact compositions: cart quantity, inline table editors, stepper fields.

**Use something else when**

| Need | Use instead |
| --- | --- |
| A labelled numeric field | FormNumericInput |
| Quantity with a visible unit, helper/error and pending updates | QuantityField (quantity-field-usage) |
| Approximate values | Slider |
| Numeric identifiers | Input |

**Do**

- Pass the app `locale` — the component defaults to `cs-CZ` (ux-guidelines/formatting#locale-defaults-in-the-kit).
- Use `formatOptions` for currency/percent/unit so the displayed value matches the rest of the UI.
- Set `min`/`max`/`step`; at the limit, disable only the trigger that would exceed it.
- Right-align numeric editors inside numeric table columns.

**Don't**

- Use `type="number"` inputs.
- Clamp silently on blur without feedback.

**Copy and states**

- Trigger labels `Increase quantity` / `Decrease quantity`.

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

Public wrapper props support both existing numbers and Zag text drafts:

```text
value/defaultValue: number | string
onChange: (value: number) => void (legacy; clearing can emit NaN)
onValueChange: (details: NumberInput.ValueChangeDetails) => void
onValueCommit / onValueInvalid / onFocusChange: Zag callbacks
size: sm | md | lg
locale: string, default cs-CZ
precision, min, max, step, name, disabled, required, invalid
allowMouseWheel, allowOverflow, clampValueOnBlur, spinOnPress, formatOptions
```

Pass native input attributes such as `autoFocus`, `aria-label` and
`aria-labelledby` to `NumericInput.Input`. Automatic focus is synchronized with
Zag so typing and arrow keys work immediately after mount.

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

Existing numeric values keep their formatting and `onChange(valueAsNumber)` contract.
Clearing a numeric field can emit NaN; existing consumers may normalize that
to undefined. Do not use NaN as a controlled text draft.

For editable drafts, keep `value` as a string and update it from
`onValueChange(details.value)`. String values pass directly to Zag; an explicit
parent update remains authoritative. `onValueCommit` reports Zag blur/Enter
confirmation and does not persist anything by itself.

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

Use `formatOptions` for localized decimal parsing as well as display options.
Locale alone is not sufficient to assume comma parsing. For editable decimals,
set an appropriate maximumFractionDigits and verify the parsed value. Currency
and percent formats need extra care to remain usable input values.

Existing NumericInput defaults retain clampValueOnBlur=true. To keep a typed
out-of-range draft, pass clampValueOnBlur=false. Keep allowOverflow=false when
steppers must respect the bounds; allowOverflow=true also enables stepping
beyond them. Zag may normalize incomplete fragments at blur/Enter.

### Use describedBy for external help/error text

```tsx
<NumericInput id="stock" describedBy="stock-help" invalid>
  <NumericInput.Control>
    <NumericInput.Input />
  </NumericInput.Control>
</NumericInput>
```

`describedBy` is merged into the input `aria-describedby`.
When `id` is provided, it is also the native input's ID, so labels and form
error summary links can target the editable field.

## Common Mistakes

### HIGH Losing a controlled draft through numeric conversion

Wrong for a draft that must remain empty or partially entered:

```tsx
<NumericInput value={Number(draft)} onChange={(value) => setDraft(String(value))} />
```

Correct:

```tsx
const [draft, setDraft] = useState("10")

<NumericInput
  value={draft}
  onValueChange={({ value }) => setDraft(value)}
  clampValueOnBlur={false}
/>
```

Legacy numeric callers can continue with `value={quantity}` and `onChange`.
Both callback forms may coexist; each receives its own contract once per
Zag change. Do not have both handlers independently overwrite the same draft.

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
rg -n '<input[^>]*type="number"' apps
rg -U -P -n "<NumericInput\\b(?!\\.)[\\s\\S]{0,400}<button|<NumericInput\\b(?!\\.)[\\s\\S]{0,400}<Input" apps
rg -P -n "<NumericInput\\b(?!\\.)[^>]*className=.*(bg-|text-|border-|px-|py-)" apps
rg -U -P -n "<NumericInput\\b(?!\\.)(?![\\s\\S]{0,600}<NumericInput\\.Input)" apps
```
