<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/select--2774-24189.md and its 12 part docs (select-item, select-content, …), edited. Storybook: Molecules/Select → UX guidelines. -->

# Select: UX guidelines

Select lets the user choose one or several values from a known list. Opening
the list and moving through options is browsing; only choosing an option
commits it.

## When to use

- One value (or several, with `multiple`) from a known list of about 6–15
  options: status, category, a short country list, sort order.

## Use something else when

| Need | Use instead |
| --- | --- |
| 2–5 options that fit on screen | `RadioGroup` |
| A long list that needs search | `Combobox` |
| Hierarchical values | `CascadeSelect` |
| Commands such as Delete or Duplicate | `Menu` |
| Colour swatches | `ColorSelect` |
| Yes / no | `Switch` or `Checkbox` |

## Anatomy

`Select.Label`, `Select.Control` with `Select.Trigger` and `Select.ValueText`,
optional `Select.ClearTrigger`, then `Select.Positioner` → `Select.Content`
with `Select.Item` (`Select.ItemText`, `Select.ItemIndicator`) and optional
`Select.ItemGroup` + `Select.ItemGroupLabel`; `Select.StatusText` for help and
errors.

The chosen value (shown in ValueText, marked by ItemIndicator) and the
highlighted option (keyboard or pointer position in the list) are different
things and look different.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Match the surrounding controls. |
| `size=xs` | `size="xs"` | Exists in code, but sm/md/lg are the canonical sizes; don't use xs for app form fields. |
| `state=default` | `validateStatus="default"` | No known problem. Not proof of validation or saving. |
| `state=error` | `validateStatus="error"` | A specific, fixable problem; the message names the field and the fix. |
| `state=success` | `validateStatus="success"` | This value was actually checked. |
| `state=warning` | `validateStatus="warning"` | Needs attention; the user may continue. |
| `state=disabled` | `disabled` | Not usable now, for a reason the user can find. |
| `state=readonly` | `readOnly` | The value is readable and focusable, but can't be changed and the list doesn't open. Not disabled and not empty. |
| `required=true` / `false` | `required` | Required means the same in validation. An optional empty value is not an error. |

## Behaviour

**May:** open the list, move through options and choose an available value;
clear an optional value with `Select.ClearTrigger`.

**Must not:** run a command (Delete record) by choosing a value; commit a new
value on hover or by opening the list; navigate on change.

- Opening and browsing don't change the value. Choosing an option commits its
  identity; closing the list without choosing keeps the previous value
  ([Value lifecycle](../../ux-guidelines/references/value-lifecycle.md)).
- `items` is authoritative: a removed option clears its value instead of
  being replaced by another one.
- Clearing is its own step. On a required field it leaves a missing value that
  validation reports, not a valid "empty" option.
- A previously saved value that is no longer available is shown as such, with
  the fix, before the user confirms anything. Don't silently drop or replace it.
- With remote options, tell waiting, no matches and a load error apart, and
  never let an older response replace a newer list.

## Content and copy

- The label is the noun (`Status`, `Category` — cs: `Stav`, `Kategorie`). A
  placeholder (`Select a category`) is not a value and appears only when there
  is no sensible default.
- Options are sentence case with parallel grammar and use the same names as
  the status vocabulary in [UX writing](../../ux-guidelines/references/ux-writing.md).
- Order options logically, otherwise alphabetically; `Other` goes last.
- A group label is not selectable.
- Show disabled options only when the reason is visible (`Out of stock`).

## Accessibility

- The kit handles opening, moving and choosing with the keyboard, and keeps
  focus on the trigger after the list closes.
- Selected is distinguishable from highlighted and focused, not by colour alone.
- Long option texts and translations must not overlap the indicator or the
  clear button.

## Edge cases

- **Archived category on an existing product**: show `Archived category` with
  help text to pick a current one; saving without changing it reports the
  field, it doesn't silently switch categories.
- **Required field cleared**: the field shows an error on submit, not an empty
  option that looks chosen.

## Related

- [Value lifecycle](../../ux-guidelines/references/value-lifecycle.md): browsing vs choosing, clearing vs deleting.
- [States](../../ux-guidelines/references/states.md): read-only vs disabled.
- [Component selection](../../ux-guidelines/references/component-selection.md): Select vs RadioGroup vs Combobox.
