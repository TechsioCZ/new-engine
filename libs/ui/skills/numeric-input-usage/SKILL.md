---
name: numeric-input-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit NumericInput
  for accessible number entry with Zag.js spinbutton behavior, compound parts,
  numeric compatibility or controlled string drafts, locale formatting, min/max/step, and token-first
  styling.
metadata:
  component_version: "1.3.5"
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
    <NumericInput.Input aria-label="Quantity" />
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

`NumericInputTemplate` forwards its own `aria-label` / `aria-labelledby` to the
input (not the root), so an unlabelled template still has a name:
`<NumericInputTemplate aria-label="Quantity" />`.

## Core Patterns

### Keep the compound anatomy intact

```tsx
<NumericInput defaultValue={50} min={0} max={100}>
  <NumericInput.Control>
    <NumericInput.Input aria-label="Quantity" />
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

<NumericInput value={quantity} onChange={setQuantity} min={1}>
  <NumericInput.Control>
    <NumericInput.Input aria-label="Quantity" />
  </NumericInput.Control>
</NumericInput>
```

### Use locale and precision deliberately

```tsx
<NumericInput
  defaultValue={12.5}
  locale="cs-CZ"
  precision={1}
  step={0.1}
>
  <NumericInput.Control>
    <NumericInput.Input aria-label="Weight (kg)" />
  </NumericInput.Control>
</NumericInput>
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
    <NumericInput.Input aria-label="Quantity" />
  </NumericInput.Control>
</NumericInput>
```

`describedBy` is merged into the input `aria-describedby`.
When `id` is provided, it is also the native input's ID, so labels and form
error summary links can target the editable field.

## Input refs and cancellation-safe native reset

`NumericInput` root `ref` targets its container. For imperative focus use
`NumericInput.Input ref?: Ref<HTMLInputElement>`; this is the editable native
spinbutton. React 19 callback disposers/object-ref clearing work in controlled
and uncontrolled modes. Keep machine focus/blur behaviour intact when observing
input events.

```tsx
import { useId, useRef, useState } from "react"
import { Label } from "@techsio/ui-kit/atoms/label"
import { NumericInput } from "@techsio/ui-kit/atoms/numeric-input"

function OrderQuantity() {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState("2")
  return <NumericInput name="quantity" value={draft}
    onValueChange={({ value }) => setDraft(value)} min={1}>
    <Label htmlFor={id}>Quantity</Label>
    <NumericInput.Control><NumericInput.Input id={id} ref={input} /></NumericInput.Control>
  </NumericInput>
}
```

Keep controlled drafts in app state; rejected edits restore the prop value,
not just the next blur's value. Native owner reset tracks the input's actual
form association, including reassociation/ID changes. A canceled native or
React reset leaves the draft untouched. Accepted uncontrolled reset restores
the initial default after cancellation has settled, without simulated clicks
or focus transfer. Controlled reset needs an explicit app-state update.
Native nested disabled fieldsets and first-legend exceptions apply to the input
and steppers; read-only retains focus/copy/submission. Ref/subscription cleanup
must not leave reset work acting on a removed input.

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
>
  <NumericInput.Control>
    <NumericInput.Input aria-label="Quantity draft" />
  </NumericInput.Control>
</NumericInput>
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
    <NumericInput.Input aria-label="Quantity" />
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
    <NumericInput.Input aria-label="Quantity" />
  </NumericInput.Control>
</NumericInput>
```

Correct:

```tsx
<NumericInput size="sm" invalid>
  <NumericInput.Control>
    <NumericInput.Input aria-label="Quantity" />
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
<NumericInput defaultValue={1} min={1} step={1}>
  <NumericInput.Control>
    <NumericInput.Input aria-label="Order quantity" />
  </NumericInput.Control>
