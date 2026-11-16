<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/forminput--2774-19998.md, edited. Storybook: Molecules/FormInput → UX guidelines. -->

# FormInput: UX guidelines

FormInput is a labelled single-line text field: Label, Input and a linked
message. The field's state always matches the reason in its message.

## When to use

- Every labelled single-line text field in a form: name, email, SKU, URL.

## Use something else when

| Need | Use instead |
| --- | --- |
| Multi-line text | `FormTextarea` |
| Numbers, prices, quantities | `FormNumericInput` |
| Phone numbers | `PhoneInput` |
| Dates | `DatePicker` |
| Choosing from options | `Select`, `Combobox` or `RadioGroup` |
| Site search | `SearchForm` |
| A custom composition with its own label | `Input` |

## Anatomy

- **Label**: always visible, also after the field is filled. `required` adds
  the marker.
- **Input**: the text control; takes all Input props (`type`, `autoComplete`,
  `inputMode`, `readOnly`, …).
- **Message** (optional): `helpText`, rendered as StatusText and linked to the
  input. It explains the format, or the error and its fix.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Scales input, label and message. Density only. |
| `state=default` | `validateStatus="default"` | No known problem. Not proof of validation or saving. |
| `state=error` | `validateStatus="error"` | A specific, fixable problem; the text stays for correction. |
| `state=success` | `validateStatus="success"` | This value was actually checked. Not "the form was saved". |
| `state=warning` | `validateStatus="warning"` | Needs attention; the user may continue. Blocking problems are errors. |
| `state=disabled` | `disabled` | Not usable now, for a reason the user can find. |
| `state=readonly` | `readOnly` | Readable, focusable and copyable, but not editable. Not disabled and not empty. |
| `required=true` / `false` | `required` | The process really needs it; an optional empty field is not an error. |

## Behaviour

**May:** accept and edit draft text; with the label and message, explain the
format and the specific error.

**Must not:** submit on every keystroke; mark an untouched empty field as an
error (or an empty initial value as success) on page load.

- Typing changes the draft. Validate on blur or submit; a rejection keeps the
  whole text and explains the fix on the same field. After a new valid check
  the error goes away or is replaced
  ([Value lifecycle](../../ux-guidelines/references/value-lifecycle.md)).
- `success` on the field is never the signal that the form was saved; confirm
  a save on the form or with a toast.
- Whether Cancel keeps or discards the draft is decided by the form.

## Content and copy

- Label = noun, no colon: `Email`, `Project name` — cs: `E-mail`,
  `Název projektu`.
- Placeholder only as an example (`e.g. TS-0042`), never as the label.
- Error = what's wrong + how to fix: `Enter an email like name@example.com.`
  — cs: `Zadejte e-mail ve tvaru jmeno@example.cz.` Never `Invalid input`.
- If there is a length limit, the message states the real limit.

## Accessibility

- The kit associates label, message, `aria-invalid` and `aria-errormessage`.
  Omitting `id` generates a stable one; pass your own only when a form error
  summary must link to the field.
- Never block paste or password managers.
- Long values never overlap an icon or button inside the field.

## Edge cases

- **Text longer than allowed**: keep the whole text and state the limit; never
  truncate it silently.
- **Server rejects the value** (duplicate SKU): map the error onto this field,
  keep the text and focus the field.

## Related

- [Input](../../input-usage/references/ux.md): the bare control.
- [States](../../ux-guidelines/references/states.md): validation, read-only vs disabled.
- [UX writing](../../ux-guidelines/references/ux-writing.md): labels and error messages.
- [Form error summary](../../form-error-summary-usage/references/ux.md): errors across a long form.
