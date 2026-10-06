---
name: popover-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Popover for
  anchored non-blocking content using Zag.js compound parts, placement,
  portalling, close behavior, arrow, title, description, and close trigger.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux zag-compound-components app-token-overrides ux-guidelines"
  sources: "libs/ui/src/molecules/popover.tsx libs/ui/src/tokens/components/molecules/_popover.css libs/ui/stories/molecules/popover.stories.tsx libs/ui/src/molecules/popover.figma.ts https://zagjs.com/components/react/popover"
---

# @techsio/ui-kit Popover Usage

Use Popover for anchored, dismissible content. Use Dialog for modal flows and
Tooltip for tiny supplemental text.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Popover`.

**Use it when**

- Small interactive content anchored to its trigger: filter panels, colour pickers, quick edit of one value, share options.

**Use something else when**

| Need | Use instead |
| --- | --- |
| A decision that must block the page | Dialog |
| A read-only hint | Tooltip |
| A list of commands | Menu |
| Large forms | Dialog / drawer |

**Do**

- Keep content short; if it scrolls, it should be a dialog.
- End filter popovers with `[Reset] [Apply]` bottom-right, or apply instantly — not both.
- Return focus to the trigger on close; close on Escape and outside click.

**Don't**

- Put required information only in a popover.
- Open popovers on hover.

**Copy and states**

- Trigger text says what opens (`Filters`, `Share`); count active filters in the trigger (`Filters (2)`).

## Setup

```tsx
import { Popover } from "@techsio/ui-kit/molecules/popover"

<Popover placement="bottom-end">
  <Popover.Trigger>Filters</Popover.Trigger>
  <Popover.Positioner>
    <Popover.Content>
      <Popover.Arrow />
      <Popover.Title>Filters</Popover.Title>
      <Popover.Description>Refine results.</Popover.Description>
      <Popover.CloseTrigger />
    </Popover.Content>
  </Popover.Positioner>
</Popover>
```

Supported root props:

```text
size sm | md | lg, shadow, border
placement, gutter, offset, flip, sameWidth, slide, overflowPadding
open/defaultOpen, onOpenChange, modal, portalled
closeOnEscape, closeOnInteractOutside, autoFocus
```

## Core Patterns

### Keep positioner/content anatomy

`Popover.Positioner` conditionally renders and portals content. Do not move
Content outside the root.

### Use for non-blocking anchored content

Filters, small menus with custom controls, and contextual panels fit Popover.
Confirmations and forms that must trap focus should use Dialog.

### Use close trigger for explicit close

`Popover.CloseTrigger` wires Zag close behavior and supplies a token close icon.

## Common Mistakes

### HIGH Custom positioned panel

Wrong:

```tsx
<div className="absolute right-0 top-full rounded bg-white shadow" />
```

Correct:

```tsx
<Popover><Popover.Trigger>Open</Popover.Trigger><Popover.Positioner><Popover.Content /></Popover.Positioner></Popover>
```

Source: libs/ui/src/molecules/popover.tsx

### HIGH Dialog-worthy content in Popover

Wrong:

```tsx
<Popover><FormInput id="email" label="Email" /></Popover>
```

Correct:

```tsx
<Dialog title="Edit email">{/* form */}</Dialog>
```

### HIGH Inline panel visuals

Wrong:

```tsx
<Popover.Content className="bg-white p-4 shadow-xl rounded-xl" />
```

Correct:

```tsx
<Popover size="md" shadow border />
```

Source: libs/ui/src/tokens/components/molecules/_popover.css

## Validation Commands

```sh
rg -n "absolute.*top-full|<Popover\\.Content[^>]*className=.*(bg-|p-|rounded-|shadow-)" apps
rg -U -P -n "<Popover(?![\\s\\S]{0,500}<Popover\\.Positioner)" apps
rg -U -n "<Popover[\\s\\S]{0,400}<Form(Input|Textarea|Checkbox)" apps
```
