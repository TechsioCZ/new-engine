---
name: cascade-select-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit CascadeSelect
  for choosing a value from hierarchical data with Zag.js path values,
  compound parts, parent or multiple selection, validation, and keyboard
  navigation.
metadata:
  component_version: "1.1.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux zag-compound-components app-token-overrides ux-guidelines"
  sources: "libs/ui/src/molecules/cascade-select.tsx libs/ui/src/tokens/components/molecules/_cascade-select.css libs/ui/stories/molecules/cascade-select.stories.tsx https://zagjs.com/components/react/cascade-select"
---

# @techsio/ui-kit CascadeSelect Usage

Use CascadeSelect for form choices whose options have parent/child levels.
Use Select for a flat known list and TreeView for hierarchical navigation.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `CascadeSelect`.

**Use it when**

- A form value that lives inside a hierarchy: category → subcategory, region → city.
- Hierarchies deep or wide enough that one flat Select would be unreadable.

**Use something else when**

| Need | Use instead |
| --- | --- |
| A flat list of known options | Select |
| A flat list the user needs to search | Combobox |
| Navigating categories (links) | VerticalNavigation |
| Selecting nodes in a tree widget with arrow keys | TreeView |

**Do**

- Show the full path of the selected value in the trigger (`Clothing › Shirts › Linen`).
- Let users select parent levels only when a parent is a valid value; otherwise only leaves are selectable.
- Keep level labels short; order siblings meaningfully (alphabetical or by popularity), consistently.

**Don't**

- Use it for two levels with a handful of items — two Selects or a grouped Select read faster.
- Mix navigation links into a form control.

**Copy and states**

- Label is the noun of the final value (`Category`), placeholder `Select a category`.
- Path separator comes from the component; don't type `>` or `/`.

## Setup

```tsx
const categories = [
  {
    label: "Electronics",
    value: "electronics",
    children: [{ label: "Phones", value: "phones" }],
  },
]

<CascadeSelect items={categories} name="category">
  <CascadeSelect.Label>Category</CascadeSelect.Label>
  <CascadeSelect.Control>
    <CascadeSelect.Trigger>
      <CascadeSelect.ValueText placeholder="Choose a category" />
      <CascadeSelect.Indicator />
    </CascadeSelect.Trigger>
    <CascadeSelect.ClearTrigger />
  </CascadeSelect.Control>
  <CascadeSelect.Positioner>
    <CascadeSelect.Content>
      <CascadeSelect.Node />
    </CascadeSelect.Content>
  </CascadeSelect.Positioner>
  <CascadeSelect.StatusText>Choose the most specific category.</CascadeSelect.StatusText>
</CascadeSelect>
```

Supported props:

```text
items: { label, value, children?, disabled? }[]
size: xs | sm | md | lg
validateStatus: default | error | success | warning
value/defaultValue: string[][]
highlightedValue/defaultHighlightedValue: string[]
multiple, allowParentSelection, closeOnSelect, highlightTrigger
disabled, required, readOnly, loopFocus
name, form, formatValue, onValueChange, onOpenChange, onHighlightChange
```

## Core Patterns

### Keep the compound anatomy intact

Use Label, Control, Trigger, ValueText, Positioner, Content, and Node. Node is
the default recursive renderer built from the public List, Item, ItemText,
ItemIndicator, and BranchIndicator parts. It renders separate columns with
numbered headers and a persistent marker on the expanded ancestor path.
Set `<CascadeSelect.Node rootLabel="Categories" />` to name the first column
(default: `Options`); subsequent headers use the expanded parent's label.
The marker means "this branch is open", not "this value is selected" — selected
values have a checkmark.

The trigger is a combobox with a tree popup. Arrow keys traverse levels,
Enter selects a value, and Escape closes the popup. On narrow screens the
columns scroll horizontally, and the active option scrolls into view as the
user traverses levels. Each visible child group
is labeled by its column header and owned by its expanded parent item.

### Treat each selected value as a complete path

A single selection still uses an array of paths. The Electronics → Phones
value is `[["electronics", "phones"]]`, not `["phones"]`.

### Choose parent selection deliberately

Keep `allowParentSelection` false when only leaf choices are valid. Enable it
only when selecting a whole branch is meaningful.

### Associate guidance and validation with the trigger

`CascadeSelect.StatusText` generates a unique ID and automatically adds it to
the trigger's `aria-describedby` while mounted. You can provide a custom `id`;
existing `aria-describedby` references on `CascadeSelect.Trigger` are preserved.
Conditionally render StatusText when guidance or validation text is available;
unmounting it removes only its automatic description reference, leaving helper
text and caller-provided descriptions linked. Keep persistent helper text at
`status="default"` when the field becomes invalid, and render a separate
`<CascadeSelect.StatusText showIcon>` for the error. Set
`validateStatus="error"` on the root so the trigger exposes `aria-invalid`;
put actionable correction text in the error rather than relying on border color.

The **Accessible status text** story demonstrates this with a product form:
saving an empty category reveals the error, selecting a leaf resolves it, and
saving again confirms success. The helper remains associated throughout.
Use `noValidate` on forms that present their own inline validation: keep
`required` on CascadeSelect for its accessible required state, validate the
selected path on submit, and show a linked error instead of relying on a native
validation bubble for the hidden form input.

### Let Select and popup tokens define appearance

CascadeSelect aliases its trigger tokens to Select and uses the shared popup
surface. Use component props or token overrides instead of duplicating its
padding, colors, radius, or item state styles with `className`.

## Common Mistakes

### HIGH Flat value shape

Wrong:

```tsx
<CascadeSelect items={categories} value={["electronics", "phones"]} />
```

Correct:

```tsx
<CascadeSelect items={categories} value={[["electronics", "phones"]]} />
```

Source: https://zagjs.com/components/react/cascade-select

### HIGH Custom nested dropdown

Wrong:

```tsx
<button onClick={toggle}>{label}</button>
```

Correct:

```tsx
<CascadeSelect items={categories}>{/* compound parts */}</CascadeSelect>
```

Source: libs/ui/src/molecules/cascade-select.tsx

### HIGH Inline visual overrides

Wrong:

```tsx
<CascadeSelect.Trigger className="border-blue-500 bg-white px-4" />
```

Correct:

```tsx
<CascadeSelect validateStatus="default">{/* compound parts */}</CascadeSelect>
```

Source: libs/ui/src/tokens/components/molecules/_cascade-select.css

## Validation Commands

```sh
rg -n '<CascadeSelect\b[^>]*(value|defaultValue)=\{\["' apps
rg -n '<CascadeSelect\.Trigger[^>]*className=.*(border-|bg-|p[xy]?-|text-)' apps
rg -n '<button[^>]*onClick=.*(category|categories)' apps
```
