---
name: accordion-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Accordion for
  collapsible sections using the Zag.js-backed compound anatomy, supported
  variant, shadow, size, value, multiple, and collapsible props.
metadata:
  component_version: "1.0.1"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux zag-compound-components app-token-overrides ux-guidelines"
  sources: "libs/ui/src/molecules/accordion.tsx libs/ui/src/tokens/components/molecules/_accordion.css libs/ui/stories/molecules/accordion.stories.tsx libs/ui/src/molecules/accordion.figma.ts https://zagjs.com/components/react/accordion"
---

# @techsio/ui-kit Accordion Usage

Use Accordion for related collapsible content sections. Do not build disclosure
behavior with local state and native buttons when this component fits.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Accordion`.

**Use it when**

- Optional or secondary content the user may want to expand: FAQs, shipping details, advanced settings.
- Long pages where users scan headings and open only what they need.
- Mobile layouts that stack content which sits side by side on desktop (with care — see Don't).

**Use something else when**

| Need | Use instead |
| --- | --- |
| Peer views of the same object the user switches between | Tabs |
| Ordered steps that must be completed in sequence | Steps |
| Navigation links in a tree | VerticalNavigation |
| Content everyone needs to read (prices, legal terms, errors) | keep it visible, no disclosure |

**Do**

- Write triggers as short noun phrases or questions that predict the content (`Shipping and returns`, `Can I change my order?`).
- Open the first item by default when it answers the most common question; otherwise start collapsed.
- Allow multiple open items for reference content; single-open only when items are mutually exclusive steps.
- Keep the chevron/indicator from the component — it is the only affordance that the heading is interactive.

**Don't**

- Hide required form fields or validation errors inside a collapsed item.
- Nest accordions inside accordions.
- Put primary actions only inside a collapsed panel.
- Use an accordion for one item — show the content or use a Link to a detail page.

**Copy and states**

- Trigger text in sentence case, no trailing colon or punctuation.
- If a collapsed section contains an error, open it on submit and focus the field (see ux-guidelines/states).

## Setup

```tsx
import { Accordion } from "@techsio/ui-kit/molecules/accordion"

<Accordion defaultValue={["shipping"]} multiple={false}>
  <Accordion.Item value="shipping">
    <Accordion.Header>
      <Accordion.Title>Shipping</Accordion.Title>
      <Accordion.Indicator />
    </Accordion.Header>
    <Accordion.Content>Delivery options and limits.</Accordion.Content>
  </Accordion.Item>
</Accordion>
```

Supported root props:

```text
variant: default | borderless | child
shadow: sm | md | none
size: sm | md | lg
value/defaultValue: string[]
collapsible, multiple, disabled, dir, onChange
```

## Core Patterns

### Keep Zag anatomy intact

Use `Accordion.Item`, `Accordion.Header`, `Accordion.Content`, and optional
`Accordion.Indicator`, `Accordion.Title`, `Accordion.Subtitle`.

### Choose behavior from content model

```text
single open section -> multiple=false
FAQ-style independent sections -> multiple=true
must keep one section open -> collapsible=false
nested accordion -> variant=child
```

### Let tokens own visual state

Do not duplicate expanded, hover, padding, border, or icon rotation styling in
app `className`. Override `_accordion.css` tokens if the app needs a different
visual system.

## Common Mistakes

### HIGH Native disclosure

Wrong:

```tsx
<button onClick={() => setOpen(!open)}>Shipping</button>
{open && <div>Delivery options</div>}
```

Correct:

```tsx
<Accordion.Item value="shipping">
  <Accordion.Header><Accordion.Title>Shipping</Accordion.Title></Accordion.Header>
  <Accordion.Content>Delivery options</Accordion.Content>
</Accordion.Item>
```

Source: libs/ui/src/molecules/accordion.tsx

### HIGH Value type mismatch

Wrong:

```tsx
<Accordion defaultValue="shipping" />
```

Correct:

```tsx
<Accordion defaultValue={["shipping"]} />
```

Source: libs/ui/src/molecules/accordion.tsx

### HIGH Inline state styling

Wrong:

```tsx
<Accordion.Content className="bg-white p-4 text-gray-900" />
```

Correct:

```tsx
<Accordion.Content />
```

Source: libs/ui/src/tokens/components/molecules/_accordion.css

## Validation Commands

```sh
rg -n "setOpen|<details|<summary|<Accordion[^>]*defaultValue=\"|<Accordion[^>]*value=\"" apps
rg -n "<Accordion[^>]*className=.*(bg-|text-|border-|p-|px-|py-)" apps
rg -n "<Accordion\\.Content[^>]*className=.*(bg-|text-|p-|px-|py-)" apps
```

