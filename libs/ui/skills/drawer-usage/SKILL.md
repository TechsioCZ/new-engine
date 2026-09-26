---
component_version: "1.0.0"
name: drawer-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Drawer for
  transient edge panels, modal or non-modal behavior, snap points, swipe
  gestures, multiple triggers, custom portals, controlled state, and stacks.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - zag-compound-components
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/drawer.tsx"
  - "libs/ui/src/internal/molecules/drawer.context.tsx"
  - "libs/ui/src/internal/molecules/drawer.styles.ts"
  - "libs/ui/src/tokens/components/molecules/_drawer.css"
  - "libs/ui/stories/molecules/drawer.stories.tsx"
  - "https://zagjs.com/components/react/drawer"
---

# @techsio/ui-kit Drawer Usage

Use Drawer for transient panels that enter from a viewport or container edge.
Use Sidebar for persistent application navigation, Dialog for centered focused
flows, and Popover for anchored contextual content.

## Setup

```tsx
import { Drawer } from "@techsio/ui-kit/molecules/drawer"

<Drawer placement="end" size="md">
  <Drawer.Trigger>Open cart</Drawer.Trigger>
  <Drawer.Portal>
    <Drawer.Backdrop />
    <Drawer.Positioner>
      <Drawer.Content>
        <Drawer.Grabber><Drawer.GrabberIndicator /></Drawer.Grabber>
        <Drawer.Header>
          <Drawer.Title>Cart</Drawer.Title>
          <Drawer.Description>Review items before checkout.</Drawer.Description>
        </Drawer.Header>
        <Drawer.Body>{/* cart content */}</Drawer.Body>
        <Drawer.Footer><Drawer.CloseTrigger>Close</Drawer.CloseTrigger></Drawer.Footer>
      </Drawer.Content>
    </Drawer.Positioner>
  </Drawer.Portal>
</Drawer>
```

Supported root props:

```text
placement: start | end | top | bottom
size: xs | sm | md | lg | xl | full
open/defaultOpen, onOpenChange
triggerValue/defaultTriggerValue, onTriggerValueChange
snapPoints, snapPoint/defaultSnapPoint, onSnapPointChange
snapToSequentialPoints, swipeVelocityThreshold, closeThreshold
modal, trapFocus, preventScroll, restoreFocus
closeOnEscape, closeOnInteractOutside, role
ids, dir, getRootNode, initialFocusEl, finalFocusEl
onEscapeKeyDown, onFocusOutside, onInteractOutside, onPointerDownOutside
preventDragOnScroll, swipeVelocityThreshold, closeThreshold
lazyMount, unmountOnExit, immediate, skipAnimationOnMount
onEnterComplete, onExitComplete
```

## Core Patterns

### Preserve the compound anatomy

Keep Backdrop and Positioner inside Portal, then place Content inside
Positioner. Title and Description supply the accessible dialog name and
description. Do not conditionally remove the portal based on `open`; Drawer
coordinates exit presence itself.

### Use placement instead of swipeDirection

`placement` owns both the rendered edge and the closing gesture. `start` and
`end` follow text direction. Root intentionally does not expose
`swipeDirection`; `Drawer.SwipeArea` accepts an optional opening direction.
For a machine-level integration, call the exported `useDrawer` hook with raw
Zag props and provide its result to `Drawer.RootProvider`. This is also the
escape hatch for a custom `swipeDirection` or externally shared machine API.
This advanced surface tracks the exact pinned Zag 1.43.3 machine contract;
prefer the compound root API when raw machine access is unnecessary.

```tsx
const drawer = useDrawer({ swipeDirection: "end", open, onOpenChange })

<Drawer.RootProvider value={drawer} size="sm">
  {/* standard anatomy */}
</Drawer.RootProvider>
```

### Add snap points for draggable sheets

Use numeric viewport ratios or CSS lengths such as `"320px"` and `"24rem"`.
Pair snap points with Grabber and GrabberIndicator. Set
`draggable={false}` on Content when dragging should start only from the
grabber.

```tsx
<Drawer placement="bottom" snapPoints={[0.25, 0.5, 1]} defaultSnapPoint={0.5}>
  {/* standard anatomy */}
</Drawer>
```

### Select content with multiple triggers

Give each `Drawer.Trigger` a stable `value`. Read `api.triggerValue` through
`Drawer.Context` or control it with `triggerValue` and
`onTriggerValueChange`.

### Coordinate nested drawers with Stack

Wrap related roots in `Drawer.Stack`. Nested roots inherit the stack store;
`Drawer.Indent` and `Drawer.IndentBackground` expose optional app-shell depth
effects.

### Scope rendering with Portal

Pass a mounted element ref to `Drawer.Portal container={ref}`. A custom mount
target does not change fixed positioning by itself. Container-scoped panels
must provide an appropriate positioned containing block and override Backdrop
and Positioner positioning together.

### Configure non-modal panels completely

For a panel that permits background interaction, use `modal={false}` together
with `trapFocus={false}` and `preventScroll={false}`. Omit Backdrop when the
background should remain directly interactive.

## Common Mistakes

### HIGH Custom edge panel state

Wrong:

```tsx
{open && <aside className="fixed right-0 top-0 h-full" />}
```

Correct:

```tsx
<Drawer placement="end"><Drawer.Trigger>Open</Drawer.Trigger>{/* anatomy */}</Drawer>
```

Source: libs/ui/src/molecules/drawer.tsx

### HIGH Conditional unmount bypasses presence

Wrong:

```tsx
{open ? <Drawer.Portal>{/* content */}</Drawer.Portal> : null}
```

Correct: render the anatomy continuously and use `lazyMount` and
`unmountOnExit` on Drawer.Root.

### HIGH Physical placement in application code

Wrong:

```tsx
<Drawer swipeDirection="left" />
```

Correct:

```tsx
<Drawer placement="start" />
```

Source: libs/ui/src/molecules/drawer.tsx

### MEDIUM Non-modal root with modal focus behavior

Wrong:

```tsx
<Drawer modal={false}>{/* background should remain interactive */}</Drawer>
```

Correct:

```tsx
<Drawer modal={false} trapFocus={false} preventScroll={false}>
  {/* omit Backdrop when appropriate */}
</Drawer>
```

## Validation Commands

```sh
rg -n "fixed.*(left|right|top|bottom)-0|<aside[^>]*className=.*fixed" apps
rg -n "<Drawer[^>]*swipeDirection=|modal=\{false\}" apps
rg -U -n "open[\s\S]{0,120}<Drawer\.Portal" apps
rg -n "<Drawer\.Content[^>]*className=.*(bg-|w-|h-|rounded-|shadow-)" apps
```
