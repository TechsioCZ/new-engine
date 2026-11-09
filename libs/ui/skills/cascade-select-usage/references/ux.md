<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/cascadeselect--3178-335.md (+ cascadeselect-content, -item, -rtl, -examples), edited. Storybook: Molecules/CascadeSelect → UX guidelines. -->

# CascadeSelect: UX guidelines

CascadeSelect chooses a form value whose meaning depends on its parent path:
category → subcategory, region → branch. Opening a branch is browsing; only
choosing a selectable node commits it.

## When to use

- A form value that lives in a real hierarchy, with defined selectable levels.
- The hierarchy is too deep or wide for one flat `Select`.

## Use something else when

| Need | Use instead |
| --- | --- |
| A flat list of known options | `Select` |
| A flat list the user needs to search | `Combobox` |
| Navigating categories (links) | `VerticalNavigation` |
| Exploring or selecting nodes in a tree widget | `TreeView` |
| Two levels with a handful of items | two `Select`s or a grouped `Select` |

## Anatomy

- **Field**: `CascadeSelect.Label`, `Control` → `Trigger` with `ValueText`
  and `Indicator`, optional `ClearTrigger`; `StatusText` for help and errors.
- **Panel**: `Positioner` → `Content` → `Node`, which renders one column per
  open level, each with a header (`rootLabel` for the first).
- **Items**: branch (has children, shows `BranchIndicator`) or leaf; the
  selected item shows `ItemIndicator` (check mark).

The marker on an open branch means "this branch is open", not "selected". The
trigger shows the full selected path.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Match the surrounding controls. |
| `size=xs` | `size="xs"` | A legacy compatibility alias in code; don't use it for new fields. |
| `state=default` | `validateStatus="default"` | No known problem; not proof of validation or saving. |
| `state=error` / `success` / `warning` | `validateStatus` | A fixable problem, a checked value, or a non-blocking note. |
| `state=disabled` | `disabled` | Not usable now, for a reason the user can find. |
| `state=readonly` | `readOnly` | The path is readable, focusable and submitted; the panel doesn't open and clear is hidden. |
| `state=hover`, `state=focus` | not props | Browser states; never commit a value. |
| `required=true` / `false` | `required` | Same meaning in validation; an optional empty value is not an error. |
| item `type=branch` / `leaf` | item with or without `children` | Opening a branch and selecting it are different decisions. |
| item `state=selected` | the value path | A confirmed choice, not the highlighted or open one. |
| content `depth=1…3` | open columns | Only illustrates an open path; not a prop and not a depth limit. |
| `dir=ltr` / `rtl` | `dir` | Column order and opening direction follow `dir`. |
| examples / RTL frames | stories | Reference compositions, not states. |

## Behaviour

**May:** open a branch's children, go back to the parent and confirm an
available leaf; select parents (`allowParentSelection`) or several values
(`multiple`) only when the field is set up for it.

**Must not:** treat opening a branch as confirming it; build the tree from
sorted label prefixes instead of real parent/child data.

- Opening and browsing don't change the value; closing without choosing
  keeps the previous one ([Value lifecycle](../../ux-guidelines/references/value-lifecycle.md)).
- Keep `allowParentSelection` off when only leaves are valid. Then opening
  `Logistics` never selects `Logistics`.
- The value is always the whole path (`[["electronics", "phones"]]`). In
  `multiple` mode, same-named leaves from different branches stay
  distinguishable by their paths.
- `items` is authoritative: a removed path clears instead of collapsing to a
  surviving parent. A disabled path that was already selected stays visible
  and is explained, not shown as a valid fresh choice.
- Clearing is its own step; on a required field it leaves a missing value that
  validation reports.

## Content and copy

- The label is the noun of the final value (`Category` — cs: `Kategorie`);
  placeholder `Select a category` — cs: `Vyberte kategorii`.
- Keep level labels short and sibling order meaningful and consistent.
- The path separator comes from the component (`formatValue` to change it);
  don't type `>` or `/` into labels.
- The error says what to pick: `Choose the most specific category` — cs:
  `Vyberte nejpodrobnější kategorii`.

## Accessibility

- The kit makes the trigger a combobox with a tree popup: arrow keys move
  through levels, Enter selects, Escape closes. Each column is labelled by its
  header.
- Branch vs leaf, open vs selected, and focused vs selected are
  distinguishable without colour (chevron, check mark).
- In RTL, don't mirror an LTR mock by hand; set `dir` and let the kit order
  columns and indicators.

## Edge cases

- **Only leaves allowed**: opening `Logistics` doesn't confirm it; the
  trigger keeps the previous value until a leaf is chosen.
- **Branch office closed**: an existing selection of it is shown as
  unavailable, and going back to the parent doesn't silently delete the
  previous value.
- **Narrow screen**: two columns fit side by side; deeper levels scroll
  horizontally to the open column.

## Related

- [Value lifecycle](../../ux-guidelines/references/value-lifecycle.md): browsing vs choosing, clearing vs deleting.
- [Component selection](../../ux-guidelines/references/component-selection.md): option inside a hierarchy.
- [Select](../../select-usage/references/ux.md): flat lists.
- [TreeView](../../tree-view-usage/references/ux.md): exploring a tree.
