---
name: label-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit Label for
  form-control labels with valid size, disabled, required, and htmlFor usage.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/atoms/label.tsx"
  - "libs/ui/src/tokens/components/atoms/_label.css"
  - "libs/ui/src/atoms/label.figma.ts"
---

# @techsio/ui-kit Label Usage

Use Label for standalone form-control labels. Prefer form molecules when the
whole field structure is available.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Label`.

**Use it when**

- Standalone labels for controls that are not wrapped by a Form* molecule.

**Use something else when**

| Need | Use instead |
| --- | --- |
| A complete field | FormInput / FormTextarea / FormNumericInput / FormCheckbox |
| Section headings | a heading element |

**Do**

- Connect every label to its control (`htmlFor`).
- Keep labels short nouns; move explanations to help text.
- Keep labels visible — no placeholder-only fields.

**Don't**

- End labels with a colon.
- Write labels as instructions (`Please enter your email`).

**Copy and states**

- Sentence case, no punctuation; units in parentheses (`Weight (kg)`).

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