</NumericInput>
```

Use min/max/step to express domain constraints, not custom blur handlers.

## Validation Commands

```sh
rg -n '<input[^>]*type="number"' apps
rg -U -P -n "<NumericInput\\b(?!\\.)[\\s\\S]{0,400}<button|<NumericInput\\b(?!\\.)[\\s\\S]{0,400}<Input" apps
rg -P -n "<NumericInput\\b(?!\\.)[^>]*className=.*(bg-|text-|border-|px-|py-)" apps
rg -U -P -n "<NumericInput\\b(?!\\.)(?![\\s\\S]{0,600}<NumericInput\\.Input)" apps
```

## Read-only, precision and compound feedback

`readOnly` is supported by NumericInput, FormNumericInput and
NumericInputTemplate. It retains focus, copying and normal contrast while
omitting steppers and scrubbers. All machine value actions are guarded,
including keyboard, wheel, blur clamping and an already-running hold/drag.
A parent can still change a controlled value. Disabled wins and removes the
input/actions from the tab order.

`precision={0}` formats numeric initial/parent values as whole units (numeric
1.75 displays as 2), but preserves typed fractional drafts for validation.
Precision limits presentation digits; it does not validate integers or force
trailing zeros. Controlled string drafts remain authoritative while editing;
use numeric values for immediate formatted display.

`NumericInput.StatusText` registers a stable unique message ID with the input.
Multiple mounted messages are merged with caller `aria-describedby` IDs and
unregistered on removal. Error parts also set `aria-invalid` and
`aria-errormessage`; validation icons cannot be suppressed. The legacy
`describedBy` root prop and input-level ARIA attributes remain supported.

Canonical sizes are sm/md/lg, default md. The adjacent, side-by-side steppers
provide at least 24×24 CSS-pixel targets without increasing field height.
For external layouts, keep the same minimum hit area.


### Component-specific read-only colors

Override `--color-numeric-input-bg-readonly` and `--color-numeric-input-fg-readonly`
to tune only this field's read-only surface and value. The default reference
aliases follow `--color-form-control-readonly` and `--color-form-control-text`.
These overrides also apply on hover/focus; disabled styling still wins.
The NumericInput aliases style both the compound control and its nested input;
FormNumericInput and NumericInputTemplate inherit them. Root `aria-invalid`
reaches the focusable input, alongside the legacy `invalid` machine prop.

### Validation presentation

`validateStatus="default" | "error" | "success" | "warning"` styles the
compound control. Error (including explicit `invalid` or a mounted error part)
takes precedence; success/warning do not set `aria-invalid`. Status borders
persist through hover/focus, with an independent keyboard focus outline.
Disabled styling remains authoritative. Add associated actionable feedback with
`NumericInput.StatusText` or use FormNumericInput.

Nonfinite numeric `value`/`defaultValue` render as empty, never literal NaN or
Infinity. The numeric callback still emits NaN when cleared; retain editable
text with `onValueChange(({ value }) => ...)` and validate before committing.

## Silent native form reset

Native form reset calls no value-change callbacks and dispatches no native
`input` or `change` events. Uncontrolled controls silently restore their default;
controlled controls keep the latest parent value and re-sync visible text, native
value and FormData. Handle the form's `onReset` to intentionally change parent
state. Canceled resets change nothing. React's value tracker is re-synced after
restoration, so the next identical user edit notifies exactly once. Reset does
not move focus.

## Native handlers and integer quantities

Handlers on `NumericInput.Input` compose with the machine. Observational handlers
retain typing, blur clamping and commit behavior; `preventDefault()` cancels the
corresponding native action. `onValueCommit` reports the clamped blur value, not
the preceding out-of-bounds draft. A rejected controlled edit restores the latest
parent value even if the parent does not render again.

`precision={0}`, `maximumFractionDigits: 0` and `step={1}` are not integer-domain
validation. Fractional typed drafts remain visible for correction instead of
being silently rounded. Before submitting whole-unit quantities, require a
nonempty draft, `Number.isFinite(valueAsNumber)`, `Number.isInteger(valueAsNumber)`
and the product's bounds. Reject fractions with actionable feedback; do not use
`parseInt`, truncate the draft or rely on display formatting as consent.

Native edits are captured synchronously and deferred DOM writes are tied to the
edit that scheduled them, so a stale blur commit or a late controlled
acknowledgement can never overwrite newer typing. External replacement, silent
reset, refusal and blur normalization stay authoritative.

Keep custom input ids in sync with the stepper and focus references.

Controlled values are acknowledged or refused by numeric value: decimal drafts such as 1. and 1.50 are never rewritten, while a parent that keeps its previous value restores it on screen and in the submitted value, including after an earlier accepted edit.
