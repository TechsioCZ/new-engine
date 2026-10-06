---
name: select-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Select for
  non-search selection with Zag.js collection behavior, hidden form select,
  trigger, value text, clear trigger, item groups, item indicators, validation
  status, size, and multiple mode.
metadata:
  component_version: "1.1.1"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux zag-compound-components app-token-overrides ux-guidelines"
  sources: "libs/ui/src/molecules/select.tsx libs/ui/src/tokens/components/molecules/_select.css libs/ui/stories/molecules/select.stories.tsx libs/ui/src/molecules/select.figma.ts https://zagjs.com/components/react/select"
---

# @techsio/ui-kit Select Usage

Use Select for choosing from known options. Use Combobox when the user needs
search/filter text input.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Select`.

**Use it when**

- One (or several) values from a known list of about 6–15 options: status, category, country with few entries, sort order.

**Use something else when**

| Need | Use instead |
| --- | --- |
| 2–5 options that fit on screen | RadioGroup |
| Long list needing search | Combobox |
| Hierarchical values | CascadeSelect |
| Commands | Menu |
| Colour swatches | ColorSelect |

**Do**

- Label with the noun; placeholder `Select a <noun>` only when there is no sensible default.
- Order options predictably (logical order, else alphabetical); keep `Other` last.
- Show disabled options only when the reason is visible (e.g. `Out of stock`).

**Don't**

- Use a Select for yes/no.
- Trigger navigation or actions on change.

**Copy and states**

- Options in sentence case, parallel grammar; the same option names as the status vocabulary.

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
rg -n "<select\\b|<Select\\b(?!\\.)[^>]*value=\"|<Select\\.Trigger[^>]*className=.*(border-|bg-|p-|text-)" apps
rg -U -P -n "<Select\\b(?!\\.)(?![\\s\\S]{0,700}<Select\\.Item)" apps
rg -n "<Select\\b(?!\\.)[^>]*validateStatus=\"(danger|invalid)\"" apps
```
