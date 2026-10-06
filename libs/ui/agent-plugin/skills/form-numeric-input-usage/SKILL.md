---
name: form-numeric-input-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit
  FormNumericInput for labeled numeric fields using NumericInput compound
  children, validation status, help text, and number-specific constraints.
metadata:
  component_version: "1.1.1"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux numeric-input-usage app-token-overrides ux-guidelines"
  sources: "libs/ui/src/molecules/form-numeric-input.tsx libs/ui/src/atoms/numeric-input.tsx libs/ui/stories/molecules/form-numeric-input.stories.tsx libs/ui/src/molecules/form-numeric-input.figma.ts https://zagjs.com/components/react/number-input"
---

# @techsio/ui-kit FormNumericInput Usage

Use FormNumericInput for labeled quantities, limits, prices, or measurements.
It requires NumericInput compound children.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `FormNumericInput`.

**Use it when**

- Labelled exact numbers: price, quantity, stock, discount %, weight, dimensions.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Approximate value where feel matters (volume, price range filter) | Slider (optionally paired) |
| Identifiers that look numeric (postal code, card, order #) | FormInput with `inputMode="numeric"` |
| Unlabelled compact stepper (cart line) | NumericInput |

**Do**

- Pass the app `locale` and `formatOptions` (currency, percent, unit) so display matches the rest of the app.
- Set `min`, `max` and step; show the limits in help text when not obvious (`Up to 99 per order`).
- Put the unit in the label (`Price (€)`, `Weight (kg)`) when not formatted into the value.
- Keep increment/decrement triggers for small integer adjustments; omit them for prices.

**Don't**

- Use `<input type="number">` or FormInput for numbers.
- Silently clamp a typed value without telling the user — show the limit.

**Copy and states**

- Validation: `Enter a quantity between 1 and 99.` with formatted numbers.

## Setup

```tsx
<FormNumericInput id="qty" label="Quantity" min={1} defaultValue={1}>
  <NumericInput.Control>
    <NumericInput.Input />
    <NumericInput.TriggerContainer>
      <NumericInput.IncrementTrigger />
      <NumericInput.DecrementTrigger />
    </NumericInput.TriggerContainer>
  </NumericInput.Control>
</FormNumericInput>
```

Supported props:

```text
id: required
label: ReactNode
children: NumericInput compound parts
validateStatus: default | error | success | warning
helpText, showHelpTextIcon
NumericInputProps excluding children
```

## Core Patterns

### Keep NumericInput anatomy inside

Do not pass plain `<input>` or native buttons as children. Use NumericInput
parts.

### Express domain constraints with props

Use `min`, `max`, `step`, `precision`, and `locale`, not custom blur parsing.

### Use validateStatus for errors

FormNumericInput maps `validateStatus="error"` to `invalid` on NumericInput.

## Common Mistakes

### HIGH Missing NumericInput children

Wrong:

```tsx
<FormNumericInput id="qty" label="Quantity" />
```

Correct:

```tsx
<FormNumericInput id="qty" label="Quantity"><NumericInput.Control><NumericInput.Input /></NumericInput.Control></FormNumericInput>
```

Source: libs/ui/src/molecules/form-numeric-input.tsx

### HIGH Native number field

Wrong:

```tsx
<FormInput id="qty" label="Quantity" type="number" />
```

Correct:

```tsx
<FormNumericInput id="qty" label="Quantity" min={1} />
```

Source: libs/ui/src/atoms/numeric-input.tsx

### HIGH String value

Wrong:

```tsx
<FormNumericInput id="qty" label="Quantity" value="1" />
```

Correct:

```tsx
<FormNumericInput id="qty" label="Quantity" value={1} />
```

Source: libs/ui/src/atoms/numeric-input.tsx

## Validation Commands

```sh
rg -U -P -n "type=\"number\"|<FormNumericInput[^>]*value=\"|<FormNumericInput(?![\\s\\S]{0,500}<NumericInput\\.Input)" apps
rg -P -n "<FormNumericInput(?![^>]*id=)|<FormNumericInput(?![^>]*label=)" apps
rg -n "<FormNumericInput[^>]*className=.*(border-|text-|px-|py-|gap-)" apps
```
