---
name: tabs-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Tabs for
  switching peer content panels with Zag.js tabs behavior, compound list,
  triggers, content, indicator, orientation, activation mode, variants, fitted,
  and justify props.
metadata:
  component_version: "1.2.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux zag-compound-components app-token-overrides ux-guidelines"
  sources: "libs/ui/src/molecules/tabs.tsx libs/ui/src/tokens/components/molecules/_tabs.css libs/ui/stories/molecules/tabs.stories.tsx libs/ui/src/molecules/tabs.figma.ts https://zagjs.com/components/react/tabs"
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
  <Tabs.List aria-label="Product information">
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
<Tabs defaultValue="overview">
  <Tabs.List aria-label="Product information">
    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
    <Tabs.Trigger value="delivery">Delivery</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="overview">Product specifications.</Tabs.Content>
  <Tabs.Content value="delivery">Dispatch within two working days.</Tabs.Content>
</Tabs>
```

Source: libs/ui/src/molecules/tabs.tsx

### HIGH Value mismatch

Wrong:

```tsx
<Tabs.Trigger value="details" /><Tabs.Content value="detail" />
```

Correct:

```tsx
{/* Partial fragment inside the Setup structure, not a standalone tab group. */}
<Tabs.Trigger value="details">Details</Tabs.Trigger>
<Tabs.Content value="details">Product dimensions and materials.</Tabs.Content>
```

Source: https://zagjs.com/components/react/tabs

### HIGH Inline selected styling

Wrong:

```tsx
<Tabs.Trigger className="data-[selected]:bg-primary" value="a" />
```

Correct:

```tsx
<Tabs variant="solid" defaultValue="overview">
  <Tabs.List aria-label="Product information">
    <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
    <Tabs.Trigger value="delivery">Delivery</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="overview">Product specifications.</Tabs.Content>
  <Tabs.Content value="delivery">Dispatch within two working days.</Tabs.Content>
</Tabs>
```

Source: libs/ui/src/tokens/components/molecules/_tabs.css

## Validation Commands

```sh
rg -n "setTab|<Tabs\\.Trigger[^>]*className=.*(bg-|text-|border-|data-\\[selected)" apps
rg -P -n "<Tabs\\.Trigger(?![^>]*value=)|<Tabs\\.Content(?![^>]*value=)" apps
rg -n "<Tabs[^>]*variant=\"(primary|underline)\"" apps
```

## Template default selection

TabsTemplate selects the first enabled item when defaultValue is omitted. An
explicit value/defaultValue still takes precedence. Keep trigger values matched
to content and give every tab list a contextual accessible name where needed.
Canonical sizes are sm/md/lg (default md). Use headings within panels rather than
nested tabs, as shown by the sectioned-content story.

Horizontal lists scroll within their available width on narrow surfaces. Trigger
focus rings are inset so the scroll viewport cannot clip them. Content and root
containers keep min-width zero; callers should constrain fixed demonstration
widths with max-w-full. Center/end justification falls back to start when tabs
overflow, keeping the first tab reachable. Line indicators stay inside the
scrollport; default tabs underline the selected label even without an Indicator.
Vertical strips retain their intrinsic label width rather than being squeezed by
panel content. Panels take the remaining space and wrap long unbroken text;
keep vertical tab labels short so both columns remain useful on narrow screens.

## Collection changes and keyboard entry

`Tabs.List` is required, not just a layout wrapper: it provides tablist semantics
and arrow/Home/End handling. Give every list a contextual accessible name.
`TabsTemplate` accepts `tablistProps` (for example, `aria-labelledby` pointing to
a visible heading); root ARIA props still apply to the outer root.

Uncontrolled tabs select the first enabled trigger after an empty collection is
populated. If selection disappears or becomes disabled, the next surviving
neighbor is selected, then the previous neighbor, then the first enabled tab.
This preserves surviving panel state. Empty/all-disabled lists have no keyboard
entry until an enabled trigger appears. Controlled values remain parent-owned:
an invalid value requests the same fallback through `onValueChange` once per
invalid-value/fallback pair. A rejecting owner leaves panels unselected, but an
enabled trigger remains a keyboard entry point. Accept the request to keep panel
data and selection aligned. Focus only recovers when the affected trigger/panel
owned it; changes elsewhere do not steal focus. Focused/selected horizontal tabs
scroll within their own strip, including manual activation and RTL.
