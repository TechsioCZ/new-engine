---
name: form-numeric-input-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit
  FormNumericInput for labeled numeric fields using NumericInput compound
  children, validation status, help text, and number-specific constraints.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - numeric-input-usage
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/form-numeric-input.tsx"
  - "libs/ui/src/atoms/numeric-input.tsx"
  - "libs/ui/stories/molecules/form-numeric-input.stories.tsx"
  - "libs/ui/src/molecules/figma/form-numeric-input.figma.tsx"
  - "https://zagjs.com/components/react/number-input"
---

# @techsio/ui-kit FormNumericInput Usage

Use FormNumericInput for labeled quantities, limits, prices, or measurements.
It requires NumericInput compound children.

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
