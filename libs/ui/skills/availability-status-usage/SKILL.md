---
name: availability-status-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit
  AvailabilityStatus for explicit available, limited, preorder, unavailable,
  unknown, or pending presentation.
metadata:
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  component: "AvailabilityStatus"
  component_version: "1.0.0"
requires:
  - component-usage-ux
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/molecules/availability-status.tsx"
  - "libs/ui/src/tokens/components/molecules/_availability-status.css"
  - "libs/ui/stories/molecules/availability-status.stories.tsx"
  - "libs/ui/docs/price-availability-figma-handoff.md"
---

# @techsio/ui-kit AvailabilityStatus Usage

Use AvailabilityStatus after the application has normalized inventory into an
explicit presentation status. The component does not inspect quantities or
infer delivery promises.

## UX/UI guidelines

Apply the house `ux-guidelines` rules for status copy and loading states.

- Use AvailabilityStatus for application-resolved inventory or delivery status;
  use StatusText for unrelated generic feedback and Button for purchase actions.
- Explain availability with localized text, not color or an icon alone.
- Keep unknown availability distinct from an explicit unavailable status.
  Delivery dates and promises must come from application data.
- Supply localized `pendingLabel` copy. Pending exposes that text to screen
  readers and hides the decorative skeleton; it adds no implicit live region.
- Announce a dynamic change through root attributes only when needed; avoid
  live regions on every card in a static catalog.

## Setup

```tsx
import { AvailabilityStatus } from "@techsio/ui-kit/molecules/availability-status"

<AvailabilityStatus
  status="available"
  label="Skladem"
  detail="Doručíme v pondělí 29. září."
/>
```

Supported statuses:

```text
available | limited | preorder | unavailable | unknown
  -> label, optional detail, icon and showIcon
pending
  -> pendingLabel
```

## Core Patterns

### Normalize availability in the application

Resolve inventory, backorders and business rules before rendering. Keep
`unknown` explicit; do not map it to `available` or `unavailable`.

### Supply localized copy

The application owns `label`, `detail` and `pendingLabel`. Delivery copy is
optional detail and is never derived from the status.

### Prefer the default decorative icon

Each settled status has a distinct default icon. Use `icon` only for a real
product requirement or `showIcon={false}` when surrounding composition makes
it redundant. The visible label always carries the meaning.

## Common Mistakes

### HIGH Passing stock data instead of a status

Wrong:

```tsx
<AvailabilityStatus quantity={4} allowBackorder={false} />
```

Correct:

```tsx
<AvailabilityStatus status={resolved.status} label={resolved.label} />
```

### HIGH Treating unknown as unavailable

Wrong:

```tsx
<AvailabilityStatus status="unavailable" label="Dostupnost neznámá" />
```

Correct:

```tsx
<AvailabilityStatus status="unknown" label="Dostupnost neznámá" />
```

### MEDIUM Adding a duplicate live region

AvailabilityStatus does not announce settled output by default. Add
`aria-live` through the root attributes only when this exact instance updates
dynamically and needs an announcement.

## Validation Commands

```sh
rg -n "<AvailabilityStatus[^>]*(quantity=|inventory=|inStock=)" apps
rg -n "status=\"unavailable\"[^>]*label=\".*(unknown|neznám)" apps
```
