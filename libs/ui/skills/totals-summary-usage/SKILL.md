---
name: totals-summary-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit TotalsSummary
  to present prepared cart or checkout rows, unresolved fees, discounts,
  a labeled total and actions blocked while updating.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/molecules/totals-summary.tsx"
  - "libs/ui/src/tokens/components/molecules/_totals-summary.css"
  - "libs/ui/stories/molecules/totals-summary.stories.tsx"
  - "libs/ui/docs/cart-presentation-figma-handoff.md"
---

# @techsio/ui-kit TotalsSummary Usage

Use TotalsSummary for a cart or checkout breakdown of already prepared labels
and values. Applications own calculations, currency formatting, tax rules,
transport/payment selection, requests and order submission.

## Setup

```tsx
import { TotalsSummary } from "@techsio/ui-kit/molecules/totals-summary"

<TotalsSummary
  rows={[
    { id: "goods", label: "Goods", value: "€50.00" },
    { id: "shipping", label: "Shipping", value: "Choose shipping" },
  ]}
  totalLabel="Subtotal including tax"
  totalValue="€50.00"
  footer="The final total follows shipping and payment selection."
/>
```

## Contract

- rows is a readonly array with stable unique id, label and value strings.
- Each row may have note and emphasis (default or discount).
- totalLabel and totalValue are required strings supplied by the application.
- footer and actions accept consumer content.
- Native div attributes and a div ref are supported.
- pending: true requires a localized pendingLabel. The last supplied values
  remain visible, aria-busy describes the update, and the actions wrapper is inert.
  Add disabled to action buttons when a disabled appearance is desired.
- The component does not create a live region. The application owns announcements
  of completed requests or errors outside the busy summary.

## UX/UI guidelines

Load ux-guidelines and app-token-overrides for composition and appearance.
Do not represent an unselected fee as zero. Supply a clear unresolved label
and call the total a subtotal when final fees are missing. Include the tax
convention in the total label or footer. Show a discount as a separate negative
value; emphasis does not change its amount or sign.

Use PriceBlock for one product's price. Use TotalsSummary for a labeled breakdown.
Do not pass Medusa DTOs, calculation functions or mutation hooks into the summary.
Do not use row notes or footer for mutable order controls: only the actions slot
is blocked while pending.

## Stories

Playground exposes labels, rows, total and pending controls. Partial preserves
unselected fees, Complete shows final fees and an action, Discounted shows a
negative discount, Pending retains amounts and blocks the checkout action,
and CustomRows demonstrates tax and deposit rows without a fixed schema.
