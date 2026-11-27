<!-- Source: written from libs/ui code and the usage skill (no UX_docs counterpart). Storybook: Molecules/DetailList → UX guidelines. -->

# DetailList: UX guidelines

Use DetailList to show a record's fields read-only: one column on phones, two from `sm`.

## When to use

- The facts of a record on its detail page or in a quick-view panel.

## Use something else when

| Need | Use instead |
| --- | --- |
| Editable fields | form controls (FormInput, Select, …) |
| Rows of records | Table or DataTable |
| A single key number | StatCard |

## Anatomy

- A `dl` of items; each item is a label (`dt`) above its value (`dd`).

## Behaviour

**Do:**

- Use the field's label as the user knows it.
- Show a dash or "Not set" for a missing value rather than hiding the row when the field matters.

**Don't:**

- Put form controls in a DetailList.
- Use it for tabular data with several records.

## Content and copy

- Labels in sentence case, no colon.

## Accessibility

- Semantic `dl`/`dt`/`dd`; long values wrap anywhere instead of overflowing.
