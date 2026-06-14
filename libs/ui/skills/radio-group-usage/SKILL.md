---
name: radio-group-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit RadioGroup for
  simple exclusive choices with Zag.js radio behavior, label, item group,
  hidden inputs, controls, text, descriptions, validation status, variants, and
  sizes.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - zag-compound-components
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/radio-group.tsx"
  - "libs/ui/src/tokens/components/molecules/_radio-group.css"
  - "libs/ui/stories/molecules/radio-group.stories.tsx"
  - "libs/ui/src/molecules/figma/radio-group.figma.tsx"
  - "https://zagjs.com/components/react/radio-group"
---

# @techsio/ui-kit RadioGroup Usage

Use RadioGroup for simple exclusive text choices. Use RadioCard for larger
card-like choices.

## Setup

```tsx
<RadioGroup name="payment" defaultValue="card">
  <RadioGroup.Label>Payment method</RadioGroup.Label>
  <RadioGroup.ItemGroup>
    <RadioGroup.Item value="card">
      <RadioGroup.ItemHiddenInput />
      <RadioGroup.ItemControl />
      <RadioGroup.ItemContent><RadioGroup.ItemText>Card</RadioGroup.ItemText></RadioGroup.ItemContent>
    </RadioGroup.Item>
  </RadioGroup.ItemGroup>
</RadioGroup>
```

Supported props:

```text
variant: outline | subtle | solid
size: sm | md | lg
orientation: horizontal | vertical
validateStatus: default | error | success | warning
value/defaultValue, disabled, required, readOnly, onValueChange
```

## Core Patterns

### Use item group for options

Keep options inside `RadioGroup.ItemGroup` and each item as a label with
hidden input and control.

### Use descriptions for explanatory text

Use `RadioGroup.ItemDescription`, not loose paragraphs.

### Use value strings

Radio values are strings; map domain IDs to strings consistently.

## Common Mistakes

### HIGH Native radio inputs

Wrong:

```tsx
<input type="radio" name="payment" value="card" />
```

Correct:

```tsx
<RadioGroup.Item value="card"><RadioGroup.ItemHiddenInput /></RadioGroup.Item>
```

Source: libs/ui/src/molecules/radio-group.tsx

### HIGH Missing item group

Wrong:

```tsx
<RadioGroup><RadioGroup.Item value="a" /></RadioGroup>
```

Correct:

```tsx
<RadioGroup><RadioGroup.ItemGroup><RadioGroup.Item value="a" /></RadioGroup.ItemGroup></RadioGroup>
```

Source: libs/ui/src/molecules/radio-group.tsx

### HIGH Inline checked styling

Wrong:

```tsx
<RadioGroup.Item className="text-primary border-primary" value="a" />
```

Correct:

```tsx
<RadioGroup variant="solid"><RadioGroup.Item value="a" /></RadioGroup>
```

Source: libs/ui/src/tokens/components/molecules/_radio-group.css

## Validation Commands

```sh
rg -U -P -n "<input[^>]*type=\"radio\"|<RadioGroup\\.Item(?![\\s\\S]{0,300}<RadioGroup\\.ItemHiddenInput)" apps
rg -n "<RadioGroup[^>]*variant=\"(primary|outlined)\"|<RadioGroup[^>]*className=.*(border-|bg-|text-)" apps
rg -n "<RadioGroup[^>]*validateStatus=\"(danger|invalid)\"" apps
```
