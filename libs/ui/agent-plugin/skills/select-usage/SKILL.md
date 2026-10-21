---
name: select-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Select for
  non-search selection with Zag.js collection behavior, hidden form select,
  trigger, value text, clear trigger, item groups, item indicators, validation
  status, size, and multiple mode.
metadata:
  component_version: "1.3.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux zag-compound-components app-token-overrides ux-guidelines"
  sources: "https://zagjs.com/components/react/select"
  contributor_sources: "libs/ui/src/molecules/select.tsx libs/ui/src/tokens/components/molecules/_select.css libs/ui/stories/molecules/select.stories.tsx libs/ui/src/molecules/select.figma.ts"
  resources: "../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

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
import { SelectTemplate } from "@techsio/ui-kit/templates/select"

<SelectTemplate label="Country" items={[{ label: "Czechia", value: "CZ" }]} />
```

Source: libs/ui/src/molecules/select.tsx

### HIGH String value

Wrong:

```tsx
<Select value="CZ" items={items} />
```

Correct:

```tsx
import { useState } from "react"
import { SelectTemplate } from "@techsio/ui-kit/templates/select"

function CountryField() {
  const [value, setValue] = useState<string[]>(["CZ"])
  return <SelectTemplate label="Country" items={[{ label: "Czechia", value: "CZ" }]}
    value={value} onValueChange={({ value }) => setValue(value)} />
}
```

Source: https://zagjs.com/components/react/select

### HIGH Inline trigger styling

Wrong:

```tsx
<Select.Trigger className="border-red-500 bg-white" />
```

Correct:

```tsx
import { SelectTemplate } from "@techsio/ui-kit/templates/select"

<SelectTemplate label="Country" items={[{ label: "Czechia", value: "CZ" }]}
  validateStatus="error" helpText="Choose a delivery country before continuing." />
```

Source: libs/ui/src/tokens/components/molecules/_select.css

## Validation Commands

```sh
rg -P -n "<select\\b|<Select\\b(?!\\.)[^>]*value=\"|<Select\\.Trigger[^>]*className=.*(border-|bg-|p-|text-)" apps
rg -U -P -n "<Select\\b(?!\\.)(?![\\s\\S]{0,700}<Select\\.Item)" apps
rg -P -n "<Select\\b(?!\\.)[^>]*validateStatus=\"(danger|invalid)\"" apps
```

## Field contracts

`Select` itself is the root; there is no `Select.Root`. All supported Zag props
(including `open`, `defaultOpen`, `dir`, `positioning` and `ids`) are forwarded.
Trigger event handlers are composed with Zag's handlers. Typeahead searches the
visible string label; provide `displayValue` for a rich ReactNode label.
`ValueText` honors both static children and render functions, and otherwise
shows every selected label separated by commas. The hidden select submits values,
not labels.

Use `Select.StatusText` for help and validation. Each mounted message gets its
own stable ID; the trigger merges caller descriptions with every mounted message
and links error messages with `aria-errormessage`. State icons remain enabled.

`readOnly` keeps the trigger focusable, its text selectable and its form value
intact. It suppresses opening (including `open`/`defaultOpen`), clear and chevron
affordances and all selection changes. Disabled takes precedence. Canonical sizes
are sm/md/lg (default md); xs remains a compatibility alias, not a canonical size.

`SelectTemplate` also accepts `helpText` and `triggerProps` for accessible naming
and caller descriptions. Its `valueText` supports a static summary or render
function. Visual/API changes need a Figma-sync handoff once this pass stabilizes.

## Authoritative collection updates

`items` is the complete authoritative collection, not a filtered page. Removing
values prunes the effective selection without choosing a replacement, shows the
placeholder when empty, and updates native submission/required validity together.
Uncontrolled fields update themselves and emit `onValueChange` once; controlled
fields emit the same correction request and safely render/submit the available
subset until their owner applies it. Keep the full collection while loading if
selections must survive a partial fetch. Renames/reordering refresh labels;
becoming disabled retains an existing selection and its submission. Removed or
disabled highlights clear. The native single-select has an explicit empty option.
Trigger, Content and Item callbacks run consumer-first; `preventDefault()` cancels
the machine action, while observational callbacks leave keyboard behavior intact.
