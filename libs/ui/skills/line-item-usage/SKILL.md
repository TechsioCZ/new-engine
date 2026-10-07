---
name: line-item-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit LineItem
  compound composition for editable cart rows, compact previews or read-only recaps.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - quantity-field-usage
  - price-block-usage
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/organisms/line-item.tsx"
  - "libs/ui/src/tokens/components/organisms/_line-item.css"
  - "libs/ui/stories/organisms/line-item.stories.tsx"
  - "libs/ui/docs/cart-presentation-figma-handoff.md"
---

# @techsio/ui-kit LineItem usage

LineItem is a compound presentation organism. Applications own DTO mapping,
formatting, routing, inventory, validation, saving and removal requests.

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
