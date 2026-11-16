<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/numericinput--2774-14143.md (+ token-icon-numeric-input-increment, token-icon-numeric-input-decrement), edited. Storybook: Atoms/NumericInput → UX guidelines. -->

# NumericInput: UX guidelines

NumericInput is the bare number control: a typed draft plus optional
steppers. It holds a real quantity with a unit, precision and bounds; the
label and message come from the composition around it.

## When to use

- Unlabelled numeric controls in compact compositions: inline table editors,
  stepper fields that get their name from the surroundings.

## Use something else when

| Need | Use instead |
| --- | --- |
| A labelled numeric field | `FormNumericInput` |
| A product or cart quantity with unit, pending and error | `QuantityField` |
| An approximate value | `Slider` |
| Identifiers that look numeric (postal code, order number, leading zeros) | `Input` |
| Phone numbers | `PhoneInput` |

## Anatomy

`NumericInput.Control` holds `NumericInput.Input` and, optionally,
`NumericInput.TriggerContainer` with `IncrementTrigger` and `DecrementTrigger`;
`NumericInput.StatusText` adds a linked message. Steppers never replace
direct typing.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Match the surrounding controls. |
| `state=default` | `validateStatus="default"` | No known problem. Not proof of validation or saving. |
| `state=error` | `validateStatus="error"` or `invalid` | A specific, fixable problem; the draft stays for correction. |
| — | `validateStatus="success" \| "warning"` | Checked value / needs attention. Code only. |
| `state=disabled` | `disabled` | Not usable now; the input and steppers leave the tab order. |
| `state=readonly` | `readOnly` | Readable, focusable and copyable; steppers are hidden. Not disabled and not zero. |

## Behaviour

**May:** accept a typed draft; change the value by `step` with the steppers,
keyboard or wheel.

**Must not:** turn an empty draft into `0` or the minimum; step past
`min`/`max`; remove an item when decrementing to zero.

- Empty, zero and invalid are three different things. Keep an empty or
  partial draft editable; don't snap it back to the previous number.
- At a bound, only the stepper that would cross it is disabled, never the
  whole field.
- By default (`clampValueOnBlur`) an out-of-range value is clamped on blur.
  If the user must see and fix it, pass `clampValueOnBlur={false}` and show
  the allowed range in the message. Never clamp silently.
- `precision` and `step={1}` format; they don't validate. Whole-unit rules
  are checked by the app before saving.
- Decrementing to zero never deletes a line item; removal is its own action.

## Content and copy

- The unit is visible next to the value or in the name (`Weight (kg)`), and
  never disappears when space is short.
- Name the steppers in the app's language with `aria-label`:
  `Increase quantity` / `Decrease quantity` — cs: `Zvýšit množství` /
  `Snížit množství`.
- An example number in a design is not a default value or a limit.
- Pass the app `locale` and `formatOptions` so the format matches the rest of
  the UI ([Formatting](../../ux-guidelines/references/formatting.md)).

## Accessibility

- The kit provides the spinbutton role, keyboard stepping and at least
  24×24 px stepper targets.
- Give the input a lasting accessible name and link messages with
  `NumericInput.StatusText` or `describedBy`.
- Units and long values never overlap the steppers.

## Edge cases

- **Clearing to retype**: the field stays empty while the user types; it
  doesn't jump back to the old value.
- **Read-only capacity**: shows the value in full contrast; a disabled field
  must not look like a confirmed zero.

## Related

- [FormNumericInput](../../form-numeric-input-usage/references/ux.md): the labelled field.
- [QuantityField](../../quantity-field-usage/references/ux.md): quantities with pending updates.
- [Value lifecycle](../../ux-guidelines/references/value-lifecycle.md): draft vs confirmed.
- [Formatting](../../ux-guidelines/references/formatting.md): numbers and units.
