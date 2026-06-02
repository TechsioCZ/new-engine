---
name: color-select-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit ColorSelect
  for choosing color swatches with supported layout, size, radius, disabled
  state, selected state, labels, counts, and single/multiple roles.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/color-select.tsx"
  - "libs/ui/src/tokens/components/molecules/_color-select.css"
  - "libs/ui/stories/molecules/color-select.stories.tsx"
---

# @techsio/ui-kit ColorSelect Usage

Use ColorSelect for product color filters or swatch choices. It is not a
general Select replacement.

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
disabled, onColorClick
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

