<!-- Source: written from libs/ui code and the usage skill (no UX_docs counterpart). Storybook: Molecules/BulkActionBar → UX guidelines. -->

# BulkActionBar: UX guidelines

Use BulkActionBar above a table while rows are selected. It renders nothing at zero, so the table's toolbar never changes shape.

## When to use

- Actions that apply to every selected row (Assign, Export, Delete).

## Use something else when

| Need | Use instead |
| --- | --- |
| One row's actions | the row's own action menu |
| Page-wide actions | PageHeader `actions` |

## Anatomy

- **Count** (`selectedCount`).
- **Actions** (`children`).
- **Clear selection** (`onClear`).

## Behaviour

**Do:**

- Order actions primary first, destructive last.
- Confirm destructive bulk actions with a Dialog.

**Don't:**

- Render the bar when nothing is selected.
- Put filters in it.

## Content and copy

- The count and Clear selection come from the catalog (`bulkActionBar`).

## Accessibility

- Actions are real Buttons; the count is text, not colour.
