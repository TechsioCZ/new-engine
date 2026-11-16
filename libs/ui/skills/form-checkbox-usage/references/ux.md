<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/formcheckbox--2774-20608.md, edited. Storybook: Molecules/FormCheckbox → UX guidelines. -->

# FormCheckbox: UX guidelines

FormCheckbox is one independent choice inside a form, with its label and an
optional help or validation message. The value is saved with the form.

## When to use

- Opt-ins, agreements and independent yes/no choices in a form that is saved
  with a submit button.
- Several independent options from a short list (`Email`, `SMS`).

## Use something else when

| Need | Use instead |
| --- | --- |
| A setting that takes effect immediately | `Switch` |
| Exactly one of several options | `RadioGroup` |
| Bare row selection in a table or list | `Checkbox` |

## Anatomy

- **Box**: checked, unchecked or the mixed dash for `indeterminate`.
- **Label**: `label` or `children`; the whole label toggles the box. `required`
  adds the marker.
- **Message** (optional): `helpText`, rendered as StatusText and linked to the
  input. It carries help, the error or the success/warning text.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Scales box, label and message together. Density only. |
| `state=default` | `checked={false}` | Not chosen. Not an error and not "saved". |
| `state=checked` | `checked` | Chosen. The mark is the value, not proof it was saved. |
| `state=indeterminate` | `indeterminate` | Part of a group is selected. Not a third answer. |
| `state=error` | `validateStatus="error"` + `helpText` | A specific, fixable problem; the message names the fix. |
| `state=success` | `validateStatus="success"` + `helpText` | This choice was actually checked. Shown through the message only. |
| `state=warning` | `validateStatus="warning"` + `helpText` | Needs attention; the user may continue. Shown through the message only. |
| `state=disabled` | `disabled` | Can't be changed now, for a reason the user can find. |
| `state=disabledChecked` | `disabled` + `checked` | A chosen value that can't be changed now. The value stays recognisable. |
| — | `readOnly` | Visible, focusable and submitted, but can't be toggled. Not disabled. |
| `required=true` / `false` | `required` | The process really needs it; the same rule applies in validation. |

In code, states combine freely (checked with an error, read-only and
checked); the Figma masters don't cover every combination.

## Behaviour

**May:** toggle one independent choice; explain its consequence in the help
text.

**Must not:** submit the form or save on change (that is a `Switch`); treat
`indeterminate` as an answer; pre-check marketing consent.

- `required` marks the field; it doesn't validate by itself. Validation runs
  on submit and reports the problem on this checkbox.
- A rejected `onCheckedChange` (controlled parent keeps the old value) leaves
  the box, validation and submitted value on the accepted value.

## Content and copy

- The label is a positive statement of what checking does:
  `Send me order updates by email` — cs: `Posílat oznámení e-mailem`.
- Legal or consequence detail goes into `helpText`; a terms link may sit in
  the label.
- Required agreement error: `Accept the terms to continue.` — cs:
  `Pro pokračování přijměte obchodní podmínky.`

## Accessibility

- The kit links `helpText` to the input and sets `aria-invalid` and
  `aria-errormessage` for errors.
- Meaning and state never depend on colour alone; the validation icons stay.

## Edge cases

- **Optional opt-in**: never shown as an error before submit, and checking it
  never implies consent to another purpose.
- **Unchanged required agreement on submit**: the error appears on this
  checkbox and focus can reach it from a form error summary (`id` targets the
  native input).

## Related

- [Checkbox](../../checkbox-usage/references/ux.md): the bare control.
- [Switch](../../switch-usage/references/ux.md): settings that apply immediately.
- [States](../../ux-guidelines/references/states.md): validation, read-only vs disabled.
- [UX writing](../../ux-guidelines/references/ux-writing.md): form copy.
