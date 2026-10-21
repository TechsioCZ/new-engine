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
  component_version: "1.0.1"
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

### Choose visible copy or a loading description

The application owns all localized copy; changing `status` changes the visual
presentation and default icon, **not** the text or delivery promise.

| Prop | When to supply it | What users receive |
| --- | --- | --- |
| `label` | Required for `available`, `limited`, `preorder`, `unavailable`, `unknown` | Visible summary, such as “In stock” or “Availability unknown” |
| `detail` | Optional for those same settled statuses | Visible supporting information, such as an application-resolved delivery estimate |
| `pendingLabel` | Required only for `pending` | Screen-reader-only description of the decorative loading skeleton, such as “Checking availability” |

`pendingLabel` is not a second visible label, not a tooltip, and does not create
a live region. Pending does not accept `label`, `detail`, `icon` or `showIcon`.
The discriminated union keeps these two presentations mutually exclusive:

```tsx
isLoading ? (
  <AvailabilityStatus status="pending" pendingLabel="Checking availability" />
) : (
  <AvailabilityStatus status="available" label="In stock" detail="Ready to dispatch within one business day." />
)
```

Use `unknown` when the lookup has finished but availability cannot be determined;
use `pending` only while the lookup is still in progress. Delivery copy is never
derived from the status.

The Storybook Playground supports all six statuses and shows only relevant
controls. It keeps both text values when switching between settled and pending,
so `pendingLabel` is immediately editable after selecting `pending`. Its default
“Checking availability” copy and loading-description fallback are demo-only:
applications must always provide their own `pendingLabel`. The static **All
states** story is a comparison gallery, not another controls-driven example.

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

## Shared documentation contract

AvailabilityStatus is display-only and has no form-control size or disabled/readOnly state. Its status label and decorative icon communicate meaning together. Use StatusText for below-field validation instead; use one parent live region when a group of price and availability values loads together.
