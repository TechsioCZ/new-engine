<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/priceblock--3838-68.md (+ part doc priceblock-skeletonline--3843-129), edited. Storybook: Molecules/PriceBlock → UX guidelines. -->

# PriceBlock: UX guidelines

PriceBlock shows the price of one offer: a known amount, a starting price, a
documented discount, a price on request, or a price that is still loading. The
app formats and classifies the price; the component only presents it.

## When to use

- The price of a product, variant or service on a card, detail or line.
- Whenever a fixed price, "from" price, discount, on-request and loading must
  look different from each other.

## Use something else when

| Need | Use instead |
| --- | --- |
| The user types an amount | `NumericInput` / `FormNumericInput` |
| A basket breakdown and total | `TotalsSummary` |
| Availability of the offer | `AvailabilityStatus` |

## Anatomy

- **Amount** (`amountLabel`): the current price with currency.
- **Prefix** (`prefix`, `from` only): `From` before the amount.
- **Original price** (`originalLabel`, `discounted` only): struck through, with
  the screen-reader prefix `originalSrLabel`.
- **Discount badge** (`discountLabel`, optional): a `discount` Badge.
- **Metadata** (`taxLabel`, `unitLabel`): tax and unit, joined by a separator
  only when both exist.
- **On-request text** (`label`, optional `detail`) and the **pending line**
  (skeleton + screen-reader `pendingLabel`).

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `state=known` | `state="known"` | A concrete price of the current offer, with currency and unit. |
| `state=from` | `state="from"` + `prefix` | The lowest price of a range, not the price of every configuration. |
| `state=discounted` | `state="discounted"` + `originalLabel` + `originalSrLabel` | A documented new and original price of the same offer. |
| `state=on-request` | `state="on-request"` + `label` | The price needs an enquiry. Never zero. |
| `state=pending` | `state="pending"` + `pendingLabel` | The price is still loading. Not zero and not "unavailable". |
| `showTaxLabel`, `showUnitLabel`, `showDetail`, `showDiscountLabel` | omit the prop to hide | Optional parts. |

PriceBlock is display-only: no disabled, read-only or size variant.

## Behaviour

**May:** show a known, from, discounted, on-request or pending price.

**Must not:** derive a price from availability; show an unknown price as `0`;
start a purchase.

- When the offer changes (variant, quantity tier), update amount, currency,
  unit and discount together.
- The app computes and formats every amount, including the discount text.
- The original and discounted prices belong to the same offer.
- Hiding tax or unit never leaves an orphan separator; the component handles
  this when you omit the prop.
- After loading, the skeleton gives way to the price, on-request text, or an
  error with its fix nearby. A retry reloads only the price, not the rest of
  the card.

## Content and copy

- Format with `Intl.NumberFormat` in the app's locale: `249 Kč`, `€24.90`.
  See [Formatting](../../ux-guidelines/references/formatting.md).
- Tax and unit are explicit and survive truncation: `incl. VAT`, `per pack` —
  cs: `vč. DPH`, `za balení`.
- `prefix`: `From` — cs: `od`. `label` for on-request: `Price on request` —
  cs: `Cena na dotaz`.
- `originalSrLabel`: `Original price` — cs: `Původní cena`. `pendingLabel`:
  `Loading price` — cs: `Načítání ceny`. Both are screen-reader text, never a
  second visible line.

## Accessibility

- The original price keeps deletion markup and is prefixed by
  `originalSrLabel`, so its meaning doesn't depend on colour or strike-through.
- Pending exposes `pendingLabel` and hides the skeleton. No focus stop and no
  live region by default; add root `aria-live` only on an instance that
  updates in place.

## Edge cases

- **Configurable product**: `From 1 290 Kč` until the configuration is chosen,
  then `known` for that configuration.
- **Variant switch**: show `pending`, never `Free` or the previous variant's
  price while loading.
- **Discount without a reference price**: use `known`; don't invent an
  original price.

## Related

- [Formatting](../../ux-guidelines/references/formatting.md): money, units and tax.
- [Availability status](../../availability-status-usage/references/ux.md) and [Totals summary](../../totals-summary-usage/references/ux.md).
