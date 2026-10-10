---
name: form-input-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit FormInput for
  labeled single-line fields with Label, Input, StatusText, validation status,
  help text, required, disabled, and size props.
metadata:
  component_version: "1.1.1"
  type: "core"
  library: "@techsio/ui-kit"
  library_version: "0.3.2"
requires:
  - component-usage-ux
  - input-usage
  - app-token-overrides
  - ux-guidelines
sources:
  - "libs/ui/src/molecules/form-input.tsx"
  - "libs/ui/src/atoms/input.tsx"
  - "libs/ui/stories/molecules/form-input.stories.tsx"
  - "libs/ui/src/molecules/form-input.figma.ts"
---

# @techsio/ui-kit FormInput Usage

Use FormInput for labeled text-like inputs. Prefer this over manually composing
Label, Input, and StatusText in apps.

## UX/UI guidelines

House rules come from the `ux-guidelines` skill (writing, formatting, states,
where actions and feedback live). This section applies them to `FormInput`.

**Use it when**

- Every labelled single-line text field in app forms: name, email, SKU, URL, search inside a form.

**Use something else when**

| Need | Use instead |
| --- | --- |
| Multi-line text | FormTextarea |
| Numbers, prices, quantities | FormNumericInput |
| Phone numbers | PhoneInput |
| Dates | DatePicker |
| Choosing from options | Select / Combobox / RadioGroup |
| Global/site search | SearchForm |

**Do**

- Label = noun, no colon (`Email`); placeholder only as an example (`e.g. TS-0042`).
- Use `helpText` for format rules and consequences; it stays visible.
- Validate on blur/submit; show the error through `validateStatus="error"` with a message saying how to fix it.
- Set the right `type`, `autoComplete` and `inputMode` so browsers and mobile keyboards help.
- Size the field to the expected value length within the form grid.

**Don't**

- Use the placeholder as the label.
- Disable fields to show read-only data — render text or use read-only (ux-guidelines/states#read-only-vs-disabled).
- Block paste or password managers.

**Copy and states**

- Error messages: what's wrong + how to fix (`Enter an email like name@example.com.`), never `Invalid input`.
- Mark required fields with the component's `required`, not a typed asterisk.

## Setup

```tsx
import { FormInput } from "@techsio/ui-kit/molecules/form-input"

<FormInput
  id="email"
  name="email"
  type="email"
  label="Email"
  validateStatus="default"
/>
```

Supported props:

```text
id: required
label: ReactNode
validateStatus: default | error | success | warning
helpText, showHelpTextIcon
all Input props except where FormInput sets label/status behavior
```

## Core Patterns

### Use for complete field rows

If the field needs label, help, or validation text, start with FormInput.

### Use validateStatus instead of Input variant

FormInput maps `validateStatus` to the underlying Input `variant` and
StatusText status.

### Keep field spacing token-owned

Do not add local `gap`, `mt`, or error text classes around FormInput.

## Common Mistakes

### HIGH Manual field composition

Wrong:

```tsx
<Label htmlFor="email">Email</Label><Input id="email" /><StatusText>Email required</StatusText>
```

Correct:

```tsx
<FormInput id="email" label="Email" helpText="Email required" validateStatus="error" />
```

Source: libs/ui/src/molecules/form-input.tsx

### HIGH Wrong validation prop

Wrong:

```tsx
<FormInput id="email" label="Email" variant="error" />
```

Correct:

```tsx
<FormInput id="email" label="Email" validateStatus="error" />
```

Source: libs/ui/src/molecules/form-input.tsx

### HIGH Inline spacing/styling

Wrong:

```tsx
<FormInput className="mb-4 border-red-500" id="email" label="Email" />
```

Correct:

```tsx
<FormInput id="email" label="Email" validateStatus="error" />
```

Source: libs/ui/src/molecules/form-input.tsx

## Validation Commands

```sh
rg -U -n "<Label[\\s\\S]{0,240}<Input|<FormInput[^>]*variant=|<FormInput[^>]*className=.*(mb-|mt-|gap-|border-|text-)" apps
rg -P -n "<FormInput(?![^>]*id=)|<FormInput(?![^>]*label=)" apps
rg -n "<FormInput[^>]*validateStatus=\"(danger|invalid)\"" apps
```
