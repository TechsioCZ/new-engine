<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/formnumericinput--2774-21378.md, edited. Storybook: Molecules/FormNumericInput → UX guidelines. -->

# FormNumericInput: UX guidelines

FormNumericInput is a labelled field for an exact number with a clear unit,
bounds and step. It wraps NumericInput parts with a Label and a linked
message.

## When to use

- Labelled exact numbers in a form: price, stock, discount %, weight,
  dimensions, capacity.

## Use something else when

| Need | Use instead |
| --- | --- |
| A product or cart quantity with unit and pending update | `QuantityField` |
| An approximate value where feel matters | `Slider` |
| Identifiers that look numeric (postal code, card, order number) | `FormInput` with `inputMode="numeric"` |
| An unlabelled compact stepper | `NumericInput` |

## Anatomy

- **Label**: visible noun with the unit when it isn't formatted into the
  value (`Weight (kg)`); `required` adds the marker.
- **Control**: NumericInput children (`NumericInput.Control`,
  `NumericInput.Input`, optional steppers).
- **Message** (optional): `helpText`, linked to the input. It states limits
  and explains errors.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Scales control, label and message. |
| `state=default` | `validateStatus="default"` | No known problem. Not proof of validation or saving. |
| `state=error` | `validateStatus="error"` | A specific, fixable problem; the typed number stays. |
| `state=success` | `validateStatus="success"` | This value was actually checked. Not "the form was saved". |
| `state=warning` | `validateStatus="warning"` | Needs attention; the user may continue. |
| `state=disabled` | `disabled` | Not usable now, for a reason the user can find. |
| `state=readonly` | `readOnly` | Readable, focusable and copyable; steppers are hidden. Not disabled and not zero. |
| `required=true` / `false` | `required` | The process really needs it; an optional empty value is not an error. |

## Behaviour

**May:** accept a typed draft and step it by `step`; explain an invalid value
and let the user fix it.

**Must not:** replace an empty draft with `0` or the minimum; take
identifiers that need leading zeros.

- Set the real `min`, `max`, `step`, `precision` and `locale`. They shape
  input and display; whole-unit or business rules are still validated by the
  app.
- Over a bound: keep the typed number, show the allowed range and let the user
  fix it. Use `clampValueOnBlur={false}` when the out-of-range draft must
  stay visible; never clamp silently.
- A blocked stepper at a bound is not a disabled field.
- Typing is a draft; validation runs on blur or submit
  ([Value lifecycle](../../ux-guidelines/references/value-lifecycle.md)).

## Content and copy

- Show limits in help text when they aren't obvious: `Up to 99 per order.` —
  cs: `Nejvýše 99 kusů na objednávku.`
- Error with formatted numbers: `Enter a quantity between 1 and 99.` — cs:
  `Zadejte množství od 1 do 99.`
- The currency or pack unit never disappears when space is short.

## Accessibility

- The kit links the label and message and sets `aria-invalid` and
  `aria-errormessage` for errors.
- Units and long values never overlap the steppers.

## Edge cases

- **Clearing to retype**: the field stays empty while the user types; it
  doesn't jump back to the previous number.
- **Invalid draft on submit**: the number stays readable and the message says
  which range is allowed.
- **Read-only vs disabled**: read-only keeps the value available; a disabled
  field must not look like a confirmed zero.

## Related

- [NumericInput](../../numeric-input-usage/references/ux.md): the bare control and stepper rules.
- [QuantityField](../../quantity-field-usage/references/ux.md): cart and order quantities.
- [Formatting](../../ux-guidelines/references/formatting.md): numbers, currency, units.
- [States](../../ux-guidelines/references/states.md): validation, read-only vs disabled.
