<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/lineitem--3900-594.md (+ part docs lineitem-itemerror--3909-884, lineitem-customcomposition--3906-22756), edited. Storybook: Organisms/LineItem → UX guidelines. -->

# LineItem: UX guidelines

A LineItem is one exactly identified row of a cart or order: product, options,
price, quantity and the actions allowed on it. Changing a row never confirms
the whole order.

## When to use

- Editable rows in the cart page or cart drawer.
- Compact rows in a mini-cart preview.
- Read-only rows in checkout recaps, order confirmations and order history.

## Use something else when

| Need | Use instead |
| --- | --- |
| An offer before it is in the cart | `ProductCard` |
| The subtotal, fees and total | `TotalsSummary` |
| Many order lines compared in an admin | `DataTable` |

## Anatomy

`LineItem` (`title`, `layout`, `readOnly`, `pending` + `pendingLabel`) with
optional `LineItem.Image`, then `LineItem.Body`: `LineItem.Heading`
(`LineItem.Title`, `LineItem.Price`), `LineItem.Options`, and
`LineItem.Controls` with `LineItem.Quantity` and `LineItem.Actions`
(`LineItem.Remove` and app actions).

- Availability (`AvailabilityStatus`) and item errors (`StatusText`) are
  composed by the app. Figma's "Feedback" slot and "ItemError" part are this
  composition, not separate exports.
- A quantity error goes on the composed `QuantityField` (`error`), so it is
  tied to the input. Any other error about the row is a `StatusText` placed
  directly after `LineItem.Controls`, near the controls that fix it.
- Image, price and actions may be rearranged (see the CustomComposition
  story), but the row keeps one identity.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `layout=default` | `layout="default"` | The main cart: full spacing and image. |
| `layout=compact` | `layout="compact"` | A preview such as a mini-cart: smaller image and spacing. Not a control size. |
| `readOnly=false` | `readOnly={false}` | Editable: quantity field and actions are offered; the app decides permissions. |
| `readOnly=true` | `readOnly` + `readOnlyLabel` on Quantity | A recap: quantity as text, Actions and Remove omitted. |
| `pending=false` | — | Amounts match their confirmed context. |
| `pending=true` | `pending` + `pendingLabel` | Recalculating: amounts stay as they were, controls are inert and Remove is disabled. |
| `showImage`, `showPrice`, `showOptions`, `showFeedback` | omit the part | Optional parts. |

Sizes belong to the composed `QuantityField` and buttons, not to LineItem.

## Behaviour

**May:** change the allowed quantity, remove this item, show price, unit and
feedback for this item.

**Must not:** treat a row change as confirming the order; block removal just
because the product is no longer available; recalculate prices.

- The app separates the draft quantity, the pending save and the confirmed
  result, including price and totals
  ([Value lifecycle](../../ux-guidelines/references/value-lifecycle.md)).
- Pending keeps the previously shown amounts with `pendingLabel` explaining
  the wait; it never shows old amounts as a fresh recalculation.
- A failed change keeps the user's draft, shows the error on this row only,
  and leaves the neighbouring rows untouched.
- Before setting `pending`, the app moves focus out of the controls that
  become inert to a named target (row status or order summary). Afterwards it
  restores focus only if the user hasn't moved it meanwhile.

## Content and copy

- The title names the exact item; options name the variant:
  `Mounting kit M8` / `100 pcs · galvanised` — cs: `Montážní sada M8`,
  `100 ks · pozink`.
- Price and unit match this row's quantity; currency and pack unit survive
  truncation.
- `Remove` has a short visible label (cs: `Odebrat`); the kit adds the product
  title to its accessible name.
- `pendingLabel` names the wait: cs: `Ukládáme množství`. `readOnlyLabel`
  states the quantity with its unit: cs: `2 balení`.

## Accessibility

- Every action works by keyboard and its name includes the product.
- The quantity field's label includes the product (`Quantity: Mounting kit M8`).
- `pendingLabel` is associated automatically; LineItem adds no live region.
  Announce the result once through the app's chosen feedback surface.
- Availability and errors never rely on colour alone.

## Edge cases

- **Product went out of stock in the cart**: show `AvailabilityStatus`
  `unavailable`, disable the quantity if needed, keep `Remove` available.
- **Recalculation failed**: the row shows the error and keeps its draft; the
  totals don't pretend a new sum is confirmed.
- **Long name or translation**: wraps; never hides the price or Remove.

## Related

- [Totals summary](../../totals-summary-usage/references/ux.md): the sums below the rows.
- [Quantity field](../../quantity-field-usage/references/ux.md): draft, pending and errors of the quantity.
- [Value lifecycle](../../ux-guidelines/references/value-lifecycle.md): draft vs confirmed.
