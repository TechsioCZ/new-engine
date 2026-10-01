---
component_version: "1.0.0"
name: price-block-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit PriceBlock
  for display-ready known, from, discounted, on-request, or pending prices.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/price-block.tsx"
  - "libs/ui/src/tokens/components/molecules/_price-block.css"
  - "libs/ui/stories/molecules/price-block.stories.tsx"
  - "libs/ui/docs/price-availability-figma-handoff.md"
---

# @techsio/ui-kit PriceBlock Usage

Use PriceBlock to present price strings that the application has already
formatted and classified. The component owns visual hierarchy, not pricing.

## Setup

```tsx
import { PriceBlock } from "@techsio/ui-kit/molecules/price-block"

<PriceBlock
  state="discounted"
  amountLabel="249 Kč"
  originalLabel="299 Kč"
  taxLabel="vč. DPH"
  unitLabel="za balení"
  discountLabel="Akce"
/>
```

Supported states:

```text
known: amountLabel, optional taxLabel and unitLabel
from: prefix, amountLabel, optional taxLabel and unitLabel
discounted: amountLabel, originalLabel, optional discountLabel, taxLabel and unitLabel
on-request: label, optional detail
pending: pendingLabel
```

## Core Patterns

### Pass display-ready localized strings

Format currency, tax and units in the application. Use `on-request` when an
amount is unavailable; never turn a missing price into zero.

### Keep metadata separate

Pass tax and unit copy through `taxLabel` and `unitLabel`. PriceBlock adds the
separator only when both values exist and lets long localized copy wrap.

### Use the semantic discount branch

`originalLabel` is required for `discounted` and renders as deleted content.
`discountLabel` is optional display copy; PriceBlock does not calculate it.

## Common Mistakes

### HIGH Passing raw money data

Wrong:

```tsx
<PriceBlock state="known" amount={24900} currency="CZK" />
```

Correct:

```tsx
<PriceBlock state="known" amountLabel={formatPrice(price)} />
```

### HIGH Mixing pending and settled content

Wrong:

```tsx
<PriceBlock state="pending" pendingLabel="Načítání ceny" amountLabel="249 Kč" />
```

Correct:

```tsx
<PriceBlock state="pending" pendingLabel="Načítání ceny" />
```

### MEDIUM Rebuilding discount markup

Wrong:

```tsx
<div><span>249 Kč</span><s>299 Kč</s></div>
```

Correct:

```tsx
<PriceBlock state="discounted" amountLabel="249 Kč" originalLabel="299 Kč" />
```

## Validation Commands

```sh
rg -n "<PriceBlock[^>]*(amount=|currency=|locale=|children=)" apps
rg -n "state=\"pending\"[^>]*(amountLabel|label|originalLabel)" apps
```
