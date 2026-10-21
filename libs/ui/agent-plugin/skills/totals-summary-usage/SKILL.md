---
name: totals-summary-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit TotalsSummary
  to present prepared cart or checkout rows, unresolved fees, discounts,
  a labeled total and actions blocked while updating.
metadata:
  component_version: "1.0.1"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides ux-guidelines"
  sources: ""
  contributor_sources: "libs/ui/src/molecules/totals-summary.tsx libs/ui/src/tokens/components/molecules/_totals-summary.css libs/ui/stories/molecules/totals-summary.stories.tsx libs/ui/docs/cart-presentation-figma-handoff.md"
  resources: "../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

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

## Display contract

TotalsSummary has no interactive sm/md/lg size axis: its type hierarchy follows order-summary content, not form-control height. Use supplied rows and total strings for all calculations. Pending retains values and descriptions but makes the actions subtree inert. Use PriceBlock for a single item's price.

Place the summary in a shrinkable full-width container with a max-width, rather than a fixed-width centered canvas. Mobile checks must include document overflow, not just the summary’s content box.

## Application-owned pending focus

Before setting pending, capture the initiating control and focus a meaningful stable status or heading outside the soon-to-be-inert actions. Keep that destination mounted outside the busy summary, with a visible focus indicator. On completion or recoverable failure, restore the captured target after React commits only if it is still connected/enabled and focus is still at the managed destination. If the user moved elsewhere, do not restore. Removal and navigation need an application-selected next-item, error or destination policy, not a disconnected initiator. Never remove inert merely to preserve focus.

PendingFocusLifecycle demonstrates success, failure/retry, user-moved focus and a removed initiator with local-only completion controls. The same policy applies to LineItem quantity/actions. CartPresentation owns remove/undo focus: next item, previous item, then the empty-cart restore action; undo returns to the restored item. Invalid quantity drafts keep last-valid amounts only with explicit visible quantity context beside both line price and totals and an associated field description; checkout remains blocked until corrected.
