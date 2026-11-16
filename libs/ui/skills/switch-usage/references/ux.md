<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/switch--2774-31659.md, edited. Storybook: Molecules/Switch → UX guidelines. -->

# Switch: UX guidelines

A Switch turns one named feature on or off, and the user knows in advance when
the change takes effect.

## When to use

- One binary setting that applies immediately: notifications, a feature
  toggle, visibility of a panel.
- The label names the same feature in both positions.

## Use something else when

| Need | Use instead |
| --- | --- |
| A choice saved with the form's submit | `FormCheckbox` |
| Agreements and consent | `FormCheckbox` |
| One of several named options | `RadioGroup` or `Select` |

## Anatomy

- **Track and thumb**: the visible value.
- **Label**: the children; names the feature, not the state.
- **Help text** (optional): `helpText` describes the effect; it becomes the
  error message when `validateStatus="error"`.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `state=default` | `checked={false}` | Off. Not an error and not "saved". |
| `state=checked` | `checked` | On. Shows the value, not that the server accepted it. |
| `state=disabled` | `disabled` | Can't be changed now, for a reason the user can find. |
| `state=disabled-checked` | `checked` + `disabled` | On, and locked. Must not look off. |
| `state=invalid` | `validateStatus="error"` | A real, fixable problem; the help text says what to do. |
| — | `validateStatus="success" \| "warning"` | Checked value or a non-blocking note. |
| `state=focus` | not a prop | Keyboard focus from the browser; distinct from the value. |
| — | `readOnly` | Visible, focusable and submitted, but can't be toggled. Use it for settings the user may see but not change. |
| — | `size="sm" \| "md" \| "lg"` | Density only. Figma has no size axis. |

## Behaviour

**May:** change one binary setting and report the confirmed result.

**Must not:** present "on" as "saved" before the app confirms it; pick one of
several named alternatives.

- Apply on change. The switch moves at once; the app saves in the background.
- On failure, revert the switch to the last confirmed value and show an error
  toast with `Try again`
  ([Feedback and actions](../../ux-guidelines/references/feedback-and-actions.md)).
  Never leave a switch that looks saved without an explanation.
- Don't mix switches with fields that need `Save changes` in one group; users
  can't tell what is already saved.

## Content and copy

- The label names the feature and stays the same in both states:
  `Email notifications`, `Show stock levels` — cs: `Sledovat změny zakázky`,
  `Zobrazit pracovní přehled`.
- Never switch the label between `Turn on` and `Turn off`, and don't put
  `On` / `Off` in it.
- Confirmation toast: `Email notifications turned on` — cs:
  `E-mailová upozornění zapnuta`.

## Accessibility

- The kit renders a native input with `role="switch"` and `aria-checked`, and
  sets `aria-invalid` with the error message on errors.
- The on/off state stays recognisable without colour (thumb position).
- `dir="rtl"` mirrors the thumb travel.
- A switch without visible children needs `aria-label`.

## Edge cases

- **Save fails after toggling**: the switch goes back, the toast explains and
  offers `Try again`. The new position never stays as if confirmed.
- **Setting unavailable** (depends on another setting): `disabled` with the
  condition in `helpText`; don't show an "invalid" red off state instead.

## Related

- [Value lifecycle](../../ux-guidelines/references/value-lifecycle.md): on is not saved.
- [States](../../ux-guidelines/references/states.md): read-only vs disabled.
- [Component selection](../../ux-guidelines/references/component-selection.md): Switch vs Checkbox.
