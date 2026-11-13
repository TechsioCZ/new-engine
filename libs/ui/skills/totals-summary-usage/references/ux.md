<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/totalssummary--3899-92.md (+ part doc totalssummary-row--3899-25), edited. Storybook: Molecules/TotalsSummary → UX guidelines. -->

# TotalsSummary: UX guidelines

TotalsSummary shows a labelled breakdown of amounts and the total (or
subtotal) that the app calculated. It makes clear what the sum includes and
what is still being recalculated. It never calculates anything itself.

## When to use

- Cart, cart drawer and checkout summaries: goods, shipping, payment fee,
  discount, tax, total.
- Order recaps and confirmations.

## Use something else when

| Need | Use instead |
| --- | --- |
| The price of one product | `PriceBlock` |
| The rows of the order themselves | `LineItem` |

## Anatomy

- **Rows** (`rows`): each has a stable `id`, a `label` and a formatted `value`,
  with optional `note` and `severity`.
- **Total** (`totalLabel`, `totalValue`): the sum and what it includes.
- **Footer** (optional): a note such as how the final total is determined.
- **Actions** (optional): the next step, for example `Continue to checkout`.
  Only this slot is blocked while pending.
- **Pending text** (`pendingLabel`): shown while recalculating.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| Row `emphasis=default` | `severity: "neutral"` | An ordinary amount with a clear name and currency. |
| Row `emphasis=discount` | `severity: "discount"` | Highlights a real discount row. It doesn't change the amount or its sign. |
| Row `showNote` | `note` | Explains the condition of this amount; never replaces its name or value. |
| `pending=false` | — | Amounts match their confirmed context. |
| `pending=true` | `pending` + `pendingLabel` | Recalculating: last values stay visible, `aria-busy` is set, the actions are inert. |
| `showFooter`, `showActions` | `footer`, `actions` | Optional slots. |

There is no size, disabled or read-only variant; the summary is display-only.

## Behaviour

**May:** show named rows and the total supplied by the app; tell a
recalculation apart from confirmed amounts.

**Must not:** calculate amounts; show unknown costs as a confirmed zero;
present old amounts as the new total.

- A change in the cart triggers the app's recalculation and `pending`. The
  shown amounts stay recognisable as the previous values and the checkout
  action is blocked.
- Success updates every row and the total at once.
- A failure ends the pending state with an explanation and `Try again`, outside
  the busy summary. Never leave the summary pending indefinitely.
- Add `disabled` to the action buttons if they should also look blocked;
  `inert` alone blocks interaction.
- Before setting `pending`, the app moves focus off the actions to a stable
  target outside the summary and restores it afterwards only if the user
  hasn't moved it.

## Content and copy

- Row labels say exactly what each amount is: `Goods`, `Shipping`,
  `Payment fee`, `Discount` — cs: `Zboží`, `Doprava`, `Poplatek za platbu`,
  `Sleva`.
- An unselected fee is named, not zero: `Choose shipping` — cs: `Vyberte dopravu`. While fees are missing, call the total a subtotal.
- State the tax convention in the total label or footer: `Total incl. VAT` —
  cs: `Celkem vč. DPH`.
- A discount is a separate negative value (`−€5.00`).
- `pendingLabel`: `Updating totals` — cs: `Přepočítáváme souhrn`.

## Accessibility

- Rows are a description list, so each value is read with its label.
- Pending sets `aria-busy` and describes the summary with `pendingLabel`. The
  component creates no live region; the app announces the final result or
  error once.
- Discount emphasis is colour plus the minus sign and label, never colour
  alone.

## Edge cases

- **Shipping not chosen yet**: `Choose shipping`, never `Free shipping` or
  `0 Kč`.
- **Recalculation failed**: keep the last confirmed values, explain the
  problem, offer `Try again`, keep checkout blocked until the totals are valid.
- **Invalid quantity draft in a line**: the summary keeps the last valid
  amounts and says which quantity they belong to.

## Related

- [Line item](../../line-item-usage/references/ux.md) and [Price block](../../price-block-usage/references/ux.md).
- [Formatting](../../ux-guidelines/references/formatting.md): money, tax and discounts.
- [States](../../ux-guidelines/references/states.md): pending vs error.
