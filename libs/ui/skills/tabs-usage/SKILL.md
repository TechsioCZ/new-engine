---
name: tabs-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Tabs for
  switching peer content panels with Zag.js tabs behavior, compound list,
  triggers, content, indicator, orientation, activation mode, variants, fitted,
  and justify props.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - zag-compound-components
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/molecules/tabs.tsx"
  - "libs/ui/src/tokens/components/molecules/_tabs.css"
  - "libs/ui/stories/molecules/tabs.stories.tsx"
  - "libs/ui/src/molecules/tabs.figma.ts"
  - "https://zagjs.com/components/react/tabs"
---

# @techsio/ui-kit Tabs Usage

Use Tabs for peer panels in the same page context. Use Steps for ordered
workflow progress and Breadcrumb for hierarchy.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Tabs`.

**Use it when**

- Peer views of the same object or page: record sections (Content, SEO, History), settings groups (vertical).

**Use something else when**

| Need | Use instead |
| --- | --- |
| Sequential steps | Steps |
| Optional expandable content | Accordion |
| Navigation between pages | links / Sidebar |
| Two views of the same data (table/grid) | a segmented control or icon toggle |

**Do**

- Keep labels short (1–2 words) and the first tab the content users came for.
- Preserve the active tab in the URL for linkable settings/records.
- Show errors in a tab's label (count badge) when the invalid field is in a hidden tab.

**Don't**

- Nest tabs inside tabs.
- Use tabs when users must compare content across tabs.

**Copy and states**

- Nouns in sentence case; counts in parentheses or a Badge (`Orders 12`).

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
