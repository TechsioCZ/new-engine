<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/textarea--2774-19406.md, edited. Storybook: Atoms/Textarea → UX guidelines. -->

# Textarea: UX guidelines

Textarea is the bare multi-line text control. It holds a longer draft that
must stay readable and correctable in full; the label and message come from
the composition around it.

## When to use

- Multi-line text in compositions that supply their own label: inline comment
  boxes, table editors.

## Use something else when

| Need | Use instead |
| --- | --- |
| A labelled field | `FormTextarea` |
| A short single-line value | `Input` |
| Formatted (rich) text | a rich-text editor |

## Anatomy

- **Control**: the native textarea with an initial height (`rows`) and a
  resize mode (`resize`).
- Label, help and StatusText are not part of Textarea. `FormTextarea` wires
  them; a bare Textarea needs an `aria-label` or an associated `Label`.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Text size and padding. Height comes from `rows` and content. |
| `variant=default` | `validateStatus="default"` | No known problem. |
| `variant=error` | `validateStatus="error"` | A specific, fixable problem; the text stays for correction. |
| `variant=success` | `validateStatus="success"` | This value was actually checked. Not "saved". |
| `variant=warning` | `validateStatus="warning"` | Needs attention; the user may continue. |
| `variant=borderless` | `appearance="plain"` | No border, inside a surface that already frames it. Doesn't change meaning. |
| `state=disabled` | `disabled` | Not usable now, for a reason the user can find. |
| `state=readonly` | `readOnly` | Readable, focusable and copyable, but not editable. Not disabled. |
| — | `resize="none" \| "y" \| "x" \| "both" \| "auto"` | `y` is the default; `auto` grows with the content. |

## Behaviour

**May:** accept typing and pasting of a longer answer; keep the whole text
reachable when the height changes.

**Must not:** submit the form on Enter (Enter inserts a newline); cut a long
answer without a stated data limit.

- `rows` sets the initial height, not a length limit.
- `error`, `success` and `warning` are presentation only; the rule lives in
  the form or app.
- A rejection keeps the full text and explains the fix on the same field
  ([Value lifecycle](../../ux-guidelines/references/value-lifecycle.md)).

## Content and copy

- Placeholder as an example only: `Add a note for the courier…` — cs:
  `Poznámka pro kurýra…`
- State a limit only when there is a real one.

## Accessibility

- Every Textarea has a lasting accessible name; messages are linked with
  `aria-describedby` (and `aria-errormessage` for errors).
- Read-only text stays fully readable and scrollable.

## Edge cases

- **Long pasted note, form rejected**: the note is still there after the
  error.
- **Resize**: the grown field never covers the Save action or the next field;
  choose `resize="none"` or `auto` with a max height where space is tight.

## Related

- [FormTextarea](../../form-textarea-usage/references/ux.md): the labelled field.
- [Input](../../input-usage/references/ux.md): single-line text.
- [States](../../ux-guidelines/references/states.md): read-only vs disabled.
