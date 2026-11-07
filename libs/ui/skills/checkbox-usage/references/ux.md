<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/checkbox--2774-8692.md, edited. Storybook: Atoms/Checkbox → UX guidelines. -->

# Checkbox: UX guidelines

A Checkbox is one independent yes/no choice. The bare atom has no label, help
or message of its own; the composition around it supplies them.

## When to use

- Row and item selection in tables and lists, including a select-all control.
- Custom compositions that already provide the label and messages.

## Use something else when

| Need | Use instead |
| --- | --- |
| A checkbox with its own label, help or error | `FormCheckbox` |
| A setting that takes effect immediately | `Switch` |
| Exactly one of several options | `RadioGroup` or `RadioCard` |

## Anatomy

- **Box**: the native checkbox, with a checkmark when checked and a horizontal
  dash when `indeterminate`.
- The accessible name comes from outside: `aria-label`, `aria-labelledby` or
  an associated `Label`. Error text is linked with `aria-describedby`.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `state=unchecked` | `checked={false}` | Not chosen. Not an error by itself. |
| `state=checked` | `checked` | Chosen. The mark shows the value, not that it was saved. |
| `state=indeterminate` | `indeterminate` | Only part of a group is selected. Not a third answer. |
| `state=error` | `invalid` | A specific, fixable problem; the linked message names it. |
| `disabled=true` | `disabled` | Can't be changed now, for a reason the user can find. |
| — | `readOnly` | Value visible, focusable and submitted, but can't be toggled. Not disabled. |
| — | `size="sm" \| "md" \| "lg"` | Density only; `sm` (18px) for dense row selection, `md` (24px) default. |

In Figma `checked` and `error` share one axis, so "checked with an error" has
no master; in code `checked` and `invalid` combine freely.

## Behaviour

**May:** toggle one independent choice; in a select-all control, tell none,
some and all selected apart.

**Must not:** run an action, export or submit by being checked (that needs its
own named Button); treat `indeterminate` as an answer.

- Activating a select-all control in the mixed state selects the whole group.
- Checking a row only selects it. What happens to the selection (export,
  assign, delete) is a separate, named action.
- A form value is saved with the form. If a checkbox ever saves immediately
  and that save fails, restore the confirmed value and say so; never leave a
  change that only looks saved
  ([Value lifecycle](../../ux-guidelines/references/value-lifecycle.md)).

## Content and copy

- The accessible name says what is selected: `Select order O-1048`,
  `Select all products on this page` — cs: `Vybrat objednávku O-1048`.
- Positive statements only; never `Don't send emails`.

## Accessibility

- The kit handles keyboard toggling, the mixed state and `aria-invalid` for
  `invalid`.
- Every bare checkbox needs a lasting accessible name.
- Checked, mixed, error and disabled differ by more than colour.

## Edge cases

- **Select all on a paged list** selects the visible page. Don't present it as
  selecting every record in the database without saying so.
- **Unchecking a team member** only removes them from the selection; it never
  deletes the person or their data.

## Related

- [FormCheckbox](../../form-checkbox-usage/references/ux.md): the labelled form field.
- [DataTable](../../data-table-usage/references/ux.md): row selection.
- [States](../../ux-guidelines/references/states.md): read-only vs disabled.
