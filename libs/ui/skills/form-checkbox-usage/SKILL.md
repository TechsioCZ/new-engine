---
name: form-checkbox-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit FormCheckbox
  for labeled checkbox fields with Zag.js checked/indeterminate state, help
  text, validation status, required, disabled, and read-only props.
metadata:
  component_version: "1.3.1"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/molecules/form-checkbox.tsx"
  - "libs/ui/src/tokens/components/atoms/_checkbox.css"
  - "libs/ui/stories/molecules/form-checkbox.stories.tsx"
  - "libs/ui/src/molecules/form-checkbox.figma.ts"
  - "https://zagjs.com/components/react/checkbox"
---

# @techsio/ui-kit FormCheckbox Usage

Use FormCheckbox for checkbox fields with label/help/error structure. Use the
Checkbox atom only for bare table/list controls.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `FormCheckbox`.

**Use it when**

- Opt-ins, agreements and independent yes/no choices inside a form that is saved with a submit button.
- Several independent options from a short list (`Email`, `SMS`).

**Use something else when**

| Need | Use instead |
| --- | --- |
| A setting that applies immediately | Switch |
| Exactly one of several options | RadioGroup |
| Bare row selection in a table | Checkbox |

**Do**

- Write the label as a positive statement of what checking does (`Send me order updates by email`).
- Put consequences or legal detail in `helpText`, links inline in the label when required (terms).
- Show required agreement errors on the checkbox itself (`Accept the terms to continue.`).

**Don't**

- Pre-check marketing consent.
- Use negative labels (`Don't send me emails`).
- Use a checkbox that saves on change without a submit — that's a Switch.

**Copy and states**

- Sentence case, no trailing period for single-line labels; full sentences in help text end with a period.

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

### Controlled proposals, reset and rich labels

A rejected `onCheckedChange` proposal leaves native checked/mixed properties,
validation and FormData consistent with the accepted value, even without a
parent rerender. Reset restores the initial uncontrolled default after the
native reset action; canceled resets leave state unchanged. Controlled parents
retain ownership; reset never proposes a value change.

The label text slot fills the remaining row width and can wrap safely. Rich
labels may use a flexible text column and an end-aligned, nonshrinking count
without depending on the label's intrinsic text width.


### Feedback, sizes and read-only values

`size="sm" | "md" | "lg"` scales the visible box as well as its label and feedback.
Indeterminate selection uses a horizontal dash, including in disabled states.
`readOnly` preserves focus and form submission, blocks pointer and Space changes,
and uses a full-contrast neutral surface; `disabled` takes priority.
`aria-describedby` merges caller IDs with the helper ID. Error feedback also sets
`aria-invalid` and `aria-errormessage` on the native input. Validation icons are
always present; `showHelpTextIcon` only controls optional neutral-help icons.


### Border width tokens

The visible control uses `--border-width-checkbox`, including checked,
indeterminate, and disabled states. `validateStatus="error"` retains
`--border-width-validation` precedence. The token inherits from the wrapper;
`className` still belongs to that wrapper, not to the visible control.

### Use this for labeled checkbox UX

It wires root, hidden input, control, indicator, label, and StatusText.
When `id` is provided, the native hidden input uses it, so form error summary
links can target the checkbox.

### Use indeterminate for partial selection

For parent selection states, pass `indeterminate` and a controlled `checked`
value.

### Use validateStatus for errors

`validateStatus="error"` maps to Zag invalid state and token styling.

## Native input ref and cancellation-safe forms

`ref?: Ref<HTMLInputElement>` targets the focusable native checkbox, not the
visual square or label. Use `inputProps` for native focus/blur/key/change
observers, external `form`, and input ARIA. `inputProps` does not accept the
component-owned `type`, `checked`, `defaultChecked`, `disabled`, `readOnly`,
`required`, `name`, `value` or `id`; pass those through the top-level API.
Caller descriptions merge with help text. Consumer handlers run before machine
handlers and can cancel a cancellable action with `preventDefault()`.

```tsx
import { useRef, useState } from "react"
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox"

function Terms() {
  const input = useRef<HTMLInputElement>(null)
  const [accepted, setAccepted] = useState(false)
  return <FormCheckbox ref={input} name="terms" label="Accept terms"
    checked={accepted} onCheckedChange={setAccepted}
    inputProps={{ form: "checkout", onFocus: () => { /* app observation */ } }} />
}
```

Native reset follows the current input form owner, including external-form ID
changes/reassociation. A canceled reset (native or React `onReset`) changes
nothing; an accepted uncontrolled reset restores the initial default after
cancellation/default-action handling settles. The parent still owns controlled
`checked` and `indeterminate`; proposals rejected by the parent are restored,
not persisted as DOM-only state. Reset must not simulate a click or steal focus. App-owned controlled reset is
an explicit state update from the form's `onReset`, not an assumption that
`form.reset()` will change React state.
Nested disabled fieldsets and first-legend exceptions use native semantics;
read-only stays focusable and submitted. Ref callbacks support React 19 cleanup.

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

## State consistency

`indeterminate` synchronizes both the native input property and `aria-checked="mixed"` on mount and subsequent renders, including disabled inputs. The visible dash and assistive-technology state always describe the same value.

## Validation Commands

```sh
rg -U -n "<label[\\s\\S]{0,240}<Checkbox|<FormCheckbox[^>]*onChange=|<FormCheckbox[^>]*className=.*(text-|border-|bg-)" apps
rg -n "<input[^>]*type=\"checkbox\"" apps
rg -n "<FormCheckbox[^>]*validateStatus=\"(danger|invalid)\"" apps
```

## Silent native form reset

Native reset calls no value-change callbacks and dispatches no native `input`
or `change` events, in controlled or uncontrolled usage. Uncontrolled controls
silently restore their default; controlled controls
keep the latest parent value and re-sync visible/accessibility/native submission
state to it. Handle the form's `onReset` to intentionally change parent state.
Canceled resets leave every channel unchanged. Reset does not synthesize events
or move focus; the first real user edit afterward emits exactly one normal
callback, including when the same value was entered before reset.
