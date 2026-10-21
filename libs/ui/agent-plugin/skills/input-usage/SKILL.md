---
name: input-usage
description: >
  Use after component-usage-ux when an app needs the low-level
  @techsio/ui-kit Input atom, including valid size, variant, embedded button
  spacing, and token-first validation styling.
metadata:
  component_version: "1.1.2"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
  requires: "component-usage-ux app-token-overrides ux-guidelines"
  sources: ""
  contributor_sources: "libs/ui/src/atoms/input.tsx libs/ui/src/molecules/form-input.tsx libs/ui/src/tokens/components/atoms/_input.css libs/ui/stories/atoms/input.stories.tsx libs/ui/src/atoms/input.figma.ts"
  resources: "../../references/component-contracts.md ../../references/consumer_app_usage_rules.md"
  audience: "consumer"
---

> Portable scope: Use the installed package's exported types and bundled sibling skills. Repository source paths are optional contributor evidence, not consumer prerequisites; use the consuming app's own checks. Resolve ../../references/ paths from this skill's folder, not the app working directory.

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
readOnly: native boolean (focusable, selectable, immutable)
```

## Core Patterns

### Component font weights

`--font-weight-input` and `--font-weight-input-placeholder` independently
control the input text and placeholder. Both default to
`--font-weight-normal` (400); changing input weight does not change placeholder
weight. These tokens also apply to Input-based FormInput and NumericInput.
Explicit caller classes still override their respective defaults.

Migration: inherited aliases resolve where declared. A descendant override of
only `--font-weight-normal` no longer changes these weights there. Set the
component tokens in that scope instead. Global primitive overrides at the
alias declaration scope still apply.

### Prefer form molecules for fields

```tsx
<FormInput
  name="email"
  label="Email"
  type="email"
  helpText="We will send the receipt here."
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
<FormInput id="email" label="Email" helpText="Enter your email address." validateStatus="error" />
```

Use the form molecule when it exists.

## Validation Commands

```sh
rg -n "<input\\b|variant=\"(danger|invalid|primary)\"" apps
rg -n "<Input[^>]*className=.*(border-|bg-|text-|placeholder:|px-|py-)" apps
rg -U -n "<Label[\\s\\S]{0,240}<Input" apps
rg -n "withButtonInside|hideSearchClear" apps
```

## Read-only, search clear and validation

`readOnly` keeps the value focusable, selectable and included in form submission,
with full-contrast text and a subtle read-only surface. Disabled wins when both
props are set. Native edits, paste and drop cannot change a read-only value;
the native search clear is hidden in this state. `hideSearchClear={false}`
otherwise preserves the browser search cancel button and is not a DOM prop.
A stable unique input ID is generated when no nonempty `id` is supplied.

For bare validation, render StatusText with a unique ID; merge it into
`aria-describedby` and use `aria-errormessage` plus `aria-invalid` for errors.
State icons remain enabled. Use FormInput to handle this association for you.


### Component-specific read-only colors

Override `--color-input-bg-readonly` and `--color-input-fg-readonly`
to tune only this field's read-only surface and value. The default reference
aliases follow `--color-form-control-readonly` and `--color-form-control-text`.
These overrides also apply on hover/focus; disabled styling still wins.

## Silent native form reset

Native form reset calls no value-change callbacks and dispatches no native
`input` or `change` events. Uncontrolled controls silently restore their default;
controlled controls keep the latest parent value and re-sync visible text, native
value and FormData. Handle the form's `onReset` to intentionally change parent
state. Canceled resets change nothing. React's value tracker is re-synced after
restoration, so the next identical user edit notifies exactly once. Reset does
not move focus.
