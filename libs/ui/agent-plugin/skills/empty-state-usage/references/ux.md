<!-- Source: written from libs/ui code and the usage skill (no UX_docs counterpart). Storybook: Molecules/EmptyState → UX guidelines. -->

# EmptyState: UX guidelines

Use EmptyState when a list or section has nothing to show. It says what is missing and offers one next step.

## When to use

- A list with no records yet (offer Create).
- Filters that match nothing (offer Clear filters).

## Use something else when

| Need | Use instead |
| --- | --- |
| An empty DataTable | DataTable's own empty state |
| Loading | Skeleton |
| An error | StatusText or an error Toast with Try again |

## Anatomy

- **Icon** (`icon`, optional).
- **Title** (`title`).
- **Description** (`description`).
- **Action** (`action`).

## Behaviour

**Do:**

- Say what is missing in the title (`No invoices yet`).
- Offer exactly one action.

**Don't:**

- Show an EmptyState while data is loading.
- Offer several competing actions.

## Content and copy

- Title: what is missing; description: why, or what happens once something exists.

## Accessibility

- The icon is decorative (`aria-hidden`); the title carries the meaning.
