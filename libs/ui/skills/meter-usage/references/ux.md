<!-- Source: written from libs/ui code and the usage skill (no UX_docs counterpart). Storybook: Atoms/Meter → UX guidelines. -->

# Meter: UX guidelines

Use Meter to show a known share of a known maximum as a horizontal bar: occupancy, order progress, budget use.

## When to use

- A dashboard tile or table cell shows a ratio: occupancy, quota, budget, completion.
- Two or more parts of one total sit side by side (spent and committed budget).

## Use something else when

| Need | Use instead |
| --- | --- |
| Steps of a wizard or workflow | Steps |
| The user picks a value | Slider |
| Waiting for content to load | Skeleton |
| A trend over time | Chart |

## Anatomy

- **Track**: the full scale, `max` (default 100).
- **Fill** (`value`, `severity`), or several stacked **segments** (`segments`), each with its own severity.
- **Size**: `sm` (0.5rem) or `md` (0.75rem) tall.

## Behaviour

**Do:**

- Print the number (`64 %`, `€6,200 of €10,000`) next to the bar.
- Pick `severity` by meaning: `warning` or `danger` only when the value crosses a threshold.
- Keep segments to a few parts of one total, in a stable order.

**Don't:**

- Pass `style` or width classes; the values set the widths.
- Use colour as the only signal of a threshold; say it in the text too.

## Content and copy

- The label names what is measured (`Warehouse occupancy`); the number beside it carries the value and the unit.

## Accessibility

- The bar is `role="meter"` with `aria-valuenow`, `aria-valuemin` and `aria-valuemax`; with segments `aria-valuenow` is their sum.
- Give it a name: `aria-label`, or `aria-labelledby` pointing at the visible label.
- The width transition stops when the user asks for reduced motion.
