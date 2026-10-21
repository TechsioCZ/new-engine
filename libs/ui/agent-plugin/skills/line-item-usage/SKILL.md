---
name: line-item-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit LineItem
  compound composition for editable cart rows, compact previews or read-only recaps.
metadata:
  component_version: "1.0.2"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux quantity-field-usage price-block-usage app-token-overrides ux-guidelines"
  sources: ""
  contributor_sources: "libs/ui/src/organisms/line-item.tsx libs/ui/src/tokens/components/organisms/_line-item.css libs/ui/stories/organisms/line-item.stories.tsx libs/ui/docs/cart-presentation-figma-handoff.md"
  resources: "../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

# @techsio/ui-kit LineItem usage

LineItem is a compound presentation organism. Applications own DTO mapping,
formatting, routing, inventory, validation, saving and removal requests.

LineItem uses React context and is a client module. In Next.js, compose the root
and its compound parts inside a wrapper with `"use client"`, including read-only
order recaps. A Server Component can render that wrapper with serializable data;
do not access `LineItem.Body` or other compound properties in a Server Component.

## Setup

```tsx
import { LineItem } from "@techsio/ui-kit/organisms/line-item"
import { PriceBlock } from "@techsio/ui-kit/molecules/price-block"
import { QuantityField } from "@techsio/ui-kit/molecules/quantity-field"

<LineItem title="Montážní sada M8" readOnly={readOnly}>
  <LineItem.Body>
    <LineItem.Heading>
      <LineItem.Title />
      <LineItem.Price><PriceBlock state="known" amountLabel="498 Kč" /></LineItem.Price>
    </LineItem.Heading>
    <LineItem.Options>100 ks · pozink</LineItem.Options>
    <LineItem.Controls>
      <LineItem.Quantity readOnlyLabel="2 balení">
        <QuantityField label="Množství: Montážní sada M8" unitLabel="balení"
          value={draft} onValueChange={({ value }) => setDraft(value)} />
      </LineItem.Quantity>
      <LineItem.Actions><LineItem.Remove label="Odebrat" onClick={removeItem} /></LineItem.Actions>
    </LineItem.Controls>
  </LineItem.Body>
</LineItem>
```

## Compound contract

- Root requires plain product `title` and `children`. `layout="compact"` reduces
  image size and spacing. Root shares layout, readOnly and pending through context.
- Parts must render inside LineItem; otherwise they throw a descriptive error.
- `Image` wraps Image or the app's image adapter. It is optional; omit the whole
  part if no image is available. The default grid uses two columns for a direct
  Image child and one column without it.
- `Body`, `Heading`, `Title`, `Price`, `Options` and `Controls` arrange content.
  `Title` defaults to the root title, or accepts a Link containing the same name.
  `Price` accepts PriceBlock or an already formatted line amount.
- Supply AvailabilityStatus and StatusText directly where the composition needs
  availability and item-level error feedback. No new engine is added for either.
- `Quantity` requires `readOnlyLabel` even in an editable composition. In readOnly
  it renders that text and does not mount its editable children. In pending it
  makes the editable children inert. Prefer QuantityField and pass pending to it
  as well for its visual and native input state.
- Put custom mutation actions inside `Actions`. In readOnly the whole part is
  omitted; pending makes its children inert. App-owned actions should also use
  disabled for visual feedback. Navigation links may remain outside Actions.
- `Remove` renders the kit Button with a required visible localized `label`, adds
  the root product title to its accessible name and forwards Button props/ref.
  It is omitted in readOnly and disabled in pending even outside Actions.
  Callers cannot override its accessible name via aria-label/aria-labelledby.
- `pending` requires localized `pendingLabel`. Root renders and associates the
  feedback automatically below the composed content; no implicit live region.
- The root cannot inspect arbitrary child components. Use Quantity, Actions and
  Remove for editable controls so the shared state guards apply.

## Application-owned pending focus lifecycle

`pending` makes Quantity and Actions descendants inert and disables Remove; it
cannot decide where the rest of the application should put focus. Before setting
pending, capture the initiating control and **move focus out of the soon-inert
subtree** to a stable, named app-owned target (for example an order summary or
row status container with `tabIndex={-1}`). Do this synchronously before the
state update, not after the browser has already dropped focus to the document.

After success **or** failure, clear pending and wait for the editable controls to
mount/become enabled before attempting recovery. Restore focus only if it still
rests on the temporary handoff target (or was lost as that target unmounted).
If the user intentionally focused a link or another field while waiting, leave
that focus alone. Restore to the original initiating control only if it remains
connected, visible, enabled and outside inert/aria-hidden ancestors. If a
successful removal deletes that control or row, use an app-owned next-row action
or the cart/summary heading as the fallback; never focus a detached node. Failure
keeps the draft and inline error visible and uses the same conditional recovery.
Announce a result once through the app's chosen feedback surface, without adding
another live region around LineItem's pending description.

The integration story demonstrates this app-level handoff; LineItem itself does
not own requests, focus destinations, completion timing, or rollback policy.

## UX/UI guidelines

- Keep product name, options, price and quantity recognizable across contexts.
- Use compact presentation for a preview and ordinary spacing for the main cart.
- Unavailable items may remain removable. The app decides quantity restrictions.
- Keep a rejected draft visible and place its error near the relevant item.
- Preserve the supplied amounts while updating; never calculate totals here.
- Read-only recaps show quantity text and omit mutation actions.

## Tokens and stories

Override LineItem tokens for local presentation needs. Brand-wide changes belong
in semantic tokens. Styles use `src/tokens/components/organisms/_line-item.css`.

Organisms/LineItem covers editable, read-only, pending, unavailable, item error,
compact/long content and CustomComposition. The custom story demonstrates an
omitted image, a relocated price and extra actions with the same shared guards.
Figma handoff follows component-to-figma after API stabilization.

## Wave 2 contracts

LineItem layout="default"|"compact" controls content/media composition, not a sm/md/lg form-control size. Choose canonical sizes on the composed QuantityField and actions independently; do not fake a LineItem size with story-only padding.

A quantity-change failure belongs on the composed QuantityField error prop, not an unrelated item-level StatusText. QuantityField renders the icon/message and associates its generated error ID with the numeric input, preserving the unit description. Reserve a separate StatusText for errors unrelated to quantity.
