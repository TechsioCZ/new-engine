<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/input--2774-13336.md, edited. Storybook: Atoms/Input → UX guidelines. -->

# Input: UX guidelines

Input is the bare text control. It holds the user's draft text and shows its
visual state; the label, help and message come from the composition around it.

## When to use

- Inside compositions that supply their own label: table filters, inline-edit
  cells, toolbars.

## Use something else when

| Need | Use instead |
| --- | --- |
| Any labelled form field | `FormInput` |
| Numbers | `NumericInput` / `FormNumericInput` |
| Search with submit and clear | `SearchForm` |
| Multi-line text | `Textarea` / `FormTextarea` |

## Anatomy

- **Control**: the text field itself.
- **Inside button space** (optional): `withButtonInside="left" | "right"`
  reserves room for an ActionIcon inside the field.
- Label, help text and StatusText are **not** part of Input. `FormInput`
  wires them; a bare Input needs an `aria-label` or an associated `Label`.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Match the surrounding controls (for example DataTable `size`). |
| `state=default` | `variant="default"` | No known problem. Not proof that the value was validated or saved. |
| `state=error` | `variant="error"` | A specific, fixable problem was found. The draft stays for correction. |
| `state=success` | `variant="success"` | This value was actually checked. Not "the form was saved". |
| `state=warning` | `variant="warning"` | Needs attention, but the user may continue. Blocking problems are errors. |
| `state=disabled` | `disabled` | Not usable now, for a reason the user can find. |
| — | `readOnly` | Visible, focusable and copyable, but not editable. Not the same as disabled. |
| `state=hover`, `focus` | not props | Produced by the browser. |

In forms, use `FormInput` with `validateStatus`; `variant` is for bare inputs.

## Behaviour

**May:** accept and edit draft text; together with its label and message,
explain the format and the specific error.

**Must not:** submit on every keystroke without an obvious model (live search
belongs to SearchForm); mark an empty, untouched field as an error on page load.

- Typing changes the draft, not the saved record
  ([Value lifecycle](../../ux-guidelines/references/value-lifecycle.md)).
- Validate at a defined moment (blur or submit). A rejection keeps the text
  and explains the fix on the same field. After a new valid check, the message
  goes away or is replaced by the current result.
- `error`, `success` and `warning` are presentation only. The rule that checks
  the value lives in the form or app, not in the colour of the input.

## Content and copy

- Placeholders are examples (`e.g. TS-0042`) or `Search <objects>…` in
  filters — never the only label.
- Help text explains the format; an error says what to fix.
- Set `type`, `autoComplete` and `inputMode` to match the data.

## Accessibility

- Every Input has a lasting accessible name: `aria-label` or an associated
  `Label`.
- Instructions and errors are linked to the field (FormInput does this).
- Long values or units never overlap a button inside the field.

## Edge cases

- **Server rejects a value** (duplicate SKU): map the error onto this field,
  keep the text, and focus the field.
- **Read-only record**: use `readOnly`, not `disabled`, so the value can still
  be focused and copied.

## Related

- [States](../../ux-guidelines/references/states.md): validation, read-only vs disabled.
- [UX writing](../../ux-guidelines/references/ux-writing.md): form copy.
- [Select](../../select-usage/references/ux.md): choosing from a list instead of typing.
