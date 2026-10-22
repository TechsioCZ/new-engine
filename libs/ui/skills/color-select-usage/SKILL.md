---
name: color-select-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit ColorSelect
  for choosing color swatches with supported layout, size, radius, disabled
  state, selected state, labels, counts, and single/multiple roles.
metadata:
  component_version: "1.1.3"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/molecules/color-select.tsx"
  - "libs/ui/src/tokens/components/molecules/_color-select.css"
  - "libs/ui/stories/molecules/color-select.stories.tsx"
---

# @techsio/ui-kit ColorSelect Usage

Use ColorSelect for product color filters or swatch choices. It is not a
general Select replacement.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `ColorSelect`.

**Use it when**

- Choosing a product colour/variant by swatch, or filtering a catalog by colour.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Choosing any other value | Select / RadioGroup |
| Brand theme colour in admin settings | a dedicated color input, not a swatch filter |

**Do**

- Give every swatch an accessible name with the colour's product name (`Navy`), not the hex value.
- Show the selected colour's name next to the control.
- Mark unavailable colours as unavailable (not just faded) and explain on the product page.

**Don't**

- Rely on colour alone — the name must be visible or available on focus.
- Use more than ~12 swatches without grouping or a More option.

**Copy and states**

- Label `Colour` (or `Color`, per locale); selected value shown as `Colour: Navy`.

## Setup

```tsx
import { ColorSelect } from "@techsio/ui-kit/molecules/color-select"

<ColorSelect
  colors={[{ color: "#0f172a", label: "Navy", selected: true }]}
  onColorClick={setColor}
/>
```

Supported props:

```text
colors: { id, color, selected, label, count, disabled }[]
layout: list | grid
size: sm | md | lg | full
radius: sm | md | lg | full
selectionMode: single | multiple
disabled, readOnly, name, label, helpText, validateStatus, onColorClick
```

## Core Patterns

### Use only for swatches

Use Select or RadioCard when choices are textual. Use ColorSelect when the
visual color itself is the primary choice signal.

### Keep selected state in data

Update `colors[].selected` from app state. Do not style selected swatches with
manual `className`.

### Allow runtime color values here

Swatch fill uses inline `backgroundColor` because the data value is the product
color, not a component theme token.

## Controlled selection and focus recovery

`colors[].selected` is application-owned; `onColorClick(color)` proposes a
choice and does not rewrite the collection. Use stable, unique color values
(and stable item IDs when provided). For example:

```tsx
import { useState } from "react"
import { ColorSelect } from "@techsio/ui-kit/molecules/color-select"

function ProductColor() {
  const [selected, setSelected] = useState("#0f172a")
  return <ColorSelect label="Colour" name="colour" selectionMode="single"
    colors={[
      { id: "navy", color: "#0f172a", label: "Navy", selected: selected === "#0f172a" },
      { id: "cream", color: "#fffdd0", label: "Cream", selected: selected === "#fffdd0" },
    ]}
    onColorClick={setSelected} />
}
```

If the focused swatch is removed or becomes disabled, focus recovers to a
surviving enabled neighbour (or the group when none remain), **without**
selecting it or firing `onColorClick`. Collection updates while focus is outside
the group never steal it. A removed selected swatch does not authorize an
implicit replacement selection: the app decides how to reconcile its selection.
Single mode uses a roving radio target; multiple mode uses checkbox semantics.
`readOnly` keeps the value inspectable and submitted but suppresses mutations;
`disabled`, including native disabled-fieldset inheritance, removes interaction.

## Common Mistakes

### HIGH Custom swatch buttons

Wrong:

```tsx
<button style={{ background: color }} className="h-6 w-6 rounded-full" />
```

Correct:

```tsx
<ColorSelect colors={colors} onColorClick={setColor} />
```

Source: libs/ui/src/molecules/color-select.tsx

### HIGH Textual choice in ColorSelect

Wrong:

```tsx
<ColorSelect colors={[{ color: "transparent", label: "Small" }]} />
```

Correct:

```tsx
<RadioGroup>{/* size choices */}</RadioGroup>
```

### MEDIUM Inline shape/sizing

Wrong:

```tsx
<ColorSelect className="grid grid-cols-4 gap-2" colors={colors} />
```

Correct:

```tsx
<ColorSelect layout="grid" size="md" radius="full" colors={colors} />
```

Source: libs/ui/src/tokens/components/molecules/_color-select.css

## Validation Commands

```sh
rg -n "backgroundColor:.*color|rounded-full.*onClick|<ColorSelect[^>]*className" apps
rg -n "<ColorSelect[^>]*colors=|selectionMode=|onColorClick=" apps
rg -n "<ColorSelect[^>]*size=\"(xs|xl)\"|radius=\"(none|circle)\"" apps
```


## Field contracts

Canonical sizes are sm/md/lg, default md. `full` remains a compatibility
fill-container sizing mode. Swatch targets use shared form-control heights and matching component width
aliases (32/44/56px in the standard scale). The visible label follows the size.
Provide `label` (default `Color`), `aria-label` or `aria-labelledby` to name the
group; each product color should also have a human-readable label.

Single selection uses one radio tab stop. Arrow keys move focus and selection,
skipping unavailable colors; Home/End select the first/last enabled swatch.
Horizontal navigation respects RTL. Multiple selection uses independent
checkbox tab stops. `colors[].selected` remains controlled by the consumer;
`onColorClick` must select (not toggle off) a radio value, and may toggle in
multiple mode. Swatch buttons never submit a surrounding form.

`readOnly` retains contrast, focus and selected state but blocks clicks and
keyboard mutation. `disabled` wins and removes the tab stops. `helpText` with
`validateStatus` renders a linked StatusText with the state icon and error ARIA
attributes on each swatch. Caller description IDs are preserved. An optional
`name` submits each selected color as a separate hidden form entry, excluding
disabled colors. Figma-sync handoff is required for the updated sizing/states.

The selected checkmark uses a paired foreground/background badge so its contrast
does not depend on an arbitrary product swatch color.

Swatch captions and counts follow the component typography tokens for each size
(`--text-color-select-sm`, `-md`, `-lg`); they do not inherit fixed body text.

Swatch fills never change brightness on selection or hover: borders and the
contrasting check badge communicate state without misrepresenting product color.
Grid cells and captions share a centered axis; long localized/unbroken labels wrap
inside their track and counts occupy a separate line (including zero).

Large swatches get wider adaptive caption tracks, so ordinary color names stay
on one line; very long names still wrap.
