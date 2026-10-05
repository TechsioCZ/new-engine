---
name: quantity-field-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit QuantityField
  for controlled quantity drafts with a visible unit, helper/error feedback,
  bounded stepping, accessible pending state and compact cart presentation.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - numeric-input-usage
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/molecules/quantity-field.tsx"
  - "libs/ui/src/atoms/numeric-input.tsx"
  - "libs/ui/src/tokens/components/molecules/_quantity-field.css"
  - "libs/ui/stories/molecules/quantity-field.stories.tsx"
  - "libs/ui/docs/quantity-field-figma-handoff.md"
  - "https://zagjs.com/components/react/number-input"
---

# @techsio/ui-kit QuantityField Usage

Use QuantityField for product, cart and repeat-order quantities that need a
visible unit, instructions, errors and an update-in-progress state. It is a
presentation molecule over the kit's existing NumericInput engine.

## UX/UI guidelines

Load ux-guidelines and numeric-input-usage for number conventions and interaction.

| Need | Use |
| --- | --- |
| Quantity with unit, helper/error and pending | QuantityField |
| General labeled numeric field | FormNumericInput |
| Bare numeric compound control | NumericInput |
| Numeric identifier such as SKU or postal code | Input / FormInput |

- Supply a clear label and a visible unit such as pieces, metres or packs.
- Keep instructions about pack size near the field; helper and error may coexist.
- Retain an application-rejected draft so the customer can correct it.
- Pass localized pendingLabel whenever pending is true.
- hideLabel is only a visual treatment for a compact row; the accessible name stays.
- A service failure and an invalid quantity have different application meaning.
  The app decides which feedback belongs on the field or surrounding section.

## Setup

```tsx
import { useState } from "react"
import { QuantityField } from "@techsio/ui-kit/molecules/quantity-field"

const [draft, setDraft] = useState("2")

<QuantityField
  id="order-quantity"
  name="quantity"
  label="Quantity"
  unitLabel="pieces"
  value={draft}
  onValueChange={({ value }) => setDraft(value)}
  min={1}
  max={20}
  step={1}
  helperText="Sold in whole pieces."
/>
```

Keep value as a string, including an empty draft. valueAsNumber is a parsed
interpretation and may be NaN; it is not a replacement for the draft.
Explicit changes from the parent remain authoritative. The component does
not maintain an independent draft cache or persisted quantity.

## Core patterns

### Separate draft and confirmed quantity

The app can retain draft "5" when persistence fails while confirmed quantity
remains 2. Pass an appropriate error or surrounding service message. The
component does not infer whether a save succeeded and does not call the API.
Do not immediately replace a rejected draft with the last confirmed number.

onValueCommit exposes Zag confirmation on blur/Enter. It is an event, not a
save policy. The app decides validation and persistence timing. Zag may
normalize incomplete numeric fragments when committing; string mode preserves
the editable value rather than defining a new text grammar.

### Block updates accessibly

```tsx
<QuantityField
  label="Quantity"
  unitLabel="pieces"
  value={draft}
  onValueChange={({ value }) => setDraft(value)}
  pending
  pendingLabel="Updating quantity…"
/>
```

pending blocks typing and steppers, as well as keyboard/wheel/hold paths.
disabled and readOnly are independent states. Neither state authorizes
removing an item or changes the meaning of the draft.

### Pass domain rules without implementing them in the field

The app supplies min/max/step and decides validity. Steppers honor boundaries;
a typed out-of-range quantity can remain visible with an error, without silent
clamping. Zero and empty never implicitly remove a cart item. Use a separate
explicit removal action in the consumer.

Use supported Zag locale/formatOptions deliberately for decimal entry.
Verify parsing and the displayed value for the app locale and requested
fraction digits; locale alone must not be assumed to define parsing.
Do not copy debounce, rounding or pack calculations into the UI molecule.

### Preserve form and accessibility bindings

id refers to the actual editable input; name/form participate in the form
contract. ref targets the input, not the root wrapper. The required label
names the field. Unit, helper/error and pending descriptions are linked and
caller-provided describedBy/aria-describedby references are preserved.

```tsx
<QuantityField
  id="cart-line-quantity"
  label="Quantity for delivery"
  hideLabel
  unitLabel="packs"
  value={draft}
  onValueChange={({ value }) => setDraft(value)}
  describedBy="delivery-note"
  error="Choose a quantity between 1 and 20."
/>
```

Use props and app-token-overrides for appearance. Existing NumericInput tokens
own the control chrome; QuantityField tokens own its composition and unit.

## Common mistakes

- Converting draft to Number on every change loses empty/partial input.
- Ignoring a deliberate controlled parent update creates a second source of truth.
- Passing pending without a localized pendingLabel leaves progress unexplained.
- Adding a second numeric parser, custom steppers or implicit zero removal bypasses
  the existing interaction and application ownership contracts.
- Showing a hidden label with no accessible replacement removes the field name.

## Validation

Inspect the public API and manual stories before selecting props. Verify clear
and retype, rejected-draft retention, parent reset, boundaries and all pending/
readOnly edit paths. Check the real input's label, descriptions and invalid state.
Run narrow consumer checks; do not migrate an app while authoring the shared kit.
