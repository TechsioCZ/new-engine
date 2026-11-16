<!-- Source: TechsioCZ/UX_docs@167b618f1 UX_Description_var_02_Simplified/availabilitystatus--3839-105.md (+ part docs availabilitystatus-glyph-available, -limited, -preorder, -unavailable, -unknown, availabilitystatus-skeletonline), edited. Storybook: Molecules/AvailabilityStatus → UX guidelines. -->

# AvailabilityStatus: UX guidelines

AvailabilityStatus tells the user whether one specific offer can be obtained,
based on current application data. It reports a state; it doesn't grant the
right to buy and doesn't promise a delivery date.

## When to use

- Availability of one exact offer (product, variant, material, equipment) on
  a product detail, card, cart line or procurement screen.
- Whenever "unknown", "still loading", "unavailable" and "preorder" must be
  told apart.

## Use something else when

| Need | Use instead |
| --- | --- |
| A message about a form field | `StatusText` |
| A short status flag in a dense list or card corner | `Badge` (status vocabulary in [UX writing](../../ux-guidelines/references/ux-writing.md)) |
| The buy or reserve action | `Button` |

## Anatomy

- **Glyph**: a decorative icon per settled status (`icon`, `showIcon`). It
  supports the text and never carries the meaning alone.
- **Label**: the visible summary (`label`), always supplied by the app.
- **Detail** (optional): supporting copy such as a delivery estimate
  (`detail`), also from app data.
- **Pending line**: while `status="pending"` a two-line skeleton replaces the
  label and detail; `pendingLabel` is read by screen readers only.

## Variants and states

| Figma | Code | Meaning |
| --- | --- | --- |
| `status=available` | `status="available"` | Confirmed by the current data source. Not a delivery date. |
| `status=limited` | `status="limited"` | Really limited, with an explanation in the label or detail. Never invent a piece count. |
| `status=preorder` | `status="preorder"` | Preorder with its conditions explained. Never shown as immediate availability. |
| `status=unavailable` | `status="unavailable"` | Confirmed unavailable. Not unknown, and doesn't by itself block every related action. |
| `status=unknown` | `status="unknown"` | The lookup finished but availability can't be confirmed. Not unavailable, not pending. |
| `status=pending` | `status="pending"` + `pendingLabel` | The lookup is still running. Takes no `label`, `detail`, `icon` or `showIcon`. |
| `showDetail` / `showIcon` | `detail` / `showIcon` | Optional parts; hide the icon only when the composition makes it redundant. |

There is no disabled, read-only or size variant; the component is display-only.

## Behaviour

**May:** present a status the app resolved, with its explanation; tell
loading apart from unknown and unavailable.

**Must not:** allow a purchase or promise a delivery date by itself; turn
`unknown` into `unavailable` or `pending` into `available`.

- The app normalises stock into a status; the component never looks at
  quantities. Changing `status` changes the colour and default icon, not the
  text.
- When data refreshes, update `status`, `label` and `detail` together.
- The skeleton is never a result: it doesn't stand for unavailable or unknown.
  After the response, show the status, or an error with its fix in a separate
  named control.
- A retry reloads only the missing availability; surrounding confirmed data
  (price, name) is not reset.

## Content and copy

- Short labels from the status vocabulary: `In stock`, `Low stock`,
  `Preorder`, `Out of stock`, `Availability unknown` — cs: `Skladem`,
  `Poslední kusy`, `Předobjednávka`, `Vyprodáno`, `Dostupnost neznámá`.
- Delivery dates in `detail` come only from data the product confirmed
  (`Delivery on Monday 29 September` — cs: `Doručíme v pondělí 29. září.`).
- `pendingLabel` describes the wait: `Checking availability` — cs:
  `Načítání dostupnosti`.

## Accessibility

- The label carries the meaning; colour and glyph only support it. The
  component adds no focus stop.
- Pending exposes `pendingLabel` and hides the skeleton; it adds no live
  region. Add `aria-live` through root attributes only on an instance that
  really updates in place, never on every card of a static listing.

## Edge cases

- **Stock service down**: show `unknown` with an explanation, never
  `In stock` from an earlier value.
- **`In stock` without a confirmed date**: don't add `Delivery tomorrow`.
- **Variant switch on a product detail**: show `pending` until the new
  variant's status arrives, not the previous variant's status.

## Related

- [States](../../ux-guidelines/references/states.md): loading vs empty vs unknown.
- [Price block](../../price-block-usage/references/ux.md) and [Product card](../../product-card-usage/references/ux.md): the usual neighbours.
- [Badge](../../badge-usage/references/ux.md): compact status flags.
