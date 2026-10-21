---
name: toast-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Toast for
  transient CRUD feedback using the global Zag.js toaster store, Toaster
  portal, useToast, toast types, title, description, close trigger, and token
  styling.
metadata:
  component_version: "1.1.1"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides ux-guidelines"
  sources: "libs/ui/src/molecules/toast.tsx libs/ui/src/tokens/components/molecules/_toast.css libs/ui/stories/molecules/toast.stories.tsx libs/ui/src/molecules/toast.figma.ts https://zagjs.com/components/react/toast"
---

# @techsio/ui-kit Toast Usage

Use Toast for transient feedback after actions. Use StatusText for inline field
messages and Dialog for blocking decisions.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Toast`.

**Use it when**

- Confirming a finished mutation when the UI doesn't show it clearly (drawer closed, row updated, background save).
- Results of async/background work; `Undo` for reversible destructive actions.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Field or form validation | inline errors + FormErrorSummary |
| Irreversible decisions | Dialog role="alertdialog" |
| Persistent page conditions | inline StatusText at the top of the content |
| Information to read or copy later | inline content |

**Do**

- Mount one `<Toaster />` in the app root; keep the kit placement bottom-end (bottom-right) — ux-guidelines/feedback-and-actions#toasts.
- Title `<Object> <past participle>` (`Product created`); optional one-sentence description; at most one action.
- Durations: success/info ~5 s, warning ~8 s; errors with an action and `loading` stay until resolved.
- Update a `loading` toast into success/error instead of stacking a second toast.
- One toast per user action; bulk actions get one summary toast.

**Don't**

- Use toasts for validation errors or as the only copy of an error.
- Put links to the only place something can be found inside a toast.
- Show a toast on page load or for things the user didn't do.

**Copy and states**

- Never `Success!`, `Done` or `Saved` alone — name the object (`Settings saved`).
- Errors: `Product not saved` + reason + `Try again`.

## Setup

```tsx
import { Button } from "@techsio/ui-kit/atoms/button"
import { Toaster, useToast } from "@techsio/ui-kit/molecules/toast"

function AppShell() {
  return <Toaster />
}

function SaveButton() {
  const toaster = useToast()

  return (
    <Button
      onClick={() =>
        toaster.create({
          type: "success",
          title: "Product saved",
          description: "Linen shirt",
        })
      }
    >
      Save changes
    </Button>
  )
}
```

Supported API:

```text
Toaster: portal renderer for global store
useToast(): toaster store
types styled by tokens: error | success | info | warning | loading
store defaults: bottom-end, gap 16, offsets 24px
```

## Core Patterns

### Mount Toaster once

Place `Toaster` in the app shell/layout, not in each button or form.

### Use for operation feedback

CRUD success, failed save, queued operation, or copied-to-clipboard fit Toast.

### Keep messages short

Use title and optional description. Long guidance belongs inline or in Dialog.

## Common Mistakes

### HIGH Local alert div

Wrong:

```tsx
{saved && <div className="fixed bottom-4 right-4 bg-green-600">Saved</div>}
```

Correct:

```tsx
const toaster = useToast()

return <Button onClick={() => toaster.create({ type: "success", title: "Product saved" })}>Save changes</Button>
```

Source: libs/ui/src/molecules/toast.tsx

### HIGH Toaster inside repeated component

Wrong:

```tsx
function SaveButton() { return <><Toaster /><Button /></> }
```

Correct:

```tsx
function AppShell() { return <Toaster /> }
```

Source: https://zagjs.com/components/react/toast

### HIGH Inline toast styling

Wrong:

```tsx
<div className="bg-green-600 text-white shadow-lg">Saved</div>
```

Correct:

```tsx
<Button onClick={() => toaster.create({ type: "success", title: "Product saved" })}>Save changes</Button>
```

Source: libs/ui/src/tokens/components/molecules/_toast.css

## Validation Commands

```sh
rg -n "fixed bottom|toast\\.success|<Toaster|useToast\\(\\)" apps
rg -n "bg-green-600|bg-red-600|role=\"alert\"" apps
rg -n "<Toaster[\\s\\S]{0,200}<Button|function .*Button[\\s\\S]{0,400}<Toaster" apps -U
```

## Isolated notification surfaces

Existing applications may keep one global Toaster and useToast. For independent
roots or previews, wrap each surface in ToastProvider: it owns one store and one
Toaster, scopes useToast, and clears its store on unmount. Alternatively create a
store once with createToaster(options) and pass it to `<Toaster store={store} />`.
Never mount two Toasters for the same store. Region IDs are namespaced per mount.

Supplied titles remain visible for loading notifications. `closable: false`
omits the close button and blocks Escape dismissal. For progress that must stay until
completion, also use `type: "loading"` or an infinite duration; `closable` does not
disable the timer or programmatic dismissal. A supplied action `{ label, onClick }` renders a keyboard
accessible button and dismisses the toast after activation. Text wraps within the
viewport and does not push the close button out of view. Status is expressed by
copy and a decorative status glyph/border on an opaque readable surface.

Toast has no control-size prop: its width is a responsive **content width**,
not a sm/md/lg axis. Embedded actions use canonical control sizes.

The notification region follows the frontmost mounted kit modal so notification
actions and the Alt+T shortcut remain inside its focus trap. Outside modals it
portals to the document body. Its transparent native top-layer host keeps the
notification placement viewport-relative even inside a translated or partial-snap
Drawer. This host does not light-dismiss or consume Escape. Notification actors
and timers survive modal changes; actions must stay visible before receiving focus.
