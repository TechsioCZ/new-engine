---
name: label-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Label for
  form-control labels with valid size, disabled, required, and htmlFor usage.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/atoms/label.tsx"
  - "libs/ui/src/tokens/components/atoms/_label.css"
  - "libs/ui/src/atoms/figma/label.figma.tsx"
---

# @techsio/ui-kit Label Usage

Use Label for standalone form-control labels. Prefer form molecules when the
whole field structure is available.

## Setup

```tsx
import { Label } from "@techsio/ui-kit/atoms/label"

<Label htmlFor="email" required>
  Email
</Label>
```

Supported props:

```text
size: sm | md | lg | current
disabled: boolean
required: boolean
htmlFor: native label target
```

## Core Patterns

### Pair Label with the control id

```tsx
<Label htmlFor="email">Email</Label>
<Input id="email" name="email" />
```

Use `htmlFor` unless the control is explicitly nested.

### Use required prop for required marker

```tsx
<Label htmlFor="email" required>
  Email
</Label>
```

Do not manually add a red star.

### Keep size aligned with the field

```tsx
<Label htmlFor="email" size="sm">Email</Label>
<Input id="email" size="sm" />
```

Use `size="current"` only inside components that inherit text sizing.

## Common Mistakes

### HIGH Native label with hardcoded styling

Wrong:

```tsx
<label className="text-sm font-medium text-gray-700">Email</label>
```

Correct:

```tsx
<Label htmlFor="email">Email</Label>
```

Source: libs/ui/src/atoms/label.tsx

### HIGH Manual required marker

Wrong:

```tsx
<Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
```

Correct:

```tsx
<Label htmlFor="email" required>Email</Label>
```

Source: libs/ui/src/tokens/components/atoms/_label.css

### MEDIUM Missing association

Wrong:

```tsx
<Label>Email</Label>
<Input id="email" />
```

Correct:

```tsx
<Label htmlFor="email">Email</Label>
<Input id="email" />
```

### MEDIUM Field built manually when molecule exists

Wrong:

```tsx
<Label htmlFor="email">Email</Label>
<Input id="email" />
```

Correct when helper/error/layout is part of the field:

```tsx
<FormInput id="email" label="Email" />
```

## Validation Commands

```sh
rg -n "<label\\b|<Label[^>]*className=.*(text-|font-|mb-|gap-)" apps
rg -P -n "<Label(?![^>]*htmlFor=)" apps
rg -n "<span[^>]*>\\*</span>|text-red-500.*\\*" apps
rg -U -n "<Label[\\s\\S]{0,240}<Input" apps
```
