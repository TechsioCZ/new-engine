---
name: form-checkbox-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit FormCheckbox
  for labeled checkbox fields with Zag.js checked/indeterminate state, help
  text, validation status, required, disabled, and read-only props.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/form-checkbox.tsx"
  - "libs/ui/src/tokens/components/atoms/_checkbox.css"
  - "libs/ui/stories/molecules/form-checkbox.stories.tsx"
  - "libs/ui/src/molecules/figma/form-checkbox.figma.tsx"
  - "https://zagjs.com/components/react/checkbox"
---

# @techsio/ui-kit FormCheckbox Usage

Use FormCheckbox for checkbox fields with label/help/error structure. Use the
Checkbox atom only for bare table/list controls.

## Setup

```tsx
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox"

<FormCheckbox
  name="newsletter"
  label="Send me updates"
  helpText="You can unsubscribe anytime."
/>
```

Supported props:

```text
checked/defaultChecked, indeterminate, onCheckedChange
validateStatus: default | error | success | warning
label or children, helpText, showHelpTextIcon, size sm | md | lg
name, value, required, disabled, readOnly
```

## Core Patterns

### Use this for labeled checkbox UX

It wires root, hidden input, control, indicator, label, and StatusText.

### Use indeterminate for partial selection

For parent selection states, pass `indeterminate` and a controlled `checked`
value.

### Use validateStatus for errors

`validateStatus="error"` maps to Zag invalid state and token styling.

## Common Mistakes

### HIGH Manual checkbox row

Wrong:

```tsx
<label><Checkbox /> Accept terms</label>
```

Correct:

```tsx
<FormCheckbox name="terms" label="Accept terms" required />
```

Source: libs/ui/src/molecules/form-checkbox.tsx

### HIGH Wrong callback

Wrong:

```tsx
<FormCheckbox onChange={(e) => setChecked(e.target.checked)} />
```

Correct:

```tsx
<FormCheckbox onCheckedChange={setChecked} />
```

Source: libs/ui/src/molecules/form-checkbox.tsx

### HIGH Inline error classes

Wrong:

```tsx
<FormCheckbox validateStatus="error" className="text-red-500" />
```

Correct:

```tsx
<FormCheckbox validateStatus="error" helpText="Required" />
```

Source: libs/ui/src/tokens/components/atoms/_checkbox.css

## Validation Commands

```sh
rg -U -n "<label[\\s\\S]{0,240}<Checkbox|<FormCheckbox[^>]*onChange=|<FormCheckbox[^>]*className=.*(text-|border-|bg-)" apps
rg -n "<input[^>]*type=\"checkbox\"" apps
rg -n "<FormCheckbox[^>]*validateStatus=\"(danger|invalid)\"" apps
```
