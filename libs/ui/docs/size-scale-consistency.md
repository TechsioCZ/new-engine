# Size-scale consistency across overlay and form components

Findings from building `DataTable`, where form controls, a Menu and a Select sit
side by side in one dense filter strip and the size mismatch became obvious.
This is a plan, not something the DataTable branch changes.

> **Update:** the popup-surface-unification PR closed issues 2 and 3 below for
> Select, Combobox and Menu (tasks 2–4 in "Proposed tasks"), via a shared
> `libs/ui/src/tokens/components/_popup-surface.css` token layer. Issue 1
> (whether `md` itself should shrink) and issue 4 (a width scale) are still
> open. The rest of this document is kept as the historical record of the
> findings; see that PR's diff for what actually shipped.

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

## Issue 2 — overlay components bypass component tokens (resolved for Menu)

| Component | Generic `text-sm/md/lg` usages |
|---|---|
| `select.tsx` | 0 |
| `combobox.tsx` | 0 |
| `menu.tsx` | 6 (now 0 — see below) |
| `popover.tsx` | 2 |

`Menu` and `Popover` styled themselves with the global typography scale
instead of `--text-menu-*` / `--text-popover-*` component tokens. The rendered
value was identical, so nothing looked wrong — but neither component could be
re-themed or re-scaled independently, and both were invisible to the
component-token validation the rest of the library passes.

`Menu` now routes every size through `--text-menu-{xs,sm,md,lg}`
(`_menu.css`; `xs` was added as a code-side bridge since Figma exports only
sm/md/lg for this component). `Popover` still bypasses its component tokens —
not touched by this pass.

## Issue 3 — two spacing scales for the same kind of control (resolved for Select/Combobox/Menu)

| Token (pre-unification) | Value |
|---|---|
| `--padding-menu-item-x` | `var(--dimension-20)` |
| `--padding-menu-item-y` | `var(--dimension-16)` |
| `--padding-input-md` | `var(--spacing-150)` |

Menu items were spaced off the `--dimension-*` scale while form controls used
`--spacing-*`. Combined with 18–20px text this is what made menu items look
chunky next to an Input of the "same" size. A menu item and a select option
represent the same thing to a user — a pickable row — and should share a scale.

Select, Combobox and Menu now share one item-padding axis via
`--padding-popup-item-{x,y}-{xs,sm,md,lg}` (`_popup-surface.css`): x rides
`--dimension-*`, y rides `--spacing-*` — at `md` that's
`--padding-popup-item-x-md: var(--dimension-10)` and
`--padding-popup-item-y-md: var(--spacing-100)`. Form controls (`Input`, etc.)
still size off `--spacing-*` directly; the two are closer than before but not
yet the same scale — see the still-open part of issue 1.

## Proposed tasks

1. **Audit the `md` step.** Decide whether `--text-md` stays at 18–20px. Capture
   a side-by-side of Input / Button / Select / Combobox / Menu / Popover at each
   size before changing anything. — still open.
2. ~~**Give `Menu` component tokens.**~~ — done: routed through
   `--text-menu-{xs,sm,md,lg}` (popup-surface-unification PR).
2b. **Give `Popover` component tokens.** — still open; not touched by that PR.
3. ~~**Unify item spacing.**~~ — done for Select/Combobox/Menu via the shared
   `--padding-popup-item-*` / `--spacing-popup-item-*` axis in
   `_popup-surface.css`. Form controls (`Input` etc.) were not moved onto it.
4. ~~**Align option rows across pickers.**~~ — done: Select, Combobox and
   Menu items now share height, padding, radius, hover/selected colour and
   text size through `popup-item-base` + `popup-size-*`.
5. **Add a size matrix story.** One Storybook page rendering every control at
   `sm`/`md`/`lg` in a row, so drift like this is visible in review instead of
   being discovered inside a feature.
6. **Introduce a width scale.** See issue 4 below — there is currently no token
   scale a consumer can reach for when sizing a table column, a sidebar or any
   other fixed-width block.

## Issue 4 — no usable width scale

`DataTable` needs per-column widths (`meta.width`), and there is no token scale
that fits:

| Scale | Range | Why it does not work |
|---|---|---|
| `--dimension-*` | breaks down past ~124 | The name stops tracking the value: `--dimension-100` is 100px but `--dimension-700` is 4.38rem (70px), and the scale is sparse — no 150, 180, 250. |
| `--container-*` | `16rem`–`72rem` | Page-container widths, an order of magnitude too large for a column. |
| `--spacing-*` | padding-sized | Meant for gaps and insets, not block widths. |

So `meta.width` accepts a raw number (px) or any CSS length, and a consumer who
wants a token has to inline `"var(--dimension-120)"` themselves. That works, but
it means column widths are the one part of the grid not expressed in tokens and
therefore not themeable or exportable to Figma.

Proposed: a `--width-*` scale (e.g. `--width-3xs` … `--width-3xl` mirroring the
t-shirt naming already used by `--container-*`) authored in Figma, aliased in
the semantic layer, and then `--width-table-column-*` component tokens on top.
Until that exists, `meta.width` numbers in app code are expected, not a smell.

Once 1–4 land, `DataTable` can drop its `size="sm"` pin on the condition menu
and simply follow the table's size like every other nested control.
