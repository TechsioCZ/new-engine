---
name: input-usage
description: >
  Use after component-usage-ux when an app needs the low-level
  @techsio/ui-kit Input atom, including valid size, variant, embedded button
  spacing, and token-first validation styling.
metadata:
  component_version: "1.0.0"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides ux-guidelines"
  sources: "libs/ui/src/atoms/input.tsx libs/ui/src/molecules/form-input.tsx libs/ui/src/tokens/components/atoms/_input.css libs/ui/stories/atoms/input.stories.tsx libs/ui/src/atoms/input.figma.ts"
---

# @techsio/ui-kit Input Usage

Use Input for a bare text-like control. Use `FormInput` when the UI includes a
label, helper text, validation text, or full form-field spacing.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Input`.

**Use it when**

- Bare text controls inside compositions that supply their own label: table filters, inline edit cells, toolbars.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Any labelled form field | FormInput |
| Numbers | NumericInput |
| Search with submit/clear | SearchForm |

**Do**

- Give bare inputs an accessible name (`aria-label` or an associated Label).
- Use the kit sizes that match the surrounding control size (DataTable `size`).
- Set `type`, `autoComplete` and `inputMode` correctly.

**Don't**

- Compose Label + Input + StatusText by hand in app forms.
- Use placeholder text as the only label.

**Copy and states**

- Placeholders are examples or `Search <objects>…` in filters.

## Setup

```tsx
import { Input } from "@techsio/ui-kit/atoms/input"

<Input name="email" type="email" variant="default" size="md" />
```

Supported component-specific props:

```text
variant: default | error | success | warning
size: sm | md | lg
withButtonInside: false | right | left
hideSearchClear: boolean
disabled: native boolean
```

## Core Patterns

### Prefer form molecules for fields

```tsx
<FormInput
  name="email"
  label="Email"
  type="email"
  helperText="We will send the receipt here."
/>
```

Use Input directly only when layout/label/error is already handled by a parent
component.

### Use variant for validation state

```tsx
<Input aria-describedby="email-error" variant="error" />
```

Do not style border or placeholder error colors in JSX.

### Use withButtonInside for embedded actions

```tsx
<Input withButtonInside="right" type="search" />
```

This prop adjusts input spacing for an action inside the field. Do not fake it
with arbitrary padding classes.

## Common Mistakes

### HIGH Native input

Wrong:

```tsx
<input className="border px-3 py-2" />
```

Correct:

```tsx
<Input size="md" />
```

Source: libs/ui/src/atoms/input.tsx

### HIGH Nonexistent variant

Wrong:

```tsx
<Input variant="danger" />
```

Correct:

```tsx
<Input variant="error" />
```

Source: libs/ui/src/atoms/input.tsx

### HIGH Inline validation styling

Wrong:

```tsx
<Input className="border-red-500 placeholder:text-red-400" />
```

Correct:

```tsx
<Input variant="error" />
```

If the error color is wrong for the app, change app token overrides.

Source: libs/ui/src/tokens/components/atoms/_input.css

### MEDIUM Manual label/error composition

Wrong:

```tsx
<Label htmlFor="email">Email</Label>
<Input id="email" />
<p className="text-red-500">Required</p>
```

Correct:

```tsx
<FormInput id="email" label="Email" errorText="Required" variant="error" />
```

Use the form molecule when it exists.

## Validation Commands

```sh
rg -n "<input\\b|variant=\"(danger|invalid|primary)\"" apps
rg -n "<Input[^>]*className=.*(border-|bg-|text-|placeholder:|px-|py-)" apps
rg -U -n "<Label[\\s\\S]{0,240}<Input" apps
rg -n "withButtonInside|hideSearchClear" apps
```
