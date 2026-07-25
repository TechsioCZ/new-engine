# Size-scale consistency across overlay and form components

Findings from building `DataTable`, where form controls, a Menu and a Select sit
side by side in one dense filter strip and the size mismatch became obvious.
This is a plan, not something the DataTable branch changes.

## What was measured

| Token | Resolves to |
|---|---|
| `--text-sm` | `0.88rem` (~14px) |
| `--text-md` | `clamp(1.125rem, 1.0815rem + 0.2174vw, 1.25rem)` (~18–20px) |
| `--text-lg` | `1.5rem` (24px) |
| `--text-input-md` | `var(--text-md)` |
| `--text-button-md` | `var(--text-md)` |
| `--text-combobox-md` | `var(--text-md)` |

So `md` is **not** inconsistent between components in value — Input, Button and
Combobox all alias the same `--text-md`. The real issues are different.

## Issue 1 — `md` is large for dense UI

`--text-md` is 18–20px. That reads fine for a standalone form, but in a data
grid (filter row, menu of conditions, page-size select) it is visually heavy.
`DataTable` works around this by pinning its condition menu to `sm`.

Worth deciding as a system: either `md` stays the comfortable default and dense
surfaces opt into `sm` explicitly, or the scale shifts down and today's `md`
becomes `lg`. The second is a breaking visual change across every consumer.

## Issue 2 — overlay components bypass component tokens

| Component | Generic `text-sm/md/lg` usages |
|---|---|
| `select.tsx` | 0 |
| `combobox.tsx` | 0 |
| `menu.tsx` | 6 |
| `popover.tsx` | 2 |

`Menu` and `Popover` style themselves with the global typography scale instead
of `--text-menu-*` / `--text-popover-*` component tokens. The rendered value is
identical today, so nothing looks wrong — but those two components cannot be
re-themed or re-scaled independently, and they are invisible to the
component-token validation the rest of the library passes.

## Issue 3 — two spacing scales for the same kind of control

| Token | Value |
|---|---|
| `--padding-menu-item-x` | `var(--dimension-20)` |
| `--padding-menu-item-y` | `var(--dimension-16)` |
| `--padding-input-md` | `var(--spacing-150)` |

Menu items are spaced off the `--dimension-*` scale while form controls use
`--spacing-*`. Combined with 18–20px text this is what makes menu items look
chunky next to an Input of the "same" size. A menu item and a select option
represent the same thing to a user — a pickable row — and should share a scale.

## Proposed tasks

1. **Audit the `md` step.** Decide whether `--text-md` stays at 18–20px. Capture
   a side-by-side of Input / Button / Select / Combobox / Menu / Popover at each
   size before changing anything.
2. **Give `Menu` and `Popover` component tokens.** Replace the 8 generic
   `text-*` usages with `--text-menu-*` / `--text-popover-*` aliases, so both
   join the two-layer token contract and the validation scripts see them.
3. **Unify item spacing.** Move `--padding-menu-item-*` onto `--spacing-*` and
   align a menu item's height with a form control of the same size, so
   `size="md"` means one height everywhere.
4. **Align option rows across pickers.** A Select option, a Combobox option and
   a Menu item should be interchangeable in height, padding and text size.
5. **Add a size matrix story.** One Storybook page rendering every control at
   `sm`/`md`/`lg` in a row, so drift like this is visible in review instead of
   being discovered inside a feature.

Once 1–4 land, `DataTable` can drop its `size="sm"` pin on the condition menu
and simply follow the table's size like every other nested control.
