---
name: toast-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Toast for
  transient CRUD feedback using the global Zag.js toaster store, Toaster
  portal, useToast, toast types, title, description, close trigger, and token
  styling.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/toast.tsx"
  - "libs/ui/src/tokens/components/molecules/_toast.css"
  - "libs/ui/stories/molecules/toast.stories.tsx"
  - "libs/ui/src/molecules/figma/toast.figma.tsx"
  - "https://zagjs.com/components/react/toast"
---

# @techsio/ui-kit Toast Usage

Use Toast for transient feedback after actions. Use StatusText for inline field
messages and Dialog for blocking decisions.

## Setup

```tsx
import { Toaster, useToast } from "@techsio/ui-kit/molecules/toast"

function AppShell() {
  return <Toaster />
}

const toaster = useToast()
toaster.create({ type: "success", title: "Saved", description: "Changes were saved." })
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
useToast().create({ type: "success", title: "Saved" })
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
toaster.create({ type: "success", title: "Saved" })
```

Source: libs/ui/src/tokens/components/molecules/_toast.css

## Validation Commands

```sh
rg -n "fixed bottom|toast\\.success|<Toaster|useToast\\(\\)" apps
rg -n "bg-green-600|bg-red-600|role=\"alert\"" apps
rg -n "<Toaster[\\s\\S]{0,200}<Button|function .*Button[\\s\\S]{0,400}<Toaster" apps -U
```

