---
name: tabs-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Tabs for
  switching peer content panels with Zag.js tabs behavior, compound list,
  triggers, content, indicator, orientation, activation mode, variants, fitted,
  and justify props.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - zag-compound-components
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/tabs.tsx"
  - "libs/ui/src/tokens/components/molecules/_tabs.css"
  - "libs/ui/stories/molecules/tabs.stories.tsx"
  - "libs/ui/src/molecules/figma/tabs.figma.tsx"
  - "https://zagjs.com/components/react/tabs"
---

# @techsio/ui-kit Tabs Usage

Use Tabs for peer panels in the same page context. Use Steps for ordered
workflow progress and Breadcrumb for hierarchy.

## Setup

```tsx
<Tabs defaultValue="details" variant="line">
  <Tabs.List>
    <Tabs.Trigger value="details">Details</Tabs.Trigger>
    <Tabs.Trigger value="reviews">Reviews</Tabs.Trigger>
    <Tabs.Indicator />
  </Tabs.List>
  <Tabs.Content value="details">Details content</Tabs.Content>
  <Tabs.Content value="reviews">Reviews content</Tabs.Content>
</Tabs>
```

Supported props:

```text
variant: default | line | solid | outline
size: sm | md | lg
orientation: horizontal | vertical
activationMode: automatic | manual
fitted, justify start | center | end
value/defaultValue, loopFocus, onValueChange
```

## Core Patterns

### Match trigger and content values

Every trigger value should have matching content value.

### Use line variant with indicator

`Tabs.Indicator` is meaningful for `line`; other variants hide it.

### Do not use Tabs for navigation pages

If changing the URL/page hierarchy, use Link/Breadcrumb/Pagination.

## Common Mistakes

### HIGH Button state tabs

Wrong:

```tsx
<Button onClick={() => setTab("a")}>A</Button>{tab === "a" && <div />}
```

Correct:

```tsx
<Tabs defaultValue="a"><Tabs.Trigger value="a">A</Tabs.Trigger><Tabs.Content value="a" /></Tabs>
```

Source: libs/ui/src/molecules/tabs.tsx

### HIGH Value mismatch

Wrong:

```tsx
<Tabs.Trigger value="details" /><Tabs.Content value="detail" />
```

Correct:

```tsx
<Tabs.Trigger value="details" /><Tabs.Content value="details" />
```

Source: https://zagjs.com/components/react/tabs

### HIGH Inline selected styling

Wrong:

```tsx
<Tabs.Trigger className="data-[selected]:bg-primary" value="a" />
```

Correct:

```tsx
<Tabs variant="solid"><Tabs.Trigger value="a" /></Tabs>
```

Source: libs/ui/src/tokens/components/molecules/_tabs.css

## Validation Commands

```sh
rg -n "setTab|<Tabs\\.Trigger[^>]*className=.*(bg-|text-|border-|data-\\[selected)" apps
rg -P -n "<Tabs\\.Trigger(?![^>]*value=)|<Tabs\\.Content(?![^>]*value=)" apps
rg -n "<Tabs[^>]*variant=\"(primary|underline)\"" apps
```
