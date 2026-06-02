---
name: select-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Select for
  non-search selection with Zag.js collection behavior, hidden form select,
  trigger, value text, clear trigger, item groups, item indicators, validation
  status, size, and multiple mode.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - zag-compound-components
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/select.tsx"
  - "libs/ui/src/tokens/components/molecules/_select.css"
  - "libs/ui/stories/molecules/select.stories.tsx"
  - "libs/ui/src/molecules/figma/select.figma.tsx"
  - "https://zagjs.com/components/react/select"
---

# @techsio/ui-kit Select Usage

Use Select for choosing from known options. Use Combobox when the user needs
search/filter text input.

## Setup

```tsx
<Select items={items} name="country">
  <Select.Label>Country</Select.Label>
  <Select.Control>
    <Select.Trigger><Select.ValueText placeholder="Choose country" /></Select.Trigger>
    <Select.ClearTrigger />
  </Select.Control>
  <Select.Positioner><Select.Content>{items.map((item) => <Select.Item item={item} key={item.value}><Select.ItemText /><Select.ItemIndicator /></Select.Item>)}</Select.Content></Select.Positioner>
</Select>
```

Supported props:

```text
items: { label, value, disabled, displayValue }[]
size: xs | sm | md | lg
validateStatus: default | error | success | warning
value/defaultValue: string[]
multiple, disabled, required, readOnly, closeOnSelect, loopFocus
name, form, onValueChange, onOpenChange, onHighlightChange
```

## Core Patterns

### Keep Select anatomy intact

Use Label, Control, Trigger, ValueText, Positioner, Content, Item, ItemText,
and ItemIndicator.

### Use array values

Zag Select values are arrays, including single-select values.

### Use StatusText part for help/error

Use `Select.StatusText` with `validateStatus`, not external paragraphs.

## Common Mistakes

### HIGH Native select

Wrong:

```tsx
<select><option value="CZ">Czechia</option></select>
```

Correct:

```tsx
<Select items={[{ label: "Czechia", value: "CZ" }]} />
```

Source: libs/ui/src/molecules/select.tsx

### HIGH String value

Wrong:

```tsx
<Select value="CZ" items={items} />
```

Correct:

```tsx
<Select value={["CZ"]} items={items} />
```

Source: https://zagjs.com/components/react/select

### HIGH Inline trigger styling

Wrong:

```tsx
<Select.Trigger className="border-red-500 bg-white" />
```

Correct:

```tsx
<Select validateStatus="error"><Select.Trigger /></Select>
```

Source: libs/ui/src/tokens/components/molecules/_select.css

## Validation Commands

```sh
rg -n "<select\\b|<Select[^>]*value=\"|<Select\\.Trigger[^>]*className=.*(border-|bg-|p-|text-)" apps
rg -U -P -n "<Select(?![\\s\\S]{0,700}<Select\\.Item)" apps
rg -n "<Select[^>]*validateStatus=\"(danger|invalid)\"" apps
```
