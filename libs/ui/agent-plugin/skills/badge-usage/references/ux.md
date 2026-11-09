<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/badge--2774-104.md, edited. Storybook: Atoms/Badge → UX guidelines. -->

# Badge: UX guidelines

A Badge is a short, non-interactive label for a property, category or state of
one object, readable without opening the object's detail.

## When to use

- A brief attribute or state of an object in a list or detail: `Draft`,
  `Paid`, `New`, `−20 %`.
- Counts next to navigation items or tabs.
- Product flags on cards: discount, new, out of stock.

The reader must see which object the badge belongs to.

## Use something else when

| Need | Use instead |
| --- | --- |
| A sentence explaining a problem or fix | `StatusText` |
| Full availability with detail or a delivery estimate | `AvailabilityStatus` |
| Something the user can click or remove | `Button` / `ActionIcon` |
| Confirming that an action happened | `Toast` |

A compact `Out of stock` flag on a card is a `danger` Badge (house status
vocabulary). When availability itself is the information, for example on a
product detail with a delivery estimate, use `AvailabilityStatus`.

## Anatomy

One text label with a meaning variant and a size. It complements the object's
identity; it is not a form part or a confirmation.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `variant=info` | `variant="info"` (default) | Neutral supporting information. |
| `variant=success` | `variant="success"` | A favourable or completed state, said in the text. |
| `variant=warning` | `variant="warning"` | A limitation or something needing attention, said in the text. |
| `variant=danger` | `variant="danger"` | Failed, blocked or ended badly (`Failed`, `Out of stock`). Not just "red". |
| `variant=discount` | `variant="discount"` | Only for a documented price reduction. Never a buy action. |
| `variant=outline` | `variant="outline"` | Low emphasis: not visible yet or retired (`Draft`, `Archived`). |
| `variant=primary` / `secondary` / `tertiary` | same values | Brand emphasis for categories or flags. Style only; no data state. |
| — | `variant="dynamic"` + `bgColor`, `fgColor`, `borderColor` | Escape hatch for runtime colours (swatches). Text stays readable and meaningful. |
| `size=sm` / `md` / `lg` | `size="sm" \| "md" \| "lg"` | Density only. `md` is the default. |
| `size=xl` | `size="xl"` | Display composition only, not a fourth control size. |

There are no interactive states: no hover, focus or disabled.

## Behaviour

**May:** show a short, verified fact about the object.

**Must not:** act as a button or link; be the only error message; let colour
alone imply a discount, approval or permission.

- When the data changes, update the text and the variant together.
- Show a result badge (`Approved`) only after the data confirms it, not when
  the approve button was pressed.

## Content and copy

- One word, two at most, sentence case, no punctuation: `New`, `Paid` — cs:
  `Novinka`, `Zaplaceno`. Exception: a name from the shared status vocabulary
  in [UX writing](../../ux-guidelines/references/ux-writing.md) may be longer
  (`Out of stock` — cs: `Není skladem`); don't invent other long labels.
- One word and one variant per state across the app; follow the status
  vocabulary in [UX writing](../../ux-guidelines/references/ux-writing.md).
- Counts use `Intl.NumberFormat`, cap at `99+` in navigation, and are hidden
  at `0`.
- At most two badges per item; prioritise.

## Accessibility

- The text carries the meaning; colour only supports it.
- A badge adds no focus stop. Give a count context for screen readers
  (`3 unread messages`).
- A badge that changes in place must not change only visually; the
  surrounding region announces it when that matters.

## Edge cases

- **Discount without a reference price**: no `discount` badge until the app has
  a documented price comparison.
- **Unknown state**: don't show a green `success` badge so the list looks
  complete; show the unknown state as such.

## Related

- [UX writing](../../ux-guidelines/references/ux-writing.md): status vocabulary.
- [Availability status](../../availability-status-usage/references/ux.md): availability with detail.
- [Status text](../../status-text-usage/references/ux.md): explanations and fixes.
