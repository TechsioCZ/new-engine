---
name: zag-compound-components
description: >
  Use when creating or refactoring @techsio/ui-kit interactive components with
  Zag.js machine/connect APIs, normalizeProps, React context, compound
  Component.Subcomponent assignments, slots, adapter props, and data attribute
  state styling.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-authoring
  - tailwind-token-authoring
sources:
  - "libs/ui/AGENTS.md"
  - "libs/ui/src/molecules/accordion.tsx"
  - "libs/ui/src/molecules/carousel.tsx"
  - "libs/ui/src/molecules/select.tsx"
  - "libs/ui/src/molecules/tree-view.tsx"
  - "libs/ui/src/organisms/header.tsx"
  - "https://chakra-ui.com/docs/components/accordion"
  - "https://chakra-ui.com/docs/components/menu"
  - "https://github.com/TechsioCZ/new-engine/issues/295"
---

This skill builds on `component-authoring` and `tailwind-token-authoring`. Read
them first for component slice and token rules.

# @techsio/ui-kit Zag Compound Components

Use this for interactive components in `libs/ui`.

## Setup

Minimum Zag-backed root:

```tsx
import * as accordion from "@zag-js/accordion"
import { normalizeProps, useMachine } from "@zag-js/react"
import { createContext, useContext, useId, type ReactNode } from "react"
import { tv } from "../utils"

const styles = tv({
  slots: {
    root: "rounded-accordion bg-accordion-bg",
    trigger: "data-disabled:cursor-not-allowed data-[state=open]:bg-accordion-bg-open",
  },
})

type AccordionApi = ReturnType<typeof accordion.connect>
const AccordionContext = createContext<AccordionApi | null>(null)

function useAccordionContext() {
  const api = useContext(AccordionContext)
  if (!api) throw new Error("Accordion components must be used within Accordion.Root")
  return api
}

export function Accordion({ children }: { children: ReactNode }) {
  const service = useMachine(accordion.machine, { id: useId() })
  const api = accordion.connect(service, normalizeProps)
  const { root } = styles()

  return (
    <AccordionContext.Provider value={api}>
      <div {...api.getRootProps()} className={root()}>
        {children}
      </div>
    </AccordionContext.Provider>
  )
}
```

## Core Patterns

### Check Chakra compound structure before naming parts

```tsx
<Accordion.Root>
  <Accordion.Item>
    <Accordion.ItemTrigger>
      <Accordion.ItemIndicator />
    </Accordion.ItemTrigger>
    <Accordion.ItemContent>
      <Accordion.ItemBody />
    </Accordion.ItemContent>
  </Accordion.Item>
</Accordion.Root>
```

Before inventing subcomponent names, compare the proposed API with Chakra UI
v3 compound patterns such as Accordion and Menu. Keep the local API aligned
with `Root`, `Trigger`, `Content`, `Item`, `Indicator`, `Positioner`, and
similarly scoped names when they match the component anatomy.

### Spread Zag props on the matching part

```tsx
Carousel.Next = function CarouselNext() {
  const { api } = useCarouselContext()
  return <Button {...api.getNextTriggerProps()} icon="token-icon-carousel-next" />
}
```

Let Zag own ARIA, keyboard, disabled state, and event handlers.

### Guard every compound context

```tsx
function useCarouselContext() {
  const context = useContext(CarouselContext)
  if (!context) {
    throw new Error("Carousel components must be used within Carousel.Root")
  }
  return context
}
```

The error should name the component and required root.

### Assign subcomponents directly

```tsx
export function Carousel(props: CarouselRootProps) {
  return <CarouselRoot {...props} />
}

Carousel.Slides = function CarouselSlides(props: CarouselSlidesProps) {
  return <div {...props} />
}
```

Do not export an object of subcomponents as the main API.

### Style state through data attributes

```tsx
const tabs = tv({
  slots: {
    trigger: "data-selected:bg-tabs-trigger-bg-selected data-disabled:opacity-disabled",
  },
})
```

Use boolean shorthand such as `data-disabled:` and bracket syntax for
enumerated values such as `data-[state=open]:`.

## Common Mistakes

### HIGH Manual ARIA instead of Zag props

Wrong:

```tsx
<button aria-expanded={open} onKeyDown={handleKeyDown}>
  Toggle
</button>
```

Correct:

```tsx
<button {...api.getTriggerProps({ value: item.value })}>
  Toggle
</button>
```

Manual ARIA usually misses keyboard or focus behavior already encoded in the
Zag machine.

Source: libs/ui/AGENTS.md

### HIGH Subcomponent outside root

Wrong:

```tsx
<Carousel.Next />
```

Correct:

```tsx
<Carousel.Root slideCount={slides.length}>
  <Carousel.Next />
</Carousel.Root>
```

Compound children require the provider value created by the root.

Source: libs/ui/src/molecules/carousel.tsx

### MEDIUM Local state duplicates machine state

Wrong:

```tsx
const [open, setOpen] = useState(false)
return <button data-state={open ? "open" : "closed"} onClick={() => setOpen(!open)} />
```

Correct:

```tsx
const service = useMachine(accordion.machine, { id: useId() })
const api = accordion.connect(service, normalizeProps)
return <button {...api.getItemTriggerProps({ value: "details" })} />
```

Duplicating Zag state silently desynchronizes ARIA, keyboard behavior, and data
attributes.

Source: libs/ui/AGENTS.md

### MEDIUM Compound taxonomy drift

Wrong:

```text
Create a rigid FormCheckbox wrapper because a custom app layout is needed.
```

Correct:

```text
Prefer composable primitives and slots first. Add wrappers only after the
component API cannot express the use case.
```

Issue 295 records the taxonomy direction: primitive compounds should be
composable, while opinionated form wrappers stay separate.

Source: https://github.com/TechsioCZ/new-engine/issues/295

### MEDIUM Inventing nonstandard subcomponent names

Wrong:

```tsx
TreeView.Panel = function TreeViewPanel() {
  return <div />
}
```

Correct:

```tsx
TreeView.Content = function TreeViewContent() {
  return <div />
}
```

Check Chakra Accordion/Menu anatomy before naming parts. Use familiar compound
names when the role matches, and only diverge when the local component anatomy
requires a clearer name.

Source: https://chakra-ui.com/docs/components/accordion

## Validation Commands

```sh
bunx biome check --write libs/ui/src/molecules/carousel.tsx
bunx nx run ui:build
pnpm --dir libs/ui validate:tokens
pnpm --dir libs/ui build:storybook
pnpm --dir libs/ui storybook:a11y
```
