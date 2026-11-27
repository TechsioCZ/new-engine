<!-- Source: written from libs/ui code and the usage skill (no UX_docs counterpart). Storybook: Molecules/DetailViewModeToggle → UX guidelines. -->

# DetailViewModeToggle: UX guidelines

Use DetailViewModeToggle on a list page whose records can open either as a full page or in a SidePanel. The app owns the value and remembers the choice.

## When to use

- A list page that supports both detail views.

## Use something else when

| Need | Use instead |
| --- | --- |
| Switching between views of the same data (table, board) | Tabs or RadioGroup |
| A setting on a settings page | Switch or RadioGroup |

## Anatomy

- A `fieldset` of two toggle Buttons (`aria-pressed`).

## Behaviour

**Do:**

- Place it in the list's toolbar or the PageHeader actions.
- Remember the choice per user or browser in the app.

**Don't:**

- Offer it on a page whose records have only one detail view.

## Content and copy

- All words come from the catalog (`detailViewMode`).

## Accessibility

- The group is named by the catalog's `detailViewMode.label`; the active option is `aria-pressed="true"`.
