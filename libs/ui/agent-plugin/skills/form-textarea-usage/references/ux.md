<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/formtextarea--2774-22805.md, edited. Storybook: Molecules/FormTextarea → UX guidelines. -->

# FormTextarea: UX guidelines

FormTextarea is a labelled multi-line field: Label, Textarea and a linked
message. The whole answer stays readable and correctable, also on small
screens.

## When to use

- Labelled free text longer than one line: notes, descriptions, comments,
  messages.

## Use something else when

| Need | Use instead |
| --- | --- |
| A single-line value | `FormInput` |
| Formatted (rich) text | a rich-text editor |
| Structured data (address, list of items) | separate fields |
| A custom composition with its own label | `Textarea` |

## Anatomy

- **Label**: visible, names the expected content; `required` adds the marker.
- **Textarea**: takes `rows`, `resize`, `size` and the other Textarea props.
- **Message** (optional): `helpText`, linked to the field. It explains
  where the text appears, the limit, or the error.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Scales text, label and message. |
| `state=default` | `validateStatus="default"` | No known problem. |
| `state=error` | `validateStatus="error"` | A specific, fixable problem; the text stays. |
| `state=success` | `validateStatus="success"` | This value was actually checked. Not "the form was saved". |
| `state=warning` | `validateStatus="warning"` | Needs attention; the user may continue. |
| `state=disabled` | `disabled` | Not usable now, for a reason the user can find. |
| — | `readOnly` | Readable, focusable and copyable, but not editable. Not disabled. |
| `required=true` / `false` | `required` | The process really needs it; an optional empty field is not an error. |

## Behaviour

**May:** accept typing and pasting of a longer answer; explain the error on
the field.

**Must not:** submit on Enter (Enter inserts a newline); truncate saved text
silently; use the placeholder as the label.

- Size `rows` to the expected answer (3–5 lines for notes). `rows` and
  `resize` give room; they don't confirm or limit anything.
- If resize is allowed, the grown field must not push the Save action out of
  reach or cover neighbouring fields.
- A limit must be real. Show a counter in `helpText` only when there is one.
- A rejection keeps the full text
  ([Value lifecycle](../../ux-guidelines/references/value-lifecycle.md)).

## Content and copy

- Say where the text will appear: `Shown to the customer on the invoice.` —
  cs: `Zobrazí se zákazníkovi na faktuře.`
- Counter `120 / 500`; over-limit error `Shorten the note to 500 characters.`
  — cs: `Zkraťte poznámku na 500 znaků.`

## Accessibility

- The kit links label and message and sets `aria-invalid` and
  `aria-errormessage` for errors.
- The full text stays reachable with the keyboard, also in `readOnly`.

## Edge cases

- **Long pasted note, form rejected**: the note is still there with the error.
- **Height looks full**: the visible height is not a character limit; only a
  real limit produces a message.

## Related

- [Textarea](../../textarea-usage/references/ux.md): the bare control.
- [FormInput](../../form-input-usage/references/ux.md): single-line fields.
- [UX writing](../../ux-guidelines/references/ux-writing.md): help and error copy.
- [States](../../ux-guidelines/references/states.md): read-only vs disabled.
