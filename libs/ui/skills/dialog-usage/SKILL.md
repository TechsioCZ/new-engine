---
name: dialog-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Dialog for
  modal dialogs, alert dialogs, drawers, actions, focus management, placement,
  size, and close behavior backed by Zag.js.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/dialog.tsx"
  - "libs/ui/src/tokens/components/molecules/_dialog.css"
  - "libs/ui/stories/molecules/dialog.stories.tsx"
  - "libs/ui/src/molecules/figma/dialog.figma.tsx"
  - "https://zagjs.com/components/react/dialog"
---

# @techsio/ui-kit Dialog Usage

Use Dialog for focused overlays and confirmations. Use Popover for lightweight
anchored content and Tooltip for short supplemental help.

## Setup

```tsx
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import { Button } from "@techsio/ui-kit/atoms/button"

<Dialog
  role="alertdialog"
  title="Delete product?"
  description="This action cannot be undone."
  actions={<Button variant="danger">Delete</Button>}
/>
```

Supported props:

```text
placement: center | left | right | top | bottom
size: xs | sm | md | lg | xl | full
behavior: modal | modeless
position: fixed | absolute | sticky | relative
role: dialog | alertdialog
open, onOpenChange, customTrigger, triggerText, title, description, actions
closeOnEscape, closeOnInteractOutside, preventScroll, trapFocus, modal, portal
```

## Core Patterns

### Use alertdialog for destructive confirmation

Use `role="alertdialog"` and a danger Button action for irreversible actions.

### Use placement for drawers

`placement="left" | "right" | "top" | "bottom"` creates drawer behavior with
size-driven width or height.

### Use tokens for visual changes

Do not patch overlay, padding, width, or close button classes in apps. Override
dialog tokens when the app theme needs changes.

## Common Mistakes

### HIGH Custom modal

Wrong:

```tsx
{open && <div className="fixed inset-0"><div role="dialog" /></div>}
```

Correct:

```tsx
<Dialog open={open} onOpenChange={setOpenDetails} title="Edit product" />
```

Source: libs/ui/src/molecules/dialog.tsx

### HIGH Popover used for blocking confirmation

Wrong:

```tsx
<Popover><Button variant="danger">Delete</Button></Popover>
```

Correct:

```tsx
<Dialog role="alertdialog" actions={<Button variant="danger">Delete</Button>} />
```

### HIGH Inline dialog sizing

Wrong:

```tsx
<Dialog className="w-[720px] p-8 rounded-xl" />
```

Correct:

```tsx
<Dialog size="lg" placement="center" />
```

Source: libs/ui/src/tokens/components/molecules/_dialog.css

## Validation Commands

```sh
rg -n "role=\"dialog\"|fixed inset-0|alertdialog|<Dialog[^>]*className=.*(w-|h-|p-|rounded-|bg-)" apps
rg -U -n "<Popover[\\s\\S]{0,300}(Delete|Remove|danger)" apps
rg -n "<Dialog[^>]*role=\"(modal|drawer)\"" apps
```
