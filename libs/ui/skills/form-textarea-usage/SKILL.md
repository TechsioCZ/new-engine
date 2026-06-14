---
name: form-textarea-usage
description: >
  Use after component-usage-ux when an app needs @techsio/ui-kit FormTextarea
  for labeled multi-line text fields with Textarea, Label, StatusText,
  validation status, help text, size, resize, required, and disabled props.
type: core
library: "@techsio/ui-kit"
library_version: "0.3.2"
requires:
  - component-usage-ux
  - textarea-usage
  - app-token-overrides
sources:
  - "libs/ui/src/molecules/form-textarea.tsx"
  - "libs/ui/src/atoms/textarea.tsx"
  - "libs/ui/stories/molecules/form-textarea.stories.tsx"
  - "libs/ui/src/molecules/figma/form-textarea.figma.tsx"
---

# @techsio/ui-kit FormTextarea Usage

Use FormTextarea for labeled long text fields such as notes, comments, and
descriptions.

## Setup

```tsx
import { FormTextarea } from "@techsio/ui-kit/molecules/form-textarea"

<FormTextarea
  id="description"
  label="Description"
  resize="y"
  validateStatus="default"
/>
```

Supported props:

```text
id: required
label: ReactNode
validateStatus: default | error | success | warning
helpText, showHelpTextIcon
Textarea props: size, resize, readonly, required, disabled
```

## Core Patterns

### Use for complete textarea fields

Prefer FormTextarea over manual Label + Textarea + StatusText composition.

### Use validateStatus for field state

FormTextarea maps validation to Textarea variant and StatusText.

### Use Textarea resize API

Choose `resize="y" | "none" | "auto"` from layout needs, not custom classes.

## Common Mistakes

### HIGH Manual textarea field

Wrong:

```tsx
<Label htmlFor="note">Note</Label><Textarea id="note" /><p className="text-red-500">Required</p>
```

Correct:

```tsx
<FormTextarea id="note" label="Note" helpText="Required" validateStatus="error" />
```

Source: libs/ui/src/molecules/form-textarea.tsx

### HIGH Wrong validation prop

Wrong:

```tsx
<FormTextarea id="note" label="Note" variant="error" />
```

Correct:

```tsx
<FormTextarea id="note" label="Note" validateStatus="error" />
```

Source: libs/ui/src/molecules/form-textarea.tsx

### HIGH Inline textarea styling

Wrong:

```tsx
<FormTextarea id="note" label="Note" className="border-red-500 p-4" />
```

Correct:

```tsx
<FormTextarea id="note" label="Note" validateStatus="error" />
```

Source: libs/ui/src/tokens/components/atoms/_textarea.css

## Validation Commands

```sh
rg -U -n "<Label[\\s\\S]{0,240}<Textarea|<textarea\\b|<FormTextarea[^>]*variant=" apps
rg -P -n "<FormTextarea(?![^>]*id=)|<FormTextarea(?![^>]*label=)" apps
rg -n "<FormTextarea[^>]*className=.*(border-|bg-|text-|p-|px-|py-)" apps
```
