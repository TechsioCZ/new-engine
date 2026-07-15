---
name: combobox-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Combobox for
  searchable selection with Zag.js collection behavior, controlled value/input,
  multiple mode, validation status, clear trigger, and token styling.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/combobox.tsx"
  - "libs/ui/src/tokens/components/molecules/_combobox.css"
  - "libs/ui/stories/molecules/combobox.stories.tsx"
  - "libs/ui/src/molecules/figma/combobox.figma.tsx"
  - "https://zagjs.com/components/react/combobox"
---

# @techsio/ui-kit Combobox Usage

Use Combobox for searchable select-like input. Use Select when search/filtering
is not needed.

## Setup

```tsx
import { Combobox } from "@techsio/ui-kit/molecules/combobox"

<Combobox
  label="Country"
  name="country"
  items={[{ label: "Czechia", value: "CZ" }]}
  onChange={setCountry}
/>
```

Supported props:

```text
items: { id, label, value, disabled, data }[]
value/defaultValue: string | string[]
inputValue, multiple, clearable, closeOnSelect, allowCustomValue
validateStatus: default | error | success | warning
inputBehavior: autohighlight | autocomplete | none
onChange, onInputValueChange, onOpenChange
```

## Core Patterns

### Use Combobox for search

Choose Combobox when the user needs to type and filter options. For short
static enum choices use Select, RadioGroup, or RadioCard.

### Keep items as collection data

Do not render a custom `<ul>` next to Input. The wrapper builds a Zag
collection from `items` and handles disabled options.

### Use validation props, not border classes

`validateStatus` controls trigger/input border state and `helpText` renders
StatusText.

## Common Mistakes

### HIGH Native datalist/custom dropdown

Wrong:

```tsx
<Input list="countries" /><datalist id="countries" />
```

Correct:

```tsx
<Combobox items={countries} label="Country" />
```

Source: libs/ui/src/molecules/combobox.tsx

### HIGH Wrong value shape for multiple

Wrong:

```tsx
<Combobox multiple value="CZ" />
```

Correct:

```tsx
<Combobox multiple value={["CZ"]} />
```

Source: https://zagjs.com/components/react/combobox

### HIGH Inline dropdown styling

Wrong:

```tsx
<Combobox className="border-red-500 bg-white" validateStatus="error" />
```

Correct:

```tsx
<Combobox validateStatus="error" helpText="Required" />
```

Source: libs/ui/src/tokens/components/molecules/_combobox.css

## Validation Commands

```sh
rg -n "<datalist|role=\"listbox\"|<Combobox[^>]*multiple[^>]*value=\"" apps
rg -n "<Combobox[^>]*className=.*(bg-|text-|border-|p-|px-|py-)" apps
rg -n "<Combobox[^>]*validateStatus=\"(danger|invalid)\"" apps
```

