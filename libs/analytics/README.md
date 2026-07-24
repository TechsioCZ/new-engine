# `@techsio/analytics`

Unified e-commerce analytics tracking with a single hook and pluggable adapters.

If your app uses a strict Content Security Policy, pass a `nonce` prop to the pixel/script components.

## Usage

```tsx
import { useEffect, useRef } from "react"
import { useAnalytics } from "@techsio/analytics"
import { useGoogleAdapter } from "@techsio/analytics/google"
import { useMetaAdapter } from "@techsio/analytics/meta"

function CheckoutThankYou({ order }) {
  const analytics = useAnalytics({
    adapters: [useMetaAdapter(), useGoogleAdapter()],
    debug: process.env.NODE_ENV === "development",
  })

  const trackedOrderId = useRef<string | null>(null)

  useEffect(() => {
    if (!order?.id) return
    if (trackedOrderId.current === order.id) return
    trackedOrderId.current = order.id

    analytics.trackPurchase({
      orderId: order.id,
      value: order.total,
      currency: "CZK",
      numItems: order.items.length,
      products: order.items,
    })
  }, [analytics, order])

  return <div>Thank you for your order!</div>
}
```

## Adding an adapter

- Create a module under `libs/analytics/src/<provider>/`.
- Implement `AnalyticsAdapter` and map the core events to the provider API.
- Prefer `createWindowGetter(...)` + `createTracker(...)` for consistent runtime-guards and debug logging.

## Linting notes

The repository `biome.json` disables `noDangerouslySetInnerHtml` and `noImgElement` for `libs/analytics/src/**/*.tsx` because pixel/components intentionally:

- Inject vendor snippets via `next/script` (some providers require inline bootstrap code).
- Render `<noscript><img ... /></noscript>` fallbacks for non-JS environments.

All interpolated values are validated or constrained before injection (e.g., regex validation for IDs, enum-constrained country codes).
