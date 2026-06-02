---
name: switch-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Switch for
  boolean settings using Zag.js switch behavior, hidden input, label children,
  checked/defaultChecked, validation status, help text, required, disabled, and
  read-only state.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/switch.tsx"
  - "libs/ui/src/tokens/components/molecules/_switch.css"
  - "libs/ui/stories/molecules/switch.stories.tsx"
  - "libs/ui/src/molecules/figma/switch.figma.tsx"
  - "https://zagjs.com/components/react/switch"
---

# @techsio/ui-kit Switch Usage

Use Switch for immediate boolean settings. Use Checkbox for terms, multi-select
lists, or non-immediate boolean form choices.

## Setup

```tsx
<Switch name="marketing" defaultChecked onCheckedChange={setEnabled}>
  Marketing emails
</Switch>
```

Supported props:

```text
checked/defaultChecked, onCheckedChange
name, value, required, disabled, readOnly, dir
validateStatus: default | error | success | warning
helpText, showHelpTextIcon
```

## Core Patterns

### Use for settings

Feature toggles, notification preferences, and visibility toggles fit Switch.

### Use children as label

The component renders Label and hidden input internally.

### Use validateStatus for invalid state

Do not style invalid switch state manually.

## Common Mistakes

### HIGH Checkbox for setting toggle

Wrong:

```tsx
<Checkbox checked={enabled} /> Enable notifications
```

Correct:

```tsx
<Switch checked={enabled} onCheckedChange={setEnabled}>Enable notifications</Switch>
```

Source: libs/ui/src/molecules/switch.tsx

### HIGH Wrong callback

Wrong:

```tsx
<Switch onChange={(e) => setEnabled(e.target.checked)} />
```

Correct:

```tsx
<Switch onCheckedChange={setEnabled} />
```

Source: https://zagjs.com/components/react/switch

### HIGH Inline state styling

Wrong:

```tsx
<Switch className="data-[state=checked]:bg-green-600" />
```

Correct:

```tsx
<Switch validateStatus="default" />
```

Source: libs/ui/src/tokens/components/molecules/_switch.css

## Validation Commands

```sh
rg -n "<Switch[^>]*onChange=|<Switch[^>]*className=.*(bg-|text-|data-\\[state|rounded-)" apps
rg -n "<Checkbox[\\s\\S]{0,120}(Enable|Disable|notifications|toggle)" apps -U
rg -n "<Switch[^>]*validateStatus=\"(danger|invalid)\"" apps
```

