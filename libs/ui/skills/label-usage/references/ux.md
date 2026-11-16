<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/label--2774-14837.md, edited. Storybook: Atoms/Label → UX guidelines. -->

# Label: UX guidelines

A Label names one specific control, before and after it is filled, and can
mark it as required.

## When to use

- A standalone label for a control that isn't wrapped in a Form* molecule.

## Use something else when

| Need | Use instead |
| --- | --- |
| A complete field with help and errors | `FormInput`, `FormTextarea`, `FormNumericInput`, `FormCheckbox` |
| A heading for a group or section | a heading element |
| Instructions or an error | help text or `StatusText` |

## Anatomy

- **Text**: the name of the value.
- **Required marker** (optional): `required` adds `*` plus a screen-reader
  "required".

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Match the size of the control and its StatusText. |
| `size=current` | `size="current"` (the default) | Inherits the surrounding text size. The Figma preview uses md metrics; it isn't a fixed size. |
| `disabled=true` | `disabled` | Matches a disabled control; set it on the control too. |
| `required=true` | `required` | Marks a field the process really needs. Also set `required` on the control. |

## Behaviour

**May:** name the value and show that it is required; focus the control when
clicked (`htmlFor`).

**Must not:** act as a button; carry the only error message; validate or
submit anything.

- The `required` marker communicates; validation still runs in the form.
- Disabled styling matches a control that is really unavailable, and must not
  make a saved value hard to read.

## Content and copy

- A short noun for the value, not an example of it: `Supplier`,
  `Project name` — cs: `Dodavatel`, `Název projektu`.
- Sentence case, no colon, no instruction (`Please enter…`); units in
  parentheses (`Weight (kg)`).

## Accessibility

- Every Label is connected to its control with `htmlFor` (or nesting).
- The label stays visible after the field is filled; a placeholder is never
  the only name.

## Edge cases

- **Two fields with the same generic label** (`Company` for supplier and
  customer): make each label specific so neighbouring fields can't be
  confused.
- **Brand wants every field marked**: `required` still appears only on fields
  that are really required.

## Related

- [FormInput](../../form-input-usage/references/ux.md): label, control and message together.
- [StatusText](../../status-text-usage/references/ux.md): help and error text.
- [UX writing](../../ux-guidelines/references/ux-writing.md): label tone.
