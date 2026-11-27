<!-- Source: written from libs/ui code and the usage skill (no UX_docs counterpart). Storybook: Molecules/StatCard → UX guidelines. -->

# StatCard: UX guidelines

Use StatCard for one key number and StatRow to lay out several. The tile is tinted, never outlined.

## When to use

- A dashboard or list page summary: totals, counts, averages.
- A number with its change against the previous period.

## Use something else when

| Need | Use instead |
| --- | --- |
| A trend over time | Chart |
| A single status | Badge |
| A label and value list | DetailList |

## Anatomy

- **Label** (`label`, optional `icon`).
- **Value** (`value`): dominant, tabular figures.
- **Delta** (`delta`, `trend`): a small Badge.
- **Hint** (`hint`) and **action** (`action`).

## Behaviour

**Do:**

- Pass values already formatted (`Intl.NumberFormat`).
- Use `trend` to colour the delta: up is good, down is bad.
- Keep four tiles or fewer per row.

**Don't:**

- Put charts or long text in a tile.
- Use colour alone for meaning; the delta text carries it.

## Content and copy

- Label: a short noun (`Revenue`); delta with its sign (`+12.4 %`); hint says the period (`Last 30 days`).

## Accessibility

- The tile is plain text; a follow-up `action` is a real Link or Button.
