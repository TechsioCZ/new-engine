---
name: checkbox-usage
description: >
  Use after component-usage-ux when an app needs the low-level
  @techsio/ui-kit Checkbox atom, including invalid and indeterminate states,
  while preferring form molecules for labeled form rows.
metadata:
  component_version: "1.2.1"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/atoms/checkbox.tsx"
  - "libs/ui/src/molecules/form-checkbox.tsx"
  - "libs/ui/src/tokens/components/atoms/_checkbox.css"
  - "libs/ui/stories/atoms/checkbox.stories.tsx"
  - "libs/ui/src/atoms/checkbox.figma.ts"
---

# @techsio/ui-kit Checkbox Usage

Use `Checkbox` for the bare control. Use `FormCheckbox` when the UI includes a
label, helper text, validation text, or a form-field layout.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `Checkbox`.

**Use it when**

- Bare selection controls inside tables and lists (row selection, select all).
- Custom compositions where the label/help structure is provided by the surrounding component.

**Use something else when**

| Need | Use instead |
| --- | --- |
| A checkbox with its own label, help or error | FormCheckbox |
| A setting that applies immediately | Switch |
| One exclusive option | RadioGroup |

**Do**

- Give bare checkboxes an accessible name (`Select Linen shirt`, `Select all products on this page`).
- Use the indeterminate state for a partially selected group.
- Make the whole row or label clickable where the pattern allows.

**Don't**

- Use a checkbox to trigger an immediate action (that is a Switch or Button).
- Reverse meaning with negative labels (`Don't send emails`).

**Copy and states**

- Positive, parallel statements; no trailing punctuation for short labels.

## Setup

```tsx
import { Checkbox } from "@techsio/ui-kit/atoms/checkbox"

<Checkbox name="selectedProducts" value="TS-2048" aria-label="Select Alpine daypack" />
```

Supported component-specific props:

```text
indeterminate: boolean
invalid: boolean
```

The component also accepts native checkbox input attributes.

## Core Patterns

### Canonical sizing

`size="sm" | "md" | "lg"` uses the same box dimensions as FormCheckbox, with
`md` as the default. The default is now 24px rather than the legacy 16px atom;
use `sm` explicitly for dense table/list selection (18px). Numeric native
`size` is not supported. Both checkmarks and mixed dashes scale with the box.


### Native read-only behavior

`readOnly` preserves the native checkbox focus target and submitted value while
blocking pointer and Space toggles. It exposes `aria-readonly` and a neutral,
full-contrast value surface. Disabled takes precedence. Use FormCheckbox for
automatically associated inline help and validation.


### Border width tokens

`--border-width-checkbox` controls the normal border, including checked,
indeterminate, and disabled states. Invalid checkboxes continue to use
`--border-width-validation` instead. Override the existing tokens in the
consumer's scope; do not add descendant border rules.

### Prefer FormCheckbox for labeled rows

```tsx
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox"

<FormCheckbox
  name="newsletter"
  label="Send me product updates"
  helpText="You can unsubscribe anytime."
/>
```

Do not manually recreate label/help/error layout when the molecule exists.

### Use indeterminate for partial selection

```tsx
<Checkbox
  checked={allSelected}
  indeterminate={someSelected && !allSelected}
  aria-label="Select all visible rows"
/>
```

`indeterminate` is wired to the DOM property in `checkbox.tsx`.

### Use invalid for visual and ARIA state

```tsx
<Checkbox invalid aria-describedby="terms-error" />
```

`invalid` maps to `aria-invalid` and `data-invalid`. Associate a visible error
with `aria-describedby`; a red border alone does not explain the problem.

### Controlled and uncontrolled selection

Use `checked` plus `onChange` for controlled selection, or `defaultChecked` for
an uncontrolled initial value. Do not supply both. For select-all, compute
`checked={allSelected}` and `indeterminate={someSelected && !allSelected}`;
Space or click selects the whole partially selected group. Disabled mixed
controls use the same disabled surface and icon treatment as disabled checked
controls. Mixed selection is a horizontal dash, not a dot or checkmark, even
when the native checked value is also true. The visual mixed state does not
change the native checked value or form submission semantics. Corners remain
squarish even when a theme's general small radius would make a small control
circular; override `--radius-checkbox-control` for an intentional scoped shape.
Explain why unavailable controls cannot be changed.

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

## State consistency

Read-only controls do not invoke `onChange` or mutation click handlers. Controlled application state stays unchanged after both pointer/Space activation and unrelated parent rerenders; parents may still intentionally replace the controlled value.

## Validation Commands

```sh
rg -n "<input[^>]*type=\"checkbox\"" apps
rg -n "<Checkbox[^>]*className=.*(accent-|bg-|border-|text-)" apps
rg -U -n "<label[^>]*>\\s*<Checkbox|<Checkbox[\\s\\S]*</label>" apps
rg -P -n "<Checkbox(?![^>]*(aria-label|aria-labelledby|id=))" apps
```
