---
name: checkbox-usage
description: >
  Use after component-usage-ux when an app needs the low-level
  @techsio/ui-kit Checkbox atom, including invalid and indeterminate states,
  while preferring form molecules for labeled form rows.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/atoms/checkbox.tsx"
  - "libs/ui/src/molecules/form-checkbox.tsx"
  - "libs/ui/src/tokens/components/atoms/_checkbox.css"
  - "libs/ui/stories/atoms/checkbox.stories.tsx"
  - "libs/ui/src/atoms/figma/checkbox.figma.tsx"
---

# @techsio/ui-kit Checkbox Usage

Use `Checkbox` for the bare control. Use `FormCheckbox` when the UI includes a
label, helper text, validation text, or a form-field layout.

## Setup

```tsx
import { Checkbox } from "@techsio/ui-kit/atoms/checkbox"

<Checkbox name="acceptTerms" required />
```

Supported component-specific props:

```text
indeterminate: boolean
invalid: boolean
```

The component also accepts native checkbox input attributes.

## Core Patterns

### Prefer FormCheckbox for labeled rows

```tsx
<FormCheckbox
  name="newsletter"
  label="Send me product updates"
  helperText="You can unsubscribe anytime."
/>
```

Do not manually recreate label/help/error layout when the molecule exists.

### Use indeterminate for partial selection

```tsx
<Checkbox
  checked={someSelected}
  indeterminate={someSelected && !allSelected}
  aria-label="Select all visible rows"
/>
```

`indeterminate` is wired to the DOM property in `checkbox.tsx`.

### Use invalid for visual and ARIA state

```tsx
<Checkbox invalid aria-describedby="terms-error" />
```

`invalid` maps to `aria-invalid` and `data-invalid`.

## Common Mistakes

### HIGH Native checkbox

Wrong:

```tsx
<input type="checkbox" className="accent-green-600" />
```

Correct:

```tsx
<Checkbox name="enabled" />
```

Source: libs/ui/src/atoms/checkbox.tsx

### HIGH Manual form row

Wrong:

```tsx
<label className="flex gap-2">
  <Checkbox />
  <span>Accept terms</span>
</label>
```

Correct:

```tsx
<FormCheckbox name="terms" label="Accept terms" />
```

Source: libs/ui/src/molecules/form-checkbox.tsx

### HIGH Inline state colors

Wrong:

```tsx
<Checkbox invalid className="border-red-500 bg-red-50" />
```

Correct:

```tsx
<Checkbox invalid />
```

Use `_checkbox.css` or app token overrides for visual changes.

Source: libs/ui/src/tokens/components/atoms/_checkbox.css

### MEDIUM Missing accessible label

Wrong:

```tsx
<Checkbox />
```

Correct:

```tsx
<Checkbox aria-label="Select product" />
```

or use `FormCheckbox` with a visible label.

## Validation Commands

```sh
rg -n "<input[^>]*type=\"checkbox\"" apps
rg -n "<Checkbox[^>]*className=.*(accent-|bg-|border-|text-)" apps
rg -U -n "<label[^>]*>\\s*<Checkbox|<Checkbox[\\s\\S]*</label>" apps
rg -P -n "<Checkbox(?![^>]*(aria-label|aria-labelledby|id=))" apps
```
