---
name: radio-card-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit RadioCard for
  prominent single-choice cards with Zag.js radio behavior, label, item,
  hidden input, control, text, description, addon, indicator, and status text.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - zag-compound-components
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/radio-card.tsx"
  - "libs/ui/src/tokens/components/molecules/_radio-card.css"
  - "libs/ui/stories/molecules/radio-card.stories.tsx"
  - "libs/ui/src/molecules/figma/radio-card.figma.tsx"
  - "https://zagjs.com/components/react/radio-group"
---

# @techsio/ui-kit RadioCard Usage

Use RadioCard for prominent exclusive choices with title, description, or addon
content. Use RadioGroup for simple text options.

## Setup

```tsx
<RadioCard name="shipping" defaultValue="standard" variant="outline">
  <RadioCard.Label>Shipping method</RadioCard.Label>
  <RadioCard.Item value="standard">
    <RadioCard.ItemHiddenInput />
    <RadioCard.ItemControl>
      <RadioCard.ItemContent>
        <RadioCard.ItemText>Standard</RadioCard.ItemText>
        <RadioCard.ItemDescription>3-5 business days</RadioCard.ItemDescription>
      </RadioCard.ItemContent>
      <RadioCard.ItemIndicator />
    </RadioCard.ItemControl>
  </RadioCard.Item>
</RadioCard>
```

Supported props:

```text
variant: outline | subtle | solid
size: sm | md | lg
itemOrientation: horizontal | vertical
align: start | center | end
justify: start | center | end | between
validateStatus: default | error | success | warning
orientation, value/defaultValue, disabled, required, onValueChange
```

## Core Patterns

### Use for rich options

Plans, delivery methods, payment methods, and selectable cards belong here.

### Keep item hidden input

Each item should include `RadioCard.ItemHiddenInput` for form behavior.

### Use StatusText part for field status

Use `RadioCard.StatusText` instead of external paragraphs for validation.

## Common Mistakes

### HIGH Selectable div cards

Wrong:

```tsx
<div onClick={() => setPlan("pro")} className="border p-4" />
```

Correct:

```tsx
<RadioCard.Item value="pro"><RadioCard.ItemHiddenInput /></RadioCard.Item>
```

Source: libs/ui/src/molecules/radio-card.tsx

### HIGH Missing hidden input

Wrong:

```tsx
<RadioCard.Item value="pro"><RadioCard.ItemText>Pro</RadioCard.ItemText></RadioCard.Item>
```

Correct:

```tsx
<RadioCard.Item value="pro"><RadioCard.ItemHiddenInput /><RadioCard.ItemControl /></RadioCard.Item>
```

Source: https://zagjs.com/components/react/radio-group

### HIGH Inline selected styling

Wrong:

```tsx
<RadioCard.Item className="border-primary bg-primary/10" value="pro" />
```

Correct:

```tsx
<RadioCard variant="subtle"><RadioCard.Item value="pro" /></RadioCard>
```

Source: libs/ui/src/tokens/components/molecules/_radio-card.css

## Validation Commands

```sh
rg -U -P -n "onClick=.*set.*(Plan|Method)|<RadioCard\\.Item(?![\\s\\S]{0,300}<RadioCard\\.ItemHiddenInput)" apps
rg -n "<RadioCard[^>]*variant=\"(primary|outlined)\"|<RadioCard[^>]*className=.*(border-|bg-|p-)" apps
rg -n "<RadioCard[^>]*validateStatus=\"(danger|invalid)\"" apps
```
