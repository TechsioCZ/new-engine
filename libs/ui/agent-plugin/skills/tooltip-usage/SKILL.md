---
name: tooltip-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Tooltip for
  supplemental hover/focus help using the Zag.js tooltip wrapper, supported
  timing, placement, interaction, controlled state, and token styling props.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/atoms/tooltip.tsx"
  - "libs/ui/src/tokens/components/atoms/_tooltip.css"
  - "libs/ui/stories/atoms/tooltip.stories.tsx"
  - "libs/ui/src/atoms/figma/tooltip.figma.tsx"
  - "https://zagjs.com/components/react/tooltip"
---

# @techsio/ui-kit Tooltip Usage

Use Tooltip for short supplemental information on hover/focus. Do not use it
for required instructions, blocking errors, or primary content.

## Setup

```tsx
import { Button } from "@techsio/ui-kit/atoms/button"
import { Tooltip } from "@techsio/ui-kit/atoms/tooltip"

<Tooltip content="Search products" placement="top">
  <Button aria-label="Search" icon="icon-[mdi--magnify]" />
</Tooltip>
```

Supported UI-kit props:

```text
content: ReactNode
size: sm | md | lg
variant: default | outline
openDelay, closeDelay, interactive, defaultOpen, open, onOpenChange, disabled
closeOnEscape, closeOnPointerDown, closeOnScroll, closeOnClick
placement, gutter, offset, flip, sameWidth, boundary, listeners, strategy
```

## Core Patterns

### Use for supplemental help only

```tsx
<Tooltip content="The SKU is visible to warehouse staff.">
  <Button theme="unstyled" aria-label="SKU help" icon="icon-[mdi--help-circle-outline]" />
</Tooltip>
```

If the text is required to complete the task, render visible help text instead.

### Prefer component triggers

```tsx
<Tooltip content="Delete product">
  <Button variant="danger" aria-label="Delete product" icon="icon-[mdi--trash-can-outline]" />
</Tooltip>
```

Use UI-kit Button/Icon props for triggers instead of native buttons.

### Use Zag positioning props through the wrapper

```tsx
<Tooltip
  content="Copied"
  placement="bottom-end"
  openDelay={100}
  closeDelay={150}
>
  <Button>Copy</Button>
</Tooltip>
```

The wrapper maps placement/timing/dismiss behavior to the Zag machine.

## Common Mistakes

### HIGH Native title tooltip

Wrong:

```tsx
<Button title="Delete product">Delete</Button>
```

Correct:

```tsx
<Tooltip content="Delete product">
  <Button>Delete</Button>
</Tooltip>
```

Source: libs/ui/src/atoms/tooltip.tsx

### HIGH Custom hover popover

Wrong:

```tsx
<div onMouseEnter={open} className="relative">
  <button>Help</button>
  {open && <div className="absolute rounded bg-black p-2 text-white">Help</div>}
</div>
```

Correct:

```tsx
<Tooltip content="Help">
  <Button>Help</Button>
</Tooltip>
```

Source: https://zagjs.com/components/react/tooltip

### HIGH Inline tooltip appearance

Wrong:

```tsx
<Tooltip content="Help" className="bg-black text-white rounded px-2" />
```

Correct:

```tsx
<Tooltip content="Help" variant="default" size="md" />
```

Use `_tooltip.css` or app token overrides for visual changes.

Source: libs/ui/src/tokens/components/atoms/_tooltip.css

### MEDIUM Critical information hidden in tooltip

Wrong:

```tsx
<Tooltip content="Password must contain 12 characters">
  <Input type="password" />
</Tooltip>
```

Correct:

```tsx
<FormInput
  type="password"
  helperText="Password must contain 12 characters."
/>
```

Visible field help should not depend on hover/focus discovery.

## Validation Commands

```sh
rg -n "title=\"|onMouseEnter|onMouseLeave" apps
rg -n "<Tooltip[^>]*className=.*(bg-|text-|rounded-|px-|py-)" apps
rg -U -n "<Tooltip[\\s\\S]{0,240}<button\\b" apps
rg -n "openDelay|closeDelay|placement|interactive|closeOn" apps
```
