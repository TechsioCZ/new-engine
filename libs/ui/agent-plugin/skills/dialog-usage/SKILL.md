---
name: dialog-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Dialog for
  modal dialogs, alert dialogs, drawers, actions, focus management, placement,
  size, and close behavior backed by Zag.js.
metadata:
  component_version: "1.0.2"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides ux-guidelines"
  sources: "libs/ui/src/molecules/dialog.tsx libs/ui/src/tokens/components/molecules/_dialog.css libs/ui/stories/molecules/dialog.stories.tsx libs/ui/src/molecules/dialog.figma.ts https://zagjs.com/components/react/dialog"
---

# @techsio/ui-kit Dialog Usage

Use Dialog for focused overlays and confirmations. Use Popover for lightweight
anchored content and Tooltip for short supplemental help.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Dialog`.

**Use it when**

- A focused task or decision that must be finished or cancelled before continuing.
- Irreversible confirmations with `role="alertdialog"`.
- Create / edit / read of a record over its list with `placement="right"` (drawer pattern from the CRUD reference).

**Use something else when**

| Need | Use instead |
| --- | --- |
| Lightweight anchored content (filters, small forms next to their trigger) | Popover |
| A hint on hover/focus | Tooltip |
| Confirming a finished action | Toast |
| Persistent navigation or edge panels | Sidebar / Drawer |
| A long, multi-section record | a full page (record editor) |

**Do**

- Title = the action or record (`New product`, `Edit product`); destructive title = question (`Delete this product?`).
- Put actions in the `actions` footer: `[Cancel] [Primary]`, bottom-right, one primary.
- In an alertdialog the destructive button replaces the primary and repeats the verb + object (`Delete product`); the description names the record and consequences.
- Ask before closing a dirty form (`Discard unsaved changes?`).
- Size to the content: `sm` for confirmations, `md` for forms; right drawer for record CRUD.

**Don't**

- Open a dialog from a dialog; replace the content or use steps inside one dialog.
- Use a dialog for success messages or marketing interruptions on load.
- Put the only close affordance inside scrolled content — the close button and `Cancel` stay visible.
- Use `Yes` / `No` buttons.

**Copy and states**

- Buttons follow ux-guidelines/ux-writing#button-labels; descriptions are one or two sentences about consequences.

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

Controlled dialogs close on Escape as soon as their content is mounted. The
component composes any Zag content key handler first and respects
`closeOnEscape={false}` or a prevented keyboard event.

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
